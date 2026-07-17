const fs = require("fs");
const path = require("path");

const dir = path.join(
  "c:/Users/Meit Swami/Documents/GitHub/admin-daysrajasthan/.tmp-packages/sql_batches"
);
const batch = process.argv[2];
const rowsDir = path.join(dir, "_mcp_queries", `${batch}_rows`);
const plan = JSON.parse(fs.readFileSync(path.join(rowsDir, "plan.json"), "utf8"));
const onConflict =
  "\nON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, change_summary = EXCLUDED.change_summary;";

const toRun = [];
for (const step of plan.plan) {
  const f = path.join(rowsDir, step.file);
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  let q = j.query.trim();
  // skip broken ON CONFLICT fragments
  if (/VALUES\s*\(\s*id\s*\)/i.test(q)) continue;
  if (/VALUES\s*\(\s*package_name\s*\)/i.test(q)) continue;
  if (q.includes("INSERT INTO itinerary_revisions") && !q.includes("ON CONFLICT")) {
    if (q.endsWith(";")) q = q.slice(0, -1);
    q = q + onConflict;
    fs.writeFileSync(f, JSON.stringify({ query: q }));
  }
  // also fix other inserts that may need ON CONFLICT from original
  if (q.includes("INSERT INTO itineraries") && !q.includes("ON CONFLICT")) {
    if (q.endsWith(";")) q = q.slice(0, -1);
    q =
      q +
      "\nON CONFLICT (id) DO UPDATE SET package_name = EXCLUDED.package_name, destination = EXCLUDED.destination, slug = EXCLUDED.slug, package_type = EXCLUDED.package_type, package_duration = EXCLUDED.package_duration, status = EXCLUDED.status, updated_at = now();";
    fs.writeFileSync(f, JSON.stringify({ query: q }));
  }
  if (q.includes("INSERT INTO client_itineraries") && !q.includes("ON CONFLICT")) {
    if (q.endsWith(";")) q = q.slice(0, -1);
    q =
      q +
      "\nON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, tour_code = EXCLUDED.tour_code, grand_total = EXCLUDED.grand_total, source_package_id = EXCLUDED.source_package_id, updated_at = now();";
    fs.writeFileSync(f, JSON.stringify({ query: q }));
  }
  toRun.push({ step: step.step, file: step.file, len: q.length });
}

fs.writeFileSync(path.join(rowsDir, "to_run.json"), JSON.stringify(toRun, null, 2));
console.log(JSON.stringify({ batch, count: toRun.length, maxLen: Math.max(...toRun.map((x) => x.len)) }, null, 2));
