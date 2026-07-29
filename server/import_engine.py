"""CSV bulk import engine — branches, batches, students, batch_members (v1)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import re
from typing import Any

from postgrest.exceptions import APIError
from supabase import Client

MUSCAT_BRANCH_ID = "49908128-0724-4193-ab1c-4c657ad64f9e"
AZAIBA_BRANCH_ID = "86d47a79-22d7-4155-bba4-541362a2f468"


class RowImportError(Exception):
    pass


@dataclass
class ImportCounters:
    branches: int = 0
    batches: int = 0
    students: int = 0
    enrollments: int = 0

    def to_dict(self) -> dict[str, int]:
        return {
            "branches": self.branches,
            "batches": self.batches,
            "students": self.students,
            "enrollments": self.enrollments,
        }


@dataclass
class RowResult:
    row: int
    status: str
    action: str | None = None
    student_id: str | None = None
    error: str | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"row": self.row, "status": self.status}
        if self.action:
            out["action"] = self.action
        if self.student_id:
            out["student_id"] = self.student_id
        if self.error:
            out["error"] = self.error
        if self.details:
            out["details"] = self.details
        return out


def _clean(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def split_full_name(full: str) -> tuple[str, str]:
    parts = [p for p in full.strip().split() if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def normalize_gender(raw: str) -> str | None:
    value = _clean(raw).lower()
    if not value:
        return None
    if value in {"m", "male", "boy", "b", "son"}:
        return "boy"
    if value in {"f", "female", "girl", "g", "daughter"}:
        return "girl"
    return None


_DATE_PATTERNS = (
    ("%Y-%m-%d", re.compile(r"^\d{4}-\d{2}-\d{2}$")),
    ("%d/%m/%Y", re.compile(r"^\d{1,2}/\d{1,2}/\d{4}$")),
    ("%d-%m-%Y", re.compile(r"^\d{1,2}-\d{1,2}-\d{4}$")),
    ("%m/%d/%Y", re.compile(r"^\d{1,2}/\d{1,2}/\d{4}$")),
)


def parse_dob(raw: str) -> str | None:
    value = _clean(raw)
    if not value:
        return None
    for fmt, pattern in _DATE_PATTERNS:
        if not pattern.match(value):
            continue
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.date().isoformat()
        except ValueError:
            continue
    raise RowImportError(f"Invalid date of birth: {value!r}")


def normalize_record(raw: dict[str, Any]) -> dict[str, Any]:
    first = _clean(raw.get("first_name"))
    last = _clean(raw.get("last_name"))
    full = _clean(raw.get("full_name"))

    if not first and not last and full:
        first, last = split_full_name(full)

    gender_raw = _clean(raw.get("gender"))
    gender = normalize_gender(gender_raw) if gender_raw else "boy"

    dob_raw = _clean(raw.get("dob") or raw.get("date_of_birth"))
    dob = parse_dob(dob_raw) if dob_raw else None
    clothes_size = _clean(raw.get("clothes_size") or raw.get("kit_size") or raw.get("size")) or None

    branch_name = _clean(raw.get("branch_name"))
    # Owner roster uses Wadi Kabir for the Muscat location
    if branch_name.lower() in {"wadi kabir", "wadikabir", "wadi kabir branch", "muscat", "muscat branch"}:
        branch_name = "Wadi Kabir Branch"
    elif branch_name.lower() in {"azaiba", "azaiba branch"}:
        branch_name = "Azaiba Branch"

    return {
        "first_name": first,
        "last_name": last,
        "branch_name": branch_name,
        "batch_name": _clean(raw.get("batch_name")),
        "parent_phone": _clean(raw.get("parent_phone")),
        "gender": gender,
        "dob": dob,
        "clothes_size": clothes_size,
    }


class ImportEngine:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self._branch_by_name: dict[str, str] = {}
        self._batch_by_key: dict[str, str] = {}
        self._fee_plan_cache: dict[str, str | None] = {}

    def _load_existing_branches(self) -> None:
        if self._branch_by_name:
            return
        resp = self.supabase.table("branches").select("branch_id, branch_name").execute()
        for row in resp.data or []:
            name = _clean(row.get("branch_name"))
            if name:
                self._branch_by_name[name.lower()] = row["branch_id"]

    def _load_existing_batches(self) -> None:
        if self._batch_by_key:
            return
        resp = (
            self.supabase.table("batches")
            .select("batch_id, batch_name, branch_id")
            .execute()
        )
        for row in resp.data or []:
            branch_id = row.get("branch_id")
            name = _clean(row.get("batch_name"))
            if branch_id and name:
                self._batch_by_key[f"{branch_id}:{name.lower()}"] = row["batch_id"]

    def _default_fee_plan_id(self, branch_id: str) -> str | None:
        if branch_id in self._fee_plan_cache:
            return self._fee_plan_cache[branch_id]

        plan_code = "azaiba_3day" if branch_id == AZAIBA_BRANCH_ID else "weekday_batch"
        resp = (
            self.supabase.table("fee_plan_templates")
            .select("fee_plan_id")
            .eq("plan_code", plan_code)
            .limit(1)
            .execute()
        )
        fee_plan_id = resp.data[0]["fee_plan_id"] if resp.data else None
        self._fee_plan_cache[branch_id] = fee_plan_id
        return fee_plan_id

    def _get_or_create_branch(self, branch_name: str, dry_run: bool, counters: ImportCounters) -> str:
        key = branch_name.lower()
        if key in self._branch_by_name:
            return self._branch_by_name[key]

        if dry_run:
            counters.branches += 1
            placeholder = f"dry-run-branch:{key}"
            self._branch_by_name[key] = placeholder
            return placeholder

        resp = (
            self.supabase.table("branches")
            .insert({"branch_name": branch_name, "status": "active"})
            .select("branch_id")
            .single()
            .execute()
        )
        branch_id = resp.data["branch_id"]
        self._branch_by_name[key] = branch_id
        counters.branches += 1
        return branch_id

    def _get_or_create_batch(
        self, branch_id: str, batch_name: str, dry_run: bool, counters: ImportCounters
    ) -> str:
        key = f"{branch_id}:{batch_name.lower()}"
        if key in self._batch_by_key:
            return self._batch_by_key[key]

        if dry_run:
            counters.batches += 1
            placeholder = f"dry-run-batch:{key}"
            self._batch_by_key[key] = placeholder
            return placeholder

        payload: dict[str, Any] = {
            "batch_name": batch_name,
            "branch_id": branch_id,
            "status": "active",
        }
        fee_plan_id = self._default_fee_plan_id(branch_id)
        if fee_plan_id:
            payload["fee_plan_id"] = fee_plan_id

        resp = (
            self.supabase.table("batches")
            .insert(payload)
            .select("batch_id")
            .single()
            .execute()
        )
        batch_id = resp.data["batch_id"]
        self._batch_by_key[key] = batch_id
        counters.batches += 1
        return batch_id

    def _find_existing_student(
        self, branch_id: str, first_name: str, last_name: str, parent_phone: str
    ) -> str | None:
        if parent_phone:
            resp = (
                self.supabase.table("students")
                .select("student_id")
                .eq("branch_id", branch_id)
                .eq("parent_phone", parent_phone)
                .limit(1)
                .execute()
            )
            if resp.data:
                return resp.data[0]["student_id"]

        resp = (
            self.supabase.table("students")
            .select("student_id")
            .eq("branch_id", branch_id)
            .ilike("first_name", first_name)
            .ilike("last_name", last_name)
            .limit(1)
            .execute()
        )
        if resp.data:
            return resp.data[0]["student_id"]
        return None

    def _create_student(self, branch_id: str, record: dict[str, Any], dry_run: bool) -> str:
        if dry_run:
            return f"dry-run-student:{record['first_name']}:{record['last_name']}"

        payload = {
            "first_name": record["first_name"],
            "last_name": record["last_name"],
            "gender": record["gender"],
            "branch_id": branch_id,
            "parent_phone": record["parent_phone"] or None,
            "dob": record["dob"],
            "clothes_size": record.get("clothes_size") or None,
            "status": "active",
            "is_sibling_discount_eligible": False,
        }
        resp = (
            self.supabase.table("students")
            .insert(payload)
            .select("student_id")
            .single()
            .execute()
        )
        return resp.data["student_id"]

    def _ensure_enrollment(
        self, student_id: str, batch_id: str, dry_run: bool, counters: ImportCounters
    ) -> bool:
        if dry_run:
            if batch_id.startswith("dry-run-"):
                counters.enrollments += 1
                return True
            existing = (
                self.supabase.table("batch_members")
                .select("student_id")
                .eq("student_id", student_id)
                .eq("batch_id", batch_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                return False
            counters.enrollments += 1
            return True

        existing = (
            self.supabase.table("batch_members")
            .select("student_id")
            .eq("student_id", student_id)
            .eq("batch_id", batch_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            return False

        self.supabase.table("batch_members").insert(
            {"student_id": student_id, "batch_id": batch_id}
        ).execute()
        counters.enrollments += 1
        return True

    def process_row(
        self,
        row_number: int,
        raw_record: dict[str, Any],
        dry_run: bool,
        counters: ImportCounters,
    ) -> RowResult:
        try:
            record = normalize_record(raw_record)

            if not record["first_name"]:
                raise RowImportError("Missing first name (map first_name or full_name).")
            if not record["last_name"]:
                raise RowImportError("Missing last name (map last_name or full_name).")
            if not record["branch_name"]:
                raise RowImportError("Missing branch_name.")
            if not record["batch_name"]:
                raise RowImportError("Missing batch_name.")
            if record["gender"] not in {"boy", "girl"}:
                raise RowImportError("Invalid gender (use boy/girl, M/F, Male/Female).")

            branch_id = self._get_or_create_branch(record["branch_name"], dry_run, counters)
            batch_id = self._get_or_create_batch(
                branch_id, record["batch_name"], dry_run, counters
            )

            student_id: str | None = None
            if not branch_id.startswith("dry-run-"):
                student_id = self._find_existing_student(
                    branch_id,
                    record["first_name"],
                    record["last_name"],
                    record["parent_phone"],
                )
            action = "enroll_existing"

            if not student_id:
                student_id = self._create_student(branch_id, record, dry_run)
                counters.students += 1
                action = "create_and_enroll"

            enrolled = self._ensure_enrollment(student_id, batch_id, dry_run, counters)
            if not enrolled and action == "enroll_existing":
                action = "already_enrolled"

            return RowResult(
                row=row_number,
                status="ok",
                action=action,
                student_id=None if dry_run else student_id,
                details={
                    "branch_name": record["branch_name"],
                    "batch_name": record["batch_name"],
                    "student_name": f"{record['first_name']} {record['last_name']}".strip(),
                },
            )
        except RowImportError as exc:
            return RowResult(row=row_number, status="error", error=str(exc))
        except APIError as exc:
            msg = getattr(exc, "message", None) or str(exc)
            return RowResult(row=row_number, status="error", error=msg)

    def run(
        self,
        records: list[dict[str, Any]],
        dry_run: bool,
    ) -> dict[str, Any]:
        self._load_existing_branches()
        self._load_existing_batches()

        counters = ImportCounters()
        row_results: list[RowResult] = []

        for index, record in enumerate(records, start=1):
            if not any(_clean(v) for v in record.values()):
                continue
            row_results.append(self.process_row(index, record, dry_run, counters))

        success_count = sum(1 for r in row_results if r.status == "ok")
        error_count = sum(1 for r in row_results if r.status == "error")

        return {
            "dry_run": dry_run,
            "total_rows": len(row_results),
            "success_count": success_count,
            "error_count": error_count,
            "created" if not dry_run else "would_create": counters.to_dict(),
            "row_results": [r.to_dict() for r in row_results],
        }
