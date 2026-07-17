const fs = require("fs");
const d =
  "c:/Users/Meit Swami/Documents/GitHub/admin-daysrajasthan/.tmp-packages/sql_batches/_mcp_queries/04_rows";
const toRun = JSON.parse(fs.readFileSync(d + "/to_run.json", "utf8"));

function extractValues(q) {
  const m =
    q.match(/VALUES\s*\n?([\s\S]+?)\nON CONFLICT/i) ||
    q.match(/VALUES\s*([\s\S]+?);?\s*$/i);
  return m ? m[1].trim().replace(/;$/, "") : null;
}

const itins = [];
const clients = [];
for (const s of toRun) {
  const q = JSON.parse(fs.readFileSync(d + "/" + s.file, "utf8")).query;
  if (/VALUES\s*\(\s*\)/.test(q)) continue;
  if (q.includes("INSERT INTO itineraries")) itins.push(extractValues(q));
  if (q.includes("INSERT INTO client_itineraries")) clients.push(extractValues(q));
}

const itinSQL =
  "INSERT INTO itineraries (id, package_name, destination, slug, pdf_url, cover_image_url, package_type, package_duration, show_on_website, is_trending, display_mode, status, download_count, created_at, updated_at) VALUES\n" +
  itins.join(",\n") +
  "\nON CONFLICT (id) DO UPDATE SET package_name = EXCLUDED.package_name, destination = EXCLUDED.destination, slug = EXCLUDED.slug, package_type = EXCLUDED.package_type, package_duration = EXCLUDED.package_duration, status = EXCLUDED.status, updated_at = now();";

const clientSQL =
  "INSERT INTO client_itineraries (id, quote_id, type, title, tour_code, workflow_status, current_revision_id, current_version, client_name, client_email, client_phone, travel_date, adults, children, rooms, grand_total, currency, margin_pct, category_totals, payment_status, amount_paid, deleted_at, source_package_id, created_at, updated_at) VALUES\n" +
  clients.join(",\n") +
  "\nON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, tour_code = EXCLUDED.tour_code, grand_total = EXCLUDED.grand_total, source_package_id = EXCLUDED.source_package_id, updated_at = now();";

fs.writeFileSync(d + "/combined_itineraries.json", JSON.stringify({ query: itinSQL }));
fs.writeFileSync(d + "/combined_clients.json", JSON.stringify({ query: clientSQL }));
console.log("itins", itins.length, itinSQL.length);
console.log("clients", clients.length, clientSQL.length);
const revs = toRun.filter((s) => {
  const q = JSON.parse(fs.readFileSync(d + "/" + s.file, "utf8")).query;
  return q.includes("INSERT INTO itinerary_revisions");
});
console.log(
  "revs",
  revs.map((r) => r.file + ":" + r.len).join(", ")
);
