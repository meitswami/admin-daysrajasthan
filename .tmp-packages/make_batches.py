"""Split package inserts into MCP-friendly SQL batches."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# Import helpers from parse script
import importlib.util

spec = importlib.util.spec_from_file_location("parse_and_build", ROOT / "parse_and_build.py")
mod = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(mod)

pkgs = json.loads((ROOT / "parsed_packages.json").read_text(encoding="utf-8"))
sql_str = mod.sql_str
sql_json = mod.sql_json

batches_dir = ROOT / "sql_batches"
batches_dir.mkdir(exist_ok=True)

# 00 cleanup
(batches_dir / "00_cleanup.sql").write_text(
    """
DELETE FROM itinerary_revisions WHERE itinerary_id IN (
  SELECT id FROM client_itineraries WHERE type = 'website_package'
);
DELETE FROM client_itineraries WHERE type = 'website_package';
DELETE FROM itineraries WHERE id IN (
  '11111111-1111-1111-1111-111111111001',
  '11111111-1111-1111-1111-111111111002',
  '11111111-1111-1111-1111-111111111003',
  '11111111-1111-1111-1111-111111111004',
  '11111111-1111-1111-1111-111111111005'
);
-- Also clear any previous import with DR* quote ids if re-running
DELETE FROM itinerary_revisions WHERE itinerary_id IN (
  SELECT id FROM client_itineraries WHERE quote_id LIKE 'DR%'
);
DELETE FROM client_itineraries WHERE quote_id LIKE 'DR%';
DELETE FROM itineraries WHERE slug LIKE 'dr%';
""".strip(),
    encoding="utf-8",
)

CHUNK = 5
for bi, start in enumerate(range(0, len(pkgs), CHUNK)):
    batch = pkgs[start : start + CHUNK]
    parts: list[str] = []

    itin_vals = []
    for p in batch:
        itin_vals.append(
            "("
            + ", ".join(
                [
                    sql_str(p["id"]),
                    sql_str(p["title"]),
                    sql_str(p["destination"]),
                    sql_str(p["slug"]),
                    "NULL",
                    "NULL",
                    sql_str(p["package_type"]),
                    sql_str(p["duration_label"]),
                    "true",
                    "false",
                    sql_str("grid"),
                    sql_str("active"),
                    "0",
                    "now()",
                    "now()",
                ]
            )
            + ")"
        )
    parts.append(
        "INSERT INTO itineraries ("
        "id, package_name, destination, slug, pdf_url, cover_image_url, "
        "package_type, package_duration, show_on_website, is_trending, "
        "display_mode, status, download_count, created_at, updated_at"
        ") VALUES\n"
        + ",\n".join(itin_vals)
        + "\nON CONFLICT (id) DO UPDATE SET "
        "package_name = EXCLUDED.package_name, destination = EXCLUDED.destination, "
        "slug = EXCLUDED.slug, package_type = EXCLUDED.package_type, "
        "package_duration = EXCLUDED.package_duration, status = EXCLUDED.status, "
        "updated_at = now();"
    )

    ci_vals = []
    for p in batch:
        price = p.get("price_per_person") or 0
        ci_vals.append(
            "("
            + ", ".join(
                [
                    sql_str(p["client_itinerary_id"]),
                    sql_str(p["quote_id"]),
                    "'website_package'::itinerary_record_type",
                    sql_str(p["title"]),
                    sql_str(p["tour_code"]),
                    "'draft'::workflow_status",
                    "NULL",
                    "1",
                    sql_str("Website Package"),
                    "NULL",
                    "NULL",
                    "NULL",
                    "2",
                    "0",
                    "1",
                    str(price),
                    sql_str("INR"),
                    "0",
                    "'[]'::jsonb",
                    "'unpaid'::payment_status",
                    "0",
                    "NULL",
                    sql_str(p["id"]),
                    "now()",
                    "now()",
                ]
            )
            + ")"
        )
    parts.append(
        "INSERT INTO client_itineraries ("
        "id, quote_id, type, title, tour_code, workflow_status, "
        "current_revision_id, current_version, client_name, client_email, "
        "client_phone, travel_date, adults, children, rooms, grand_total, "
        "currency, margin_pct, category_totals, payment_status, amount_paid, "
        "deleted_at, source_package_id, created_at, updated_at"
        ") VALUES\n"
        + ",\n".join(ci_vals)
        + "\nON CONFLICT (id) DO UPDATE SET "
        "title = EXCLUDED.title, tour_code = EXCLUDED.tour_code, "
        "grand_total = EXCLUDED.grand_total, source_package_id = EXCLUDED.source_package_id, "
        "updated_at = now();"
    )

    rev_vals = []
    for p in batch:
        rev_vals.append(
            "("
            + ", ".join(
                [
                    sql_str(p["revision_id"]),
                    sql_str(p["client_itinerary_id"]),
                    "1",
                    "NULL",
                    sql_str("Imported package content"),
                    sql_str(f"Imported from {p['source_file']}"),
                    "'manual'::revision_save_type",
                    sql_json(p["snapshot"]),
                    "NULL",
                    "now()",
                ]
            )
            + ")"
        )
    parts.append(
        "INSERT INTO itinerary_revisions ("
        "id, itinerary_id, version_number, parent_revision_id, milestone_label, "
        "change_summary, save_type, snapshot, snapshot_checksum, created_at"
        ") VALUES\n"
        + ",\n".join(rev_vals)
        + "\nON CONFLICT (id) DO UPDATE SET snapshot = EXCLUDED.snapshot, "
        "change_summary = EXCLUDED.change_summary;"
    )

    cases = "\n".join(
        f"  WHEN {sql_str(p['client_itinerary_id'])} THEN {sql_str(p['revision_id'])}::uuid"
        for p in batch
    )
    ids = ", ".join(sql_str(p["client_itinerary_id"]) for p in batch)
    parts.append(
        "UPDATE client_itineraries SET current_revision_id = CASE id\n"
        f"{cases}\n"
        "END, updated_at = now() "
        f"WHERE id IN ({ids});"
    )

    path = batches_dir / f"{bi + 1:02d}_batch.sql"
    path.write_text("\n\n".join(parts), encoding="utf-8")
    print(path.name, "packages", len(batch), "bytes", path.stat().st_size)

print("batches", bi + 1)
