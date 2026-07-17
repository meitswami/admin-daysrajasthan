const fs = require("fs");
const path = require("path");
const dir = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const out = path.join(dir, "_args");
fs.mkdirSync(out, { recursive: true });
const sizes = [];
for (const entry of manifest) {
  const sql = fs.readFileSync(path.join(dir, entry.file), "utf8");
  const args = JSON.stringify({ query: sql });
  fs.writeFileSync(path.join(out, entry.code + ".json"), args);
  sizes.push({ code: entry.code, sqlLen: sql.length, argsLen: args.length, days: entry.days });
}
fs.writeFileSync(path.join(out, "sizes.json"), JSON.stringify(sizes, null, 2));
console.log("prepared", sizes.length);
console.log("max sql", Math.max(...sizes.map((s) => s.sqlLen)));
console.log("over15k", sizes.filter((s) => s.sqlLen > 15000).map((s) => s.code + ":" + s.sqlLen).join(", "));
