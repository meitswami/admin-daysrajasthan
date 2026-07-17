const fs = require("fs");
const dir =
  "c:/Users/Meit Swami/Documents/GitHub/admin-daysrajasthan/.tmp-packages/sql_batches";

function prep(n) {
  const q = JSON.parse(
    fs.readFileSync(
      dir + "/_mcp_queries/02_rows/" + String(n).padStart(3, "0") + ".json",
      "utf8"
    )
  ).query;
  const b64 = Buffer.from(q, "utf8").toString("base64");
  const chunkSize = 2500;
  const chunks = [];
  for (let i = 0; i < b64.length; i += chunkSize) {
    chunks.push(b64.slice(i, i + chunkSize));
  }
  const batchKey = "b02_r" + n;
  const values = chunks
    .map(
      (c, i) =>
        "('" + batchKey + "', 0, " + i + ", '" + c + "')"
    )
    .join(",\n");
  const upload =
    "DELETE FROM _sql_import_chunks WHERE batch_key = '" +
    batchKey +
    "';\nINSERT INTO _sql_import_chunks (batch_key, stmt_idx, chunk_ord, chunk_b64) VALUES\n" +
    values +
    ";";
  const exec =
    "DO $$ DECLARE s text; BEGIN SELECT convert_from(decode(string_agg(chunk_b64, '' ORDER BY chunk_ord), 'base64'), 'UTF8') INTO s FROM _sql_import_chunks WHERE batch_key = '" +
    batchKey +
    "'; EXECUTE s; DELETE FROM _sql_import_chunks WHERE batch_key = '" +
    batchKey +
    "'; END $$;";
  const outDir = dir + "/_mcp_queries/02_stage_" + n;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outDir + "/upload.json", JSON.stringify({ query: upload }));
  fs.writeFileSync(outDir + "/exec.json", JSON.stringify({ query: exec }));
  console.log(
    n,
    "chunks",
    chunks.length,
    "upload",
    upload.length,
    "exec",
    exec.length
  );
}

prep(17);
prep(18);
