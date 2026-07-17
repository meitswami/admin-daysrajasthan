/**
 * Build multi-row INSERT statements: one file per package covering all chunks.
 * Each package becomes 1 upload SQL (~20-45KB) + 1 run SQL (~400B).
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

const CHUNK = 3000;
const uploads = [];

for (const m of remaining) {
  const sql = fs.readFileSync(path.join(dir, m.file), 'utf8');
  const b64 = Buffer.from(sql, 'utf8').toString('base64');
  const batchKey = `pkg_${m.code}`;
  const values = [];
  for (let i = 0, ord = 1; i < b64.length; i += CHUNK, ord++) {
    values.push(`('${batchKey}', 1, ${ord}, '${b64.slice(i, i + CHUNK)}')`);
  }
  const uploadSql =
    `DELETE FROM _sql_import_chunks WHERE batch_key = '${batchKey}';\n` +
    `INSERT INTO _sql_import_chunks (batch_key, stmt_idx, chunk_ord, chunk_b64) VALUES\n` +
    values.join(',\n') +
    `;`;
  const runSql =
    `DO $do$\nDECLARE q text;\nBEGIN\n` +
    `  SELECT convert_from(decode(string_agg(chunk_b64, '' ORDER BY chunk_ord), 'base64'), 'UTF8') INTO q\n` +
    `  FROM _sql_import_chunks WHERE batch_key = '${batchKey}' AND stmt_idx = 1;\n` +
    `  IF q IS NULL OR length(q) < 10 THEN RAISE EXCEPTION 'empty sql for %', '${batchKey}'; END IF;\n` +
    `  EXECUTE q;\n` +
    `  DELETE FROM _sql_import_chunks WHERE batch_key = '${batchKey}';\n` +
    `END $do$;`;

  fs.writeFileSync(path.join(outDir, `${m.code}_upload.sql`), uploadSql);
  fs.writeFileSync(path.join(outDir, `${m.code}_run.sql`), runSql);
  fs.writeFileSync(path.join(outDir, `${m.code}_upload.json`), JSON.stringify({ query: uploadSql }));
  fs.writeFileSync(path.join(outDir, `${m.code}_run.json`), JSON.stringify({ query: runSql }));
  uploads.push({ code: m.code, uploadBytes: Buffer.byteLength(uploadSql), chunks: values.length });
}

fs.writeFileSync(path.join(outDir, 'upload_plan.json'), JSON.stringify({ uploads }, null, 2));
console.log(JSON.stringify({
  packages: uploads.length,
  maxUpload: Math.max(...uploads.map((u) => u.uploadBytes)),
  minUpload: Math.min(...uploads.map((u) => u.uploadBytes)),
  sample: uploads.slice(0, 3),
}, null, 2));
