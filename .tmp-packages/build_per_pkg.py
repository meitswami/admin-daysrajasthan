"""Build per-package revision SQL + bulk metadata for remaining packages."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
pkgs = json.loads((ROOT / "parsed_packages.json").read_text(encoding="utf-8"))

# Already present in DB (from prior partial import)
already = {
    "DR001", "DR002", "DR003", "DR004", "DR005", "DR006", "DR007", "DR008",
    "DR009", "DR010", "DR011", "DR012", "DR013", "DR014", "DR015", "DR016",
    "DR017", "DR018", "DR074", "DR075",
}
# Present but missing revision link
need_revision_only = {"DR014", "DR015", "DR016", "DR017", "DR018"}

import importlib.util

spec = importlib.util.spec_from_file_location("parse_and_build", ROOT / "parse_and_build.py")
mod = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(mod)
sql_str = mod.sql_str
sql_json = mod.sql_json

out = ROOT / "per_pkg"
out.mkdir(exist_ok=True)

# Bulk metadata for packages not yet inserted
new_pkgs = [p for p in pkgs if p["tour_code"] not in already]
meta_parts = []
if new_pkgs:
    itin_vals = []
    ci_vals = []
    for p in new_pkgs:
        itin_vals.append(
            f"({sql_str(p['id'])}, {sql_str(p['title'])}, {sql_str(p['destination'])}, "
            f"{sql_str(p['slug'])}, NULL, NULL, {sql_str(p['package_type'])}, "
            f"{sql_str(p['duration_label'])}, true, false, 'grid', 'active', 0, now(), now())"
        )
        price = p.get("price_per_person") or 0
        ci_vals.append(
            f"({sql_str(p['client_itinerary_id'])}, {sql_str(p['quote_id'])}, "
            f"'website_package'::itinerary_record_type, {sql_str(p['title'])}, "
            f"{sql_str(p['tour_code'])}, 'draft'::workflow_status, NULL, 1, "
            f"'Website Package', NULL, NULL, NULL, 2, 0, 1, {price}, 'INR', 0, "
            f"'[]'::jsonb, 'unpaid'::payment_status, 0, NULL, {sql_str(p['id'])}, now(), now())"
        )
    # chunk 20
    for i in range(0, len(itin_vals), 20):
        chunk = itin_vals[i : i + 20]
        meta_parts.append(
            "INSERT INTO itineraries (id, package_name, destination, slug, pdf_url, cover_image_url, "
            "package_type, package_duration, show_on_website, is_trending, display_mode, status, "
            "download_count, created_at, updated_at) VALUES\n"
            + ",\n".join(chunk)
            + "\nON CONFLICT (id) DO NOTHING;"
        )
    for i in range(0, len(ci_vals), 20):
        chunk = ci_vals[i : i + 20]
        meta_parts.append(
            "INSERT INTO client_itineraries (id, quote_id, type, title, tour_code, workflow_status, "
            "current_revision_id, current_version, client_name, client_email, client_phone, travel_date, "
            "adults, children, rooms, grand_total, currency, margin_pct, category_totals, payment_status, "
            "amount_paid, deleted_at, source_package_id, created_at, updated_at) VALUES\n"
            + ",\n".join(chunk)
            + "\nON CONFLICT (id) DO NOTHING;"
        )

(out / "00_meta.sql").write_text("\n\n".join(meta_parts), encoding="utf-8")
print("meta packages", len(new_pkgs), "bytes", (out / "00_meta.sql").stat().st_size)

# Per-package revision inserts for: need_revision_only + all new
rev_targets = [p for p in pkgs if p["tour_code"] in need_revision_only or p["tour_code"] not in already]
manifest = []
for p in rev_targets:
    sql = (
        "INSERT INTO itinerary_revisions (id, itinerary_id, version_number, parent_revision_id, "
        "milestone_label, change_summary, save_type, snapshot, snapshot_checksum, created_at) VALUES ("
        f"{sql_str(p['revision_id'])}, {sql_str(p['client_itinerary_id'])}, 1, NULL, "
        f"{sql_str('Imported package content')}, {sql_str('Imported from ' + p['source_file'])}, "
        f"'manual'::revision_save_type, {sql_json(p['snapshot'])}, NULL, now()) "
        "ON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot;\n\n"
        f"UPDATE client_itineraries SET current_revision_id = {sql_str(p['revision_id'])}::uuid, "
        f"updated_at = now() WHERE id = {sql_str(p['client_itinerary_id'])};"
    )
    fname = f"{p['tour_code']}.sql"
    (out / fname).write_text(sql, encoding="utf-8")
    manifest.append(
        {
            "code": p["tour_code"],
            "file": fname,
            "bytes": len(sql.encode("utf-8")),
            "days": len(p["days"]),
            "title": p["title"],
        }
    )

(out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print("revision files", len(manifest))
print("largest", max(manifest, key=lambda x: x["bytes"]))
print("total remaining", len(manifest))
