"""Parse package Word-doc extracts and build SQL insert payloads."""
from __future__ import annotations

import hashlib
import json
import re
import uuid
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ALL = json.loads((ROOT / "_all.json").read_text(encoding="utf-8"))

TITLE_RE = re.compile(r"^(\d{1,2})\s*Days?\s+.+\s+Tour\s+Package$", re.I)
CODE_RE = re.compile(r"^Tour\s*Code\s*#?\s*([A-Z0-9]+)", re.I)
PRICE_RE = re.compile(r"^Rs\.?\s*([\d,]+)\s*/?-?\s*per\s*person", re.I)
DAY_RE = re.compile(r"^Day\s*:?\s*0*(\d+)\s*[:–—\-]\s*(.+)$", re.I)
DAY_ALT_RE = re.compile(r"^Day\s+0*(\d+)\s*:\s*(.+)$", re.I)
SECTION_INCL = re.compile(r"^Package\s+Inclusions?:?\s*$", re.I)
SECTION_EXCL = re.compile(r"^Package\s+Exclusions?:?\s*$", re.I)
SECTION_NOTE = re.compile(r"^Things\s+to\s+note:?\s*$", re.I)
BULLET_RE = re.compile(r"^[\*\u2022\-]\s*(.+)$")

CITIES = [
    "Sawai Madhopur",
    "Mount Abu",
    "Chittorgarh",
    "Kumbhalgarh",
    "Ranthambore",
    "Jaisalmer",
    "Shekhawati",
    "Nawalgarh",
    "Nathdwara",
    "Bharatpur",
    "Mandawa",
    "Ranakpur",
    "Jodhpur",
    "Udaipur",
    "Bikaner",
    "Pushkar",
    "Jaipur",
    "Ajmer",
    "Delhi",
    "Agra",
    "Kota",
    "Bundi",
    "Alwar",
    "Sariska",
    "Salasar",
    "Khimsar",
    "Osian",
    "Barmer",
    "Dausa",
]


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:80]


def uid(prefix: str, code: str) -> str:
    h = hashlib.md5(f"{prefix}:{code}".encode()).hexdigest()
    return str(uuid.UUID(h))


def parse_price(text: str) -> int | None:
    m = PRICE_RE.match(text)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


def infer_location_from_title(day_title: str) -> str | None:
    for c in CITIES:
        if re.search(rf"\b{re.escape(c)}\b", day_title, re.I):
            return c
    return None


def infer_destinations(title: str, days: list) -> str:
    m = re.match(r"^\d{1,2}\s*Days?\s+(.+?)\s+Tour\s+Package$", title, re.I)
    if m:
        return m.group(1).strip()
    locs: list[str] = []
    for d in days:
        loc = d.get("location") or ""
        if loc and loc not in locs:
            locs.append(loc)
    return " · ".join(locs) if locs else "Rajasthan"


def is_new_package_title(line: str) -> bool:
    return bool(TITLE_RE.match(line))


