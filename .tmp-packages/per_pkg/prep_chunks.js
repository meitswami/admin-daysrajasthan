/**
 * Prepare chunked uploads for remaining packages into _sql_import_chunks,
 * then a single run statement per package.
 * Chunk size kept small so each MCP execute_sql call stays under ~4KB.
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const outDir = path.join(dir, '_chunk_runs');
fs.mkdirSync(outDir, { recursive: true });

const progress = JSON.parse(fs.readFileSync(path.join(dir, '_progress.json'), 'utf8'));
const done = new Set(progress.done);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const remaining = manifest.filter((m) => !done.has(m.code));

const CHUNK = 2400; // chars of base64 per insert
const plan = [];

for (const m of remaining) {
  const sql = fs.readFileSync(path.join(dir, m.file), 'utf8');
  const b64 = Buffer.from(sql, 'utf8').toString('base64');
  const batchKey = `pkg_${m.code}`;
  const chunks = [];
  for (let i = 0, ord = 1; i < b64.length; i += CHUNK, ord++) {
    const part = b64.slice(i, i + CHUNK);
    const insertSql =
      `INSERT INTO _sql_import_chunks (batch_key, stmt_idx, chunk_ord, chunk_b64) VALUES ('${batchKey}', 1, ${ord}, '${part}') ` +
      `ON CONFLICT (batch_key, stmt_idx, chunk_ord) DO UPDATE SET chunk_b64 = EXCLUDED.chunk_b64;`;
    const fname = `${m.code}_c${String(ord).padStart(2, '0')}.sql`;
    fs.writeFileSync(path.join(outDir, fname), insertSql);
    chunks.push({ file: fname, bytes: Buffer.byteLength(insertSql), ord });
  }
  const runSql =
    `DO $do$\nDECLARE q text;\nBEGIN\n` +
    `  SELECT convert_from(decode(string_agg(chunk_b64, '' ORDER BY chunk_ord), 'base64'), 'UTF8') INTO q\n` +
    `  FROM _sql_import_chunks WHERE batch_key = '${batchKey}' AND stmt_idx = 1;\n` +
    `  EXECUTE q;\n` +
    `  DELETE FROM _sql_import_chunks WHERE batch_key = '${batchKey}';\n` +
    `END $do$;`;
  fs.writeFileSync(path.join(outDir, `${m.code}_run.sql`), runSql);
  plan.push({ code: m.code, chunks: chunks.length, batchKey });
}

fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify({ plan, totalPackages: plan.length }, null, 2));
console.log(JSON.stringify({ packages: plan.length, totalChunks: plan.reduce((a, p) => a + p.chunks, 0), first: plan.slice(0, 3) }, null, 2));
