const fs = require("fs");
const d =
  "c:/Users/Meit Swami/Documents/GitHub/admin-daysrajasthan/.tmp-packages/sql_batches/_mcp_queries/02_rows";
const oc =
  "\nON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, change_summary = EXCLUDED.change_summary;";
for (const n of [16, 17, 18, 19]) {
  const f = d + "/" + String(n).padStart(3, "0") + ".json";
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  let q = j.query.trim();
  if (q.endsWith(";")) q = q.slice(0, -1);
  if (!q.includes("ON CONFLICT")) q += oc;
  fs.writeFileSync(f, JSON.stringify({ query: q }));
  console.log(n, q.length, q.includes("ON CONFLICT"));
}