def parse_doc(doc: dict) -> list[dict]:
    paras = doc["paras"]
    packages: list[dict] = []
    i = 0
    n = len(paras)
    while i < n:
        line = paras[i]
        if not is_new_package_title(line):
            i += 1
            continue
        title = line
        days_count_m = re.match(r"^(\d{1,2})", title)
        duration_days = int(days_count_m.group(1)) if days_count_m else 1
        i += 1
        tour_code = None
        price = None
        while i < n and not is_new_package_title(paras[i]) and tour_code is None:
            if CODE_RE.match(paras[i]):
                tour_code = CODE_RE.match(paras[i]).group(1).upper()
                i += 1
                if i < n and PRICE_RE.match(paras[i]):
                    price = parse_price(paras[i])
                    i += 1
                break
            if PRICE_RE.match(paras[i]):
                price = parse_price(paras[i])
                i += 1
            else:
                break

        body: list[str] = []
        while i < n and not is_new_package_title(paras[i]):
            body.append(paras[i])
            i += 1

        days: list[dict] = []
        inclusions: list[str] = []
        exclusions: list[str] = []
        notes: list[str] = []
        mode = "preamble"
        current_day: dict | None = None
        day_buf: list[str] = []

        def flush_day() -> None:
            nonlocal current_day, day_buf
            if current_day is None:
                return
            desc_parts: list[str] = []
            activities: list[dict] = []
            for bl in day_buf:
                bm = re.match(r"^([^:]{2,80}):\s*(.+)$", bl)
                if (
                    bm
                    and len(bm.group(1).split()) <= 8
                    and not bl.lower().startswith("day")
                ):
                    activities.append(
                        {
                            "title": bm.group(1).strip(),
                            "description": bm.group(2).strip(),
                        }
                    )
                else:
                    desc_parts.append(bl)
            current_day["day_description"] = "\n".join(desc_parts).strip()
            current_day["activities"] = activities
            days.append(current_day)
            current_day = None
            day_buf = []

        for bl in body:
            if SECTION_INCL.match(bl):
                flush_day()
                mode = "inclusions"
                continue
            if SECTION_EXCL.match(bl):
                flush_day()
                mode = "exclusions"
                continue
            if SECTION_NOTE.match(bl):
                flush_day()
                mode = "notes"
                continue
            dm = DAY_RE.match(bl) or DAY_ALT_RE.match(bl)
            if dm and mode in ("preamble", "day"):
                flush_day()
                mode = "day"
                dtitle = dm.group(2).strip()
                current_day = {
                    "day_number": int(dm.group(1)),
                    "day_title": dtitle,
                    "location": infer_location_from_title(dtitle),
                }
                day_buf = []
                continue
            bm = BULLET_RE.match(bl)
            text = bm.group(1) if bm else bl
            if mode == "inclusions":
                inclusions.append(text)
            elif mode == "exclusions":
                exclusions.append(text)
            elif mode == "notes":
                notes.append(text)
            elif mode == "day" and current_day is not None:
                day_buf.append(bl)
        flush_day()

        if not days and duration_days:
            for d in range(1, duration_days + 1):
                days.append(
                    {
                        "day_number": d,
                        "day_title": f"Day {d}",
                        "location": None,
                        "day_description": "",
                        "activities": [],
                    }
                )

        dest = infer_destinations(title, days)
        code = tour_code or f"AUTO{len(packages) + 1:03d}"
        packages.append(
            {
                "source_file": doc["file"],
                "title": title,
                "tour_code": code,
                "price_per_person": price,
                "duration_days": duration_days,
                "duration_nights": max(0, duration_days - 1),
                "duration_label": (
                    f"{max(0, duration_days - 1):02d} Night / {duration_days:02d} Days"
                    if duration_days > 1
                    else "01 Day"
                ),
                "destination": dest,
                "package_type": "Domestic",
                "slug": slugify(f"{code}-{title}"),
                "days": days,
                "inclusions": inclusions,
                "exclusions": exclusions,
                "notes": notes,
            }
        )
    return packages


def activity_uuid(code: str, day_num: int, idx: int) -> str:
    return uid("act", f"{code}:{day_num}:{idx}")


def day_uuid(code: str, day_num: int) -> str:
    return uid("day", f"{code}:{day_num}")


