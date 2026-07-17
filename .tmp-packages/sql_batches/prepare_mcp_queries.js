/**
 * Execute one SQL batch file via a provided execute callback interface.
 * This script prepares MCP-ready query strings as JSON files under _mcp_queries/<batch>/
 * so the agent can CallMcpTool with each file's contents.
 *
 * For large statements, it writes chunk-upload + execute SQL wrappers.
 */
const fs = require("fs");
const path = require("path");

const dir = __dirname;

function splitSql(sql) {
  const stmts = [];
  let cur = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const n = sql[i + 1];

    if (inSingle) {
      cur += c;
      if (c === "'" && n === "'") {
        cur += n;
        i++;
        continue;
      }
      if (c === "'") inSingle = false;
      continue;
    }

    if (inDouble) {
      cur += c;
      if (c === '"') inDouble = false;
      continue;
    }

    if (c === "'") {
      inSingle = true;
      cur += c;
      continue;
    }

    if (c === '"') {
      inDouble = true;
      cur += c;
      continue;
    }

    if (c === ";") {
      const t = cur.trim();
      if (t) stmts.push(t);
      cur = "";
      continue;
    }

    cur += c;
  }

  const t = cur.trim();
  if (t) stmts.push(t);
  return stmts;
}

function escSqlLiteral(s) {
  return s.replace(/'/g, "''");
}

const DIRECT_MAX = 14000;
const B64_CHUNK = 6000;

const batchNum = process.argv[2];
const sql = fs.readFileSync(path.join(dir, `${batchNum}_batch.sql`), "utf8");
const stmts = splitSql(sql);
const outDir = path.join(dir, `_mcp_queries`, batchNum);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const plan = [];
let step = 0;

function writeQuery(label, query) {
  step++;
  const name = `${String(step).padStart(3, "0")}_${label}.json`;
  const p = path.join(outDir, name);
  fs.writeFileSync(p, JSON.stringify({ query }), "utf8");
  plan.push({ step, label, file: name, queryLen: query.length });
}

// Ensure staging table exists (once per batch start)
writeQuery(
  "ensure_staging",
  `CREATE TABLE IF NOT EXISTS _sql_import_chunks (
  batch_key text NOT NULL,
  stmt_idx int NOT NULL,
  chunk_ord int NOT NULL,
  chunk_b64 text NOT NULL,
  PRIMARY KEY (batch_key, stmt_idx, chunk_ord)
);`
);

const batchKey = `batch_${batchNum}_${Date.now()}`;
writeQuery(
  "clear_staging",
  `DELETE FROM _sql_import_chunks WHERE batch_key LIKE 'batch_${batchNum}_%';`
);

stmts.forEach((stmt, si) => {
  const stmtIdx = si + 1;
  if (stmt.length <= DIRECT_MAX) {
    writeQuery(`stmt${stmtIdx}_direct`, stmt + ";");
    return;
  }

  const b64 = Buffer.from(stmt, "utf8").toString("base64");
  for (let i = 0; i < b64.length; i += B64_CHUNK) {
    const chunk = b64.slice(i, i + B64_CHUNK);
    const ord = Math.floor(i / B64_CHUNK) + 1;
    writeQuery(
      `stmt${stmtIdx}_chunk${ord}`,
      `INSERT INTO _sql_import_chunks (batch_key, stmt_idx, chunk_ord, chunk_b64) VALUES ('${batchKey}', ${stmtIdx}, ${ord}, '${escSqlLiteral(chunk)}');`
    );
  }

  writeQuery(
    `stmt${stmtIdx}_exec`,
    `DO $outer$
DECLARE
  q text;
BEGIN
  SELECT convert_from(decode(string_agg(chunk_b64, '' ORDER BY chunk_ord), 'base64'), 'UTF8')
    INTO q
  FROM _sql_import_chunks
  WHERE batch_key = '${batchKey}' AND stmt_idx = ${stmtIdx};
  EXECUTE q;
END
$outer$;`
  );
});

writeQuery(
  "cleanup_staging",
  `DELETE FROM _sql_import_chunks WHERE batch_key = '${batchKey}';`
);

fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify({ batchNum, batchKey, plan }, null, 2));
console.log(JSON.stringify({ batchNum, steps: plan.length, plan }, null, 2));
