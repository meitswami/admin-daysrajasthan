const fs = require("fs");
const q = JSON.parse(
  fs.readFileSync(
    "c:/Users/Meit Swami/Documents/GitHub/admin-daysrajasthan/.tmp-packages/sql_batches/_mcp_queries/03_rows/016.json",
    "utf8"
  )
).query;
const start = q.indexOf("'{\"header\"");
const end = q.lastIndexOf("}'::jsonb");
const jsonStr = q.slice(start + 1, end + 1);
try {
  JSON.parse(jsonStr);
  console.log("JSON OK", jsonStr.length);
} catch (e) {
  console.log("JSON BAD", e.message);
  const m = e.message.match(/position (\d+)/);
  if (m) {
    const i = Number(m[1]);
    console.log(jsonStr.slice(Math.max(0, i - 80), i + 80));
  }
}
const idx = jsonStr.indexOf("public_notes");
console.log(jsonStr.slice(idx, idx + 220));
console.log("query len", q.length);
