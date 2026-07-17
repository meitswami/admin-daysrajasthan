/**
 * Build compact single-line SQL payloads for MCP execute_sql.
 * Also writes a progress checklist of remaining codes.
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const linkedDone = new Set([
  'DR014','DR015','DR016','DR017','DR018','DR019','DR020',
  // already linked before this session:
  'DR001','DR002','DR003','DR004','DR005','DR006','DR007','DR008','DR009','DR010','DR011','DR012','DR013','DR074','DR075'
]);

const remaining = manifest.filter((m) => !linkedDone.has(m.code));
fs.writeFileSync(path.join(dir, '_remaining.json'), JSON.stringify(remaining, null, 2));
console.log('remaining', remaining.length);
console.log(remaining.map((m) => `${m.code}:${m.bytes}`).join('\n'));

// Prepare next 5 as raw sql files with normalized newlines for MCP
const next = remaining.slice(0, 5);
for (const m of next) {
  const sql = fs.readFileSync(path.join(dir, m.file), 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(path.join(dir, '_args', m.code + '.json'), JSON.stringify({ query: sql }));
  console.log('prep', m.code, sql.length);
}
