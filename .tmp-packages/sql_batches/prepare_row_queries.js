/**
 * Automate CallMcpTool-equivalent SQL execution by reading query JSON files
 * and printing a compact status. The agent must still CallMcpTool — this
 * helper prepares per-row revision inserts that fit in single MCP calls.
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

/** Split a multi-row INSERT ... VALUES (...),(...); into one INSERT per row. */
function splitInsertRows(stmt) {
  const m = stmt.match(/^(INSERT\s+INTO\s+[^\(]+\([^)]+\)\s+VALUES)\s*/i);
  if (!m) return [stmt];
  const prefix = m[1];
  const valuesPart = stmt.slice(m[0].length);
  const rows = [];
  let depth = 0;
  let inS = false;
  let inD = false;
  let start = -1;
  for (let i = 0; i < valuesPart.length; i++) {
    const c = valuesPart[i];
    const n = valuesPart[i + 1];
    if (inS) {
      if (c === "'" && n === "'") {
        i++;
        continue;
      }
      if (c === "'") inS = false;
      continue;
    }
    if (inD) {
      if (c === '"') inD = false;
      continue;
    }
    if (c === "'") {
      inS = true;
      continue;
    }
    if (c === '"') {
      inD = true;
      continue;
    }
    if (c === "(") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (c === ")") {
      depth--;
      if (depth === 0 && start >= 0) {
        rows.push(valuesPart.slice(start, i + 1));
        start = -1;
      }
    }
  }
  if (rows.length <= 1) return [stmt];
  return rows.map((r) => `${prefix}\n${r}`);
}

const batch = process.argv[2];
const sql = fs.readFileSync(path.join(dir, `${batch}_batch.sql`), "utf8");
const stmts = splitSql(sql);
const outDir = path.join(dir, `_mcp_queries`, `${batch}_rows`);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let step = 0;
const plan = [];
for (let si = 0; si < stmts.length; si++) {
  const pieces = splitInsertRows(stmts[si]);
  for (const p of pieces) {
    step++;
    const name = `${String(step).padStart(3, "0")}.json`;
    fs.writeFileSync(path.join(outDir, name), JSON.stringify({ query: p + ";" }));
    plan.push({ step, len: p.length, file: name });
  }
}
fs.writeFileSync(path.join(outDir, "plan.json"), JSON.stringify({ batch, plan }, null, 2));
console.log(
  JSON.stringify(
    {
      batch,
      steps: plan.length,
      maxLen: Math.max(...plan.map((p) => p.len)),
      over12k: plan.filter((p) => p.len > 12000).length,
    },
    null,
    2
  )
);
