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

const batch = process.argv[2] || "01";
const file = path.join(dir, `${batch}_batch.sql`);
const sql = fs.readFileSync(file, "utf8");
const stmts = splitSql(sql);

const outDir = path.join(dir, `stmts_${batch}`);
fs.mkdirSync(outDir, { recursive: true });

stmts.forEach((s, i) => {
  const p = path.join(outDir, `${String(i + 1).padStart(2, "0")}.sql`);
  fs.writeFileSync(p, s + ";\n", "utf8");
});

console.log(
  JSON.stringify({
    batch,
    count: stmts.length,
    sizes: stmts.map((s) => s.length),
  })
);
