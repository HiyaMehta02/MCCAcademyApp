"""Extract student + coach roster from owner Excel into JSON for DB import."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import openpyxl

XLSX = Path(
    r"c:\Users\hiyam\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\671861BB56707BCE701199A0B89D8A89BA7B0B4B\transfers\2026-28\ATTENDANCE EXCEL 2024 JAN LATEST.xlsx"
)
OUT = Path(__file__).resolve().parent / "excel_roster_extract.json"

WADI = "49908128-0724-4193-ab1c-4c657ad64f9e"
AZAIBA = "86d47a79-22d7-4155-bba4-541362a2f468"

SKIP_NAMES = {"NAME", "TOTAL", "S/N", "BATCH"}


def split_name(full: str) -> tuple[str, str]:
    parts = [p for p in re.split(r"\s+", full.strip()) if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0].title(), ""
    return parts[0].title(), " ".join(p.title() for p in parts[1:])


def parse_dob(value) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    # e.g. 21-9-1977
    m = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$", text)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 1900 if y > 30 else 2000
        try:
            return datetime(y, mo, d).date().isoformat()
        except ValueError:
            return None
    return None


def normalize_programs(batch_raw: str) -> list[str]:
    if not batch_raw:
        return []
    text = batch_raw.upper().replace("/", " ").replace("-", " ").replace(",", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if text in {"COACH", "BATCH"}:
        return []
    found: list[str] = []
    for token in text.split():
        if token in {"WD", "WEEKDAY", "WEEKDAYS"}:
            if "WD" not in found:
                found.append("WD")
        elif token in {"WE", "WEEKEND", "WEEKENDS"}:
            if "WE" not in found:
                found.append("WE")
        elif token in {"SPL", "SPECIAL"}:
            if "SPL" not in found:
                found.append("SPL")
    return found


def guess_gender_from_name(first: str) -> str:
    # No gender in Excel — leave as boy default; mark missing_gender
    return "boy"


def read_sheet_students(ws, *, default_branch_id: str, name_col: int, batch_col: int, dob_col: int | None, size_col: int | None):
    students = []
    coaches = []
    header_row = None
    for i, row in enumerate(ws.iter_rows(values_only=True), start=1):
        vals = list(row)
        texts = [str(v).strip().upper() if v is not None else "" for v in vals]
        if "NAME" in texts and "BATCH" in texts:
            header_row = i
            # refresh cols from header if possible
            if "NAME" in texts:
                name_col = texts.index("NAME")
            if "BATCH" in texts:
                batch_col = texts.index("BATCH")
            if "DOB" in texts:
                dob_col = texts.index("DOB")
            if "CLOTHES SIZE" in texts:
                size_col = texts.index("CLOTHES SIZE")
            break

    if header_row is None:
        return students, coaches

    for i, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if i <= header_row:
            continue
        vals = list(row)
        if name_col >= len(vals):
            continue
        raw_name = vals[name_col]
        if raw_name is None or str(raw_name).strip() == "":
            continue
        name = str(raw_name).strip()
        if name.upper() in SKIP_NAMES:
            continue
        batch_raw = ""
        if batch_col < len(vals) and vals[batch_col] is not None:
            batch_raw = str(vals[batch_col]).strip()

        first, last = split_name(name)
        if batch_raw.upper() == "COACH":
            coaches.append(
                {
                    "full_name": name,
                    "first_name": first,
                    "last_name": last or "Coach",
                    "source_sheet": ws.title,
                    "branch_id": default_branch_id,
                }
            )
            continue

        programs = normalize_programs(batch_raw)
        dob = None
        if dob_col is not None and dob_col < len(vals):
            dob = parse_dob(vals[dob_col])
        size = None
        if size_col is not None and size_col < len(vals) and vals[size_col] not in (None, ""):
            size = str(vals[size_col]).strip()

        students.append(
            {
                "full_name": name,
                "first_name": first,
                "last_name": last or "Unknown",
                "branch_id": default_branch_id,
                "programs": programs,
                "batch_raw": batch_raw or None,
                "dob": dob,
                "clothes_size": size,
                "gender": guess_gender_from_name(first),
                "parent_phone": None,
                "missing_gender": True,
                "missing_phone": True,
                "missing_program": len(programs) == 0,
                "source_sheet": ws.title,
            }
        )
    return students, coaches


def merge_students(rows: list[dict]) -> list[dict]:
    by_key: dict[str, dict] = {}
    for row in rows:
        key = re.sub(r"[^a-z0-9]", "", f"{row['first_name']}{row['last_name']}".lower())
        if not key:
            continue
        existing = by_key.get(key)
        if not existing:
            by_key[key] = dict(row)
            by_key[key]["programs"] = list(row["programs"])
            by_key[key]["sources"] = [row["source_sheet"]]
            continue
        # Prefer Wadi Kabir if conflict unless only on Azaiba sheet
        if existing["branch_id"] != row["branch_id"]:
            # if one source is AZAIBA sheet and other MASTER/WADI, keep both programs on primary branch from MASTER/WADI
            if row["source_sheet"].upper().startswith("AZAIBA") and not existing["source_sheet"].upper().startswith("AZAIBA"):
                pass  # keep existing branch
            elif existing["source_sheet"].upper().startswith("AZAIBA") and not row["source_sheet"].upper().startswith("AZAIBA"):
                existing["branch_id"] = row["branch_id"]
        for p in row["programs"]:
            if p not in existing["programs"]:
                existing["programs"].append(p)
        if not existing.get("dob") and row.get("dob"):
            existing["dob"] = row["dob"]
        if not existing.get("clothes_size") and row.get("clothes_size"):
            existing["clothes_size"] = row["clothes_size"]
        if not existing.get("batch_raw") and row.get("batch_raw"):
            existing["batch_raw"] = row["batch_raw"]
        existing["missing_program"] = len(existing["programs"]) == 0
        existing["sources"].append(row["source_sheet"])
    return list(by_key.values())


def merge_coaches(rows: list[dict]) -> list[dict]:
    by_key: dict[str, dict] = {}
    for row in rows:
        key = re.sub(r"[^a-z0-9]", "", f"{row['first_name']}{row['last_name']}".lower())
        if key in by_key:
            branches = set(by_key[key].get("branch_ids", [by_key[key]["branch_id"]]))
            branches.add(row["branch_id"])
            by_key[key]["branch_ids"] = sorted(branches)
            continue
        by_key[key] = dict(row)
        by_key[key]["branch_ids"] = [row["branch_id"]]
    return list(by_key.values())


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    all_students = []
    all_coaches = []

    # MASTER is best for DOB/size; treat as Wadi Kabir unless we later override from Azaiba sheet
    if "MASTER" in wb.sheetnames:
        s, c = read_sheet_students(
            wb["MASTER"],
            default_branch_id=WADI,
            name_col=1,
            batch_col=4,
            dob_col=2,
            size_col=3,
        )
        all_students.extend(s)
        all_coaches.extend(c)

    if "WADI KABIR" in wb.sheetnames:
        s, c = read_sheet_students(
            wb["WADI KABIR"],
            default_branch_id=WADI,
            name_col=1,
            batch_col=2,
            dob_col=None,
            size_col=None,
        )
        all_students.extend(s)
        all_coaches.extend(c)

    if "AZAIBA" in wb.sheetnames:
        s, c = read_sheet_students(
            wb["AZAIBA"],
            default_branch_id=AZAIBA,
            name_col=1,
            batch_col=2,
            dob_col=None,
            size_col=None,
        )
        # Prefer Azaiba branch for names that appear on Azaiba sheet
        for row in s:
            row["force_azaiba"] = True
        all_students.extend(s)
        all_coaches.extend(c)

    wb.close()

    # Second-pass: if student marked force_azaiba, set branch to Azaiba after merge prep
    merged = merge_students(all_students)
    for row in merged:
        sources = row.get("sources", [])
        if any(str(s).upper() == "AZAIBA" for s in sources) and not any(
            str(s).upper() in {"MASTER", "WADI KABIR"} for s in sources
        ):
            row["branch_id"] = AZAIBA
        # If on both, keep Wadi Kabir as home (owner said only 2-3 cross) unless only Azaiba
        row.pop("force_azaiba", None)

    coaches = merge_coaches(all_coaches)

    payload = {
        "extracted_at": datetime.utcnow().isoformat() + "Z",
        "source_file": str(XLSX),
        "summary": {
            "students": len(merged),
            "coaches": len(coaches),
            "with_dob": sum(1 for s in merged if s.get("dob")),
            "with_clothes_size": sum(1 for s in merged if s.get("clothes_size")),
            "missing_program": sum(1 for s in merged if s.get("missing_program")),
            "wadi_kabir": sum(1 for s in merged if s["branch_id"] == WADI),
            "azaiba": sum(1 for s in merged if s["branch_id"] == AZAIBA),
            "programs": {
                "WD": sum(1 for s in merged if "WD" in s["programs"]),
                "WE": sum(1 for s in merged if "WE" in s["programs"]),
                "SPL": sum(1 for s in merged if "SPL" in s["programs"]),
                "multi": sum(1 for s in merged if len(s["programs"]) > 1),
            },
        },
        "students": sorted(merged, key=lambda s: (s["last_name"], s["first_name"])),
        "coaches": sorted(coaches, key=lambda c: (c["last_name"], c["first_name"])),
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload["summary"], indent=2))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
