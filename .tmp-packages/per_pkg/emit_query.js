const fs = require('fs');
const path = require('path');

const dir = __dirname;
const argsDir = path.join(dir, '_args');
const codes = process.argv.slice(2);
if (!codes.length) {
  console.error('usage: node emit_query.js DR021 [DR022 ...]');
  process.exit(1);
}

for (const code of codes) {
  const sqlPath = path.join(dir, code + '.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const out = path.join(argsDir, code + '.json');
  fs.writeFileSync(out, JSON.stringify({ query: sql }));
  // Also write a .query.txt for easier inspection
  fs.writeFileSync(path.join(argsDir, code + '.query.txt'), sql);
  console.log(JSON.stringify({ code, bytes: Buffer.byteLength(sql), out }));
}
