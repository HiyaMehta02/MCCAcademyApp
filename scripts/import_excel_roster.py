"""Import cleaned Excel roster after wipe. Uses service role from server/.env."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "server" / ".env")

URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_KEY"]
ROSTER = ROOT / "scripts" / "excel_roster_extract.json"

WADI = "49908128-0724-4193-ab1c-4c657ad64f9e"
AZAIBA = "86d47a79-22d7-4155-bba4-541362a2f468"
PROGRAM_BATCH = {"WD": "Weekday (WD)", "WE": "Weekend (WE)", "SPL": "Special (SPL)"}


def clean_student(row: dict) -> dict | None:
    first = (row.get("first_name") or "").strip()
    last = (row.get("last_name") or "").strip()
    if not first or first.upper() in {"NAME", "TOTAL", "COACH"}:
        return None
    if re.fullmatch(r"\d+", first):
        return None
    clothes = row.get("clothes_size")
    if last.isdigit():
        clothes = clothes or last
        last = "Unknown"
    out = dict(row)
    out["first_name"] = first
    out["last_name"] = last or "Unknown"
    out["clothes_size"] = clothes
    return out


def main() -> None:
    data = json.loads(ROSTER.read_text(encoding="utf-8"))
    students = [s for s in (clean_student(x) for x in data["students"]) if s]
    coaches = data["coaches"]
    sb = create_client(URL, KEY)

    plans = {p["plan_code"]: p["fee_plan_id"] for p in sb.table("fee_plan_templates").select("fee_plan_id, plan_code").execute().data}

    def fee_for(branch_id: str, program: str) -> str:
        if branch_id == AZAIBA:
            return plans["azaiba_3day"]
        return {"WD": plans["weekday_batch"], "WE": plans["weekend_batch"], "SPL": plans["special_batch"]}[program]

    batch_ids: dict[tuple[str, str], str] = {}
    for branch_id, label in ((WADI, "Wadi Kabir"), (AZAIBA, "Azaiba")):
        for program, pname in PROGRAM_BATCH.items():
            name = f"{pname} — {label}"
            resp = (
                sb.table("batches")
                .insert(
                    {
                        "batch_name": name,
                        "branch_id": branch_id,
                        "status": "active",
                        "fee_plan_id": fee_for(branch_id, program),
                    }
                )
                .execute()
            )
            batch_ids[(branch_id, program)] = resp.data[0]["batch_id"]
            print("batch", name)

    inserted = 0
    members = 0
    fee_n = 0
    for i in range(0, len(students), 40):
        chunk = students[i : i + 40]
        payload = [
            {
                "first_name": s["first_name"],
                "last_name": s["last_name"],
                "dob": s.get("dob"),
                "clothes_size": s.get("clothes_size"),
                "gender": s.get("gender") or "boy",
                "parent_phone": s.get("parent_phone"),
                "branch_id": s["branch_id"],
                "status": "active",
                "is_sibling_discount_eligible": False,
            }
            for s in chunk
        ]
        rows = sb.table("students").insert(payload).execute().data or []
        inserted += len(rows)
        member_rows = []
        fee_rows = []
        for s, row in zip(chunk, rows):
            sid = row["student_id"]
            for program in s.get("programs") or []:
                member_rows.append({"student_id": sid, "batch_id": batch_ids[(s["branch_id"], program)]})
                fee_rows.append({"student_id": sid, "fee_plan_id": fee_for(s["branch_id"], program)})
        if member_rows:
            sb.table("batch_members").upsert(member_rows, on_conflict="batch_id,student_id").execute()
            members += len(member_rows)
        if fee_rows:
            uniq = {(r["student_id"], r["fee_plan_id"]): r for r in fee_rows}
            sb.table("student_fee_plan_enrollments").upsert(list(uniq.values()), on_conflict="student_id,fee_plan_id").execute()
            fee_n += len(uniq)
        print(f"students {inserted}/{len(students)}")

    existing = sb.table("coaches").select("first_name, last_name").execute().data or []
    existing_keys = {re.sub(r"[^a-z0-9]", "", f"{c['first_name']}{c['last_name']}".lower()) for c in existing}
    created = 0
    for coach in coaches:
        key = re.sub(r"[^a-z0-9]", "", f"{coach['first_name']}{coach['last_name']}".lower())
        if key in existing_keys:
            continue
        sb.table("coaches").insert(
            {
                "first_name": coach["first_name"],
                "last_name": coach["last_name"] or "Coach",
                "status": "approved",
                "is_admin": False,
                "must_set_password": False,
            }
        ).execute()
        created += 1
        existing_keys.add(key)

    print(
        json.dumps(
            {
                "students_inserted": inserted,
                "batch_memberships": members,
                "fee_enrollments": fee_n,
                "coaches_created": created,
                "missing_program": sum(1 for s in students if not s.get("programs")),
                "missing_dob": sum(1 for s in students if not s.get("dob")),
                "with_clothes_size": sum(1 for s in students if s.get("clothes_size")),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