def build_snapshot(p: dict) -> dict:
    days_out = []
    for d in p["days"]:
        acts = []
        for ai, a in enumerate(d.get("activities") or []):
            acts.append(
                {
                    "activity_uuid": activity_uuid(p["tour_code"], d["day_number"], ai),
                    "sort_order": ai,
                    "title": a["title"],
                    "description": a["description"],
                    "start_time": None,
                    "end_time": None,
                    "entry_fee": 0,
                    "guide_required": False,
                }
            )
        is_last = d["day_number"] == p["duration_days"]
        is_first = d["day_number"] == 1
        days_out.append(
            {
                "day_uuid": day_uuid(p["tour_code"], d["day_number"]),
                "day_number": d["day_number"],
                "day_title": d["day_title"],
                "alternate_day_titles": [],
                "day_subtitle": None,
                "day_theme": "Heritage",
                "day_description": d.get("day_description") or "",
                "start_time": "09:00",
                "end_time": "18:00",
                "travel_distance_km": None,
                "travel_time_minutes": None,
                "location": d.get("location"),
                "hotel_name": None if is_last and p["duration_days"] > 1 else None,
                "room_category": None,
                "meal_plan": "CP" if p["duration_days"] > 1 else "EP",
                "breakfast": not is_first,
                "lunch": False,
                "dinner": not is_last and p["duration_days"] > 1,
                "breakfast_hotels": [None, None],
                "lunch_hotels": [None, None],
                "dinner_hotels": [None, None],
                "epai_plan_only": False,
                "guest_self_booked_hotel": False,
                "vehicle_type": "AC Car",
                "pickup_location": None,
                "drop_location": None,
                "guide_required": bool(acts),
                "activities": acts,
                "images": [],
                "internal_notes": "",
                "client_notes": "",
                "operations_notes": "",
                "status": "planned",
                "completion_pct": 0,
                "packing_tips": "",
                "things_to_carry": [],
            }
        )

    notes = "\n".join(f"• {n}" for n in p.get("notes") or [])
    price = p.get("price_per_person")
    return {
        "header": {
            "title": p["title"],
            "subtitle": p["destination"],
            "tour_code": p["tour_code"],
            "duration_label": p["duration_label"],
            "alternate_titles": [],
        },
        "client": {
            "title": "Mr",
            "client_name": "Website Package",
            "email": None,
            "email2": None,
            "phone": None,
            "adults": 2,
            "children_5_12": 0,
            "children_below_5": 0,
            "rooms": 1,
            "extra_beds": 0,
            "travel_date": None,
            "food_preference": None,
            "special_requests": None,
        },
        "days": days_out,
        "inclusions": p.get("inclusions") or [],
        "exclusions": p.get("exclusions") or [],
        "inclusion_items": [
            {
                "id": uid("incl", f"{p['tour_code']}:{i}"),
                "title": item,
                "description": "",
                "images": [],
            }
            for i, item in enumerate(p.get("inclusions") or [])
        ],
        "exclusion_items": [
            {
                "id": uid("excl", f"{p['tour_code']}:{i}"),
                "title": item,
                "description": "",
                "images": [],
            }
            for i, item in enumerate(p.get("exclusions") or [])
        ],
        "terms": notes
        or "50% advance to confirm. Balance due 7 days before travel. Cancellation as per company policy.",
        "internal_notes": f"Imported from {p['source_file']}",
        "public_notes": notes,
        "category_pricing": [
            {
                "category_key": "deluxe_hotels",
                "label": "Deluxe Hotels",
                "room_category": "Deluxe",
                "package_price": float(price or 0),
                "discount_price": None,
                "booking_amount": None,
                "grand_total": float(price or 0),
                "manual_override": None,
            }
        ]
        if price
        else [],
        "source_package_id": p["id"],
        "cost_sheet": {
            "currency": "INR",
            "line_items": [],
            "subtotal": float(price or 0),
            "markup_total": 0,
            "discount_total": 0,
            "tax_total": 0,
            "grand_total": float(price or 0),
            "net_profit": 0,
            "margin_pct": 0,
        },
        "vehicle_type": "AC Car",
        "vehicle_types": ["AC Car"],
        "price_basis": "per_person",
        "final_price": float(price) if price else None,
        "optional_inclusion_keys": [],
        "preview_theme": 1,
        "selected_contact_id": None,
    }


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_json(obj) -> str:
    return "'" + json.dumps(obj, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def main() -> None:
    all_packages: list[dict] = []
    for doc in ALL:
        pkgs = parse_doc(doc)
        all_packages.extend(pkgs)
        print(f"{doc['file']}: {len(pkgs)} packages")

    seen: set[str] = set()
    unique: list[dict] = []
    dupes: list[str] = []
    for p in all_packages:
        code = p["tour_code"]
        if code in seen:
            dupes.append(code)
            continue
        seen.add(code)
        unique.append(p)

    for p in unique:
        p["id"] = uid("itinerary", p["tour_code"])
        p["client_itinerary_id"] = uid("client", p["tour_code"])
        p["revision_id"] = uid("revision", p["tour_code"])
        p["quote_id"] = p["tour_code"][:20]
        p["snapshot"] = build_snapshot(p)

    (ROOT / "parsed_packages.json").write_text(
        json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("TOTAL", len(all_packages), "UNIQUE", len(unique), "DUPES", dupes)

    # Remove seed dummy packages (fixed UUIDs from migration 002) before insert
    sql_parts: list[str] = [
        "-- Imported website packages from Package-content docs",
        "BEGIN;",
        # Clear previous seed demo itineraries only (keep downloads etc. optional)
        "DELETE FROM itineraries WHERE id IN (",
        "  '11111111-1111-1111-1111-111111111001',",
        "  '11111111-1111-1111-1111-111111111002',",
        "  '11111111-1111-1111-1111-111111111003',",
        "  '11111111-1111-1111-1111-111111111004',",
        "  '11111111-1111-1111-1111-111111111005'",
        ");",
    ]

    # Batch itineraries inserts
    itin_values = []
    for p in unique:
        duration = p["duration_label"]
        itin_values.append(
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
                    sql_str(duration),
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

    # chunk itineraries
    chunk = 25
    for i in range(0, len(itin_values), chunk):
        batch = itin_values[i : i + chunk]
        sql_parts.append(
            "INSERT INTO itineraries ("
            "id, package_name, destination, slug, pdf_url, cover_image_url, "
            "package_type, package_duration, show_on_website, is_trending, "
            "display_mode, status, download_count, created_at, updated_at"
            ") VALUES\n"
            + ",\n".join(batch)
            + "\nON CONFLICT (id) DO UPDATE SET "
            "package_name = EXCLUDED.package_name, "
            "destination = EXCLUDED.destination, "
            "slug = EXCLUDED.slug, "
            "package_type = EXCLUDED.package_type, "
            "package_duration = EXCLUDED.package_duration, "
            "status = EXCLUDED.status, "
            "updated_at = now();"
        )

    # client_itineraries + revisions — insert records first without current_revision_id FK,
    # then revisions, then update FK
    ci_values = []
    for p in unique:
        price = p.get("price_per_person") or 0
        ci_values.append(
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

    for i in range(0, len(ci_values), chunk):
        batch = ci_values[i : i + chunk]
        sql_parts.append(
            "INSERT INTO client_itineraries ("
            "id, quote_id, type, title, tour_code, workflow_status, "
            "current_revision_id, current_version, client_name, client_email, "
            "client_phone, travel_date, adults, children, rooms, grand_total, "
            "currency, margin_pct, category_totals, payment_status, amount_paid, "
            "deleted_at, source_package_id, created_at, updated_at"
            ") VALUES\n"
            + ",\n".join(batch)
            + "\nON CONFLICT (id) DO UPDATE SET "
            "title = EXCLUDED.title, "
            "tour_code = EXCLUDED.tour_code, "
            "grand_total = EXCLUDED.grand_total, "
            "source_package_id = EXCLUDED.source_package_id, "
            "updated_at = now();"
        )

    rev_values = []
    for p in unique:
        snap = p["snapshot"]
        rev_values.append(
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
                    sql_json(snap),
                    "NULL",
                    "now()",
                ]
            )
            + ")"
        )

    for i in range(0, len(rev_values), chunk):
        batch = rev_values[i : i + chunk]
        sql_parts.append(
            "INSERT INTO itinerary_revisions ("
            "id, itinerary_id, version_number, parent_revision_id, milestone_label, "
            "change_summary, save_type, snapshot, snapshot_checksum, created_at"
            ") VALUES\n"
            + ",\n".join(batch)
            + "\nON CONFLICT (id) DO UPDATE SET "
            "snapshot = EXCLUDED.snapshot, "
            "change_summary = EXCLUDED.change_summary;"
        )

    # link current_revision_id
    for i in range(0, len(unique), chunk):
        batch = unique[i : i + chunk]
        cases = "\n".join(
            f"  WHEN {sql_str(p['client_itinerary_id'])} THEN {sql_str(p['revision_id'])}::uuid"
            for p in batch
        )
        ids = ", ".join(sql_str(p["client_itinerary_id"]) for p in batch)
        sql_parts.append(
            "UPDATE client_itineraries SET current_revision_id = CASE id\n"
            f"{cases}\n"
            "END, updated_at = now() "
            f"WHERE id IN ({ids});"
        )

    sql_parts.append("COMMIT;")
    sql_text = "\n\n".join(sql_parts)
    (ROOT / "insert_packages.sql").write_text(sql_text, encoding="utf-8")
    print("SQL bytes", len(sql_text))
    print("By days:", dict(sorted(Counter(p["duration_days"] for p in unique).items())))
    print("Sample:")
    for p in unique[:8]:
        print(
            f" - {p['tour_code']} | {p['title']} | days={len(p['days'])} | "
            f"price={p['price_per_person']} | incl={len(p['inclusions'])}"
        )


if __name__ == "__main__":
    main()
