const fs = require('fs');
const path = require('path');
const dir = __dirname;
const codes = ['DR016','DR017','DR019','DR020'];
for (const code of codes) {
  const sql = fs.readFileSync(path.join(dir, code + '.sql'), 'utf8');
  const out = path.join(dir, '_args', code + '.json');
  fs.writeFileSync(out, JSON.stringify({ query: sql }));
  console.log(code, sql.length, 'written', out);
}
