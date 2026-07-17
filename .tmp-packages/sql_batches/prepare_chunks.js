const fs = require("fs");
const path = require("path");

const dir = path.join(
  "c:/Users/Meit Swami/Documents/GitHub/admin-daysrajasthan/.tmp-packages/sql_batches"
);

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

const CHUNK = 8000; // base64 chars per MCP call

function chunkBase64(b64) {
  const chunks = [];
  for (let i = 0; i < b64.length; i += CHUNK) {
    chunks.push(b64.slice(i, i + CHUNK));
  }
  return chunks;
}

const batchNum = process.argv[2];
if (!batchNum) {
  console.error("Usage: node prepare_chunks.js <01-16>");
  process.exit(1);
}

const sql = fs.readFileSync(path.join(dir, `${batchNum}_batch.sql`), "utf8");
const stmts = splitSql(sql);
const outDir = path.join(dir, `_chunks_${batchNum}`);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const manifest = { batch: batchNum, statements: [] };

stmts.forEach((stmt, si) => {
  const b64 = Buffer.from(stmt, "utf8").toString("base64");
  const chunks = chunkBase64(b64);
  const stmtDir = path.join(outDir, `s${String(si + 1).padStart(2, "0")}`);
  fs.mkdirSync(stmtDir);
  chunks.forEach((ch, ci) => {
    fs.writeFileSync(path.join(stmtDir, `${String(ci + 1).padStart(3, "0")}.b64`), ch);
  });
  // Also write direct SQL for small statements
  const direct = stmt.length < 12000;
  if (direct) {
    fs.writeFileSync(path.join(stmtDir, "direct.sql"), stmt + ";\n", "utf8");
  }
  manifest.statements.push({
    index: si + 1,
    sqlLen: stmt.length,
    b64Len: b64.length,
    chunks: chunks.length,
    direct,
  });
});

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
