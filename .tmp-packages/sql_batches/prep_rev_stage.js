const fs = require("fs");
const path = require("path");

/**
 * Prepare staging upload+exec for revision rows using correct _sql_import_chunks schema.
 * Usage: node prep_rev_stage.js <batch> <fileNumbers...>
 * Example: node prep_rev_stage.js 03 15 16 17 18 19
 */
const dir = __dirname;
const batch = process.argv[2];
const nums = process.argv.slice(3).map(Number);
const rowsDir = path.join(dir, "_mcp_queries", `${batch}_rows`);
const outRoot = path.join(dir, "_mcp_queries", `${batch}_stage`);

for (const n of nums) {
  const file = String(n).padStart(3, "0") + ".json";
  const q = JSON.parse(fs.readFileSync(path.join(rowsDir, file), "utf8")).query;
  const b64 = Buffer.from(q, "utf8").toString("base64");
  const chunkSize = 2500;
  const chunks = [];
  for (let i = 0; i < b64.length; i += chunkSize) {
    chunks.push(b64.slice(i, i + chunkSize));
  }
  const batchKey = `b${batch}_r${n}`;
  const values = chunks
    .map((c, i) => `('${batchKey}', 0, ${i}, '${c}')`)
    .join(",\n");
  const upload =
    `DELETE FROM _sql_import_chunks WHERE batch_key = '${batchKey}';\n` +
    `INSERT INTO _sql_import_chunks (batch_key, stmt_idx, chunk_ord, chunk_b64) VALUES\n${values};`;
  const exec =
    `DO $$ DECLARE s text; BEGIN SELECT convert_from(decode(string_agg(chunk_b64, '' ORDER BY chunk_ord), 'base64'), 'UTF8') INTO s FROM _sql_import_chunks WHERE batch_key = '${batchKey}'; EXECUTE s; DELETE FROM _sql_import_chunks WHERE batch_key = '${batchKey}'; END $$;`;

  // Also split upload into ~8k pieces if too large
  const outDir = path.join(outRoot, String(n).padStart(3, "0"));
  fs.mkdirSync(outDir, { recursive: true });

  if (upload.length <= 12000) {
    fs.writeFileSync(outDir + "/upload.json", JSON.stringify({ query: upload }));
    fs.writeFileSync(outDir + "/exec.json", JSON.stringify({ query: exec }));
    console.log(batchKey, "chunks", chunks.length, "upload", upload.length);
  } else {
    // multi-part upload: delete + inserts of 2 chunks each
    const stmts = [
      `DELETE FROM _sql_import_chunks WHERE batch_key = '${batchKey}'`,
    ];
    for (let i = 0; i < chunks.length; i++) {
      stmts.push(
        `INSERT INTO _sql_import_chunks (batch_key, stmt_idx, chunk_ord, chunk_b64) VALUES ('${batchKey}', 0, ${i}, '${chunks[i]}')`
      );
    }
    stmts.push(exec);
    stmts.forEach((s, i) =>
      fs.writeFileSync(
        outDir + "/" + String(i).padStart(3, "0") + ".json",
        JSON.stringify({ query: s })
      )
    );
    console.log(batchKey, "multipart", stmts.length, "max", Math.max(...stmts.map((s) => s.length)));
  }
}
