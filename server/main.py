from __future__ import annotations

from datetime import datetime, timezone
import base64
import io
import json
import pathlib

import re

import httpx
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.responses import JSONResponse
import face_recognition
import numpy as np
from PIL import Image, ImageOps
from supabase import create_client, Client
from postgrest.exceptions import APIError
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

_SERVER_DIR = pathlib.Path(__file__).resolve().parent
DEBUG_ENROLL_DIR = _SERVER_DIR / "debug_enroll"

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SUPABASE_ANON_KEY = (os.environ.get("SUPABASE_ANON_KEY") or "").strip()
COACH_LOGIN_EMAIL_DOMAIN = "login.mccc.internal"
_LOGIN_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]{3,32}$")


def _normalize_login_id(raw: str) -> str:
    return (raw or "").strip().lower()


def _login_id_to_email(login_id: str) -> str:
    return f"{login_id}@{COACH_LOGIN_EMAIL_DOMAIN}"


def _validate_login_id(login_id: str) -> str | None:
    if len(login_id) < 3 or len(login_id) > 32:
        return "Coach ID must be 3–32 characters."
    if not _LOGIN_ID_RE.match(login_id):
        return "Coach ID may use letters, numbers, dots, hyphens, and underscores."
    return None


async def _require_admin(authorization: str | None) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=503,
            detail="Server missing SUPABASE_URL or SUPABASE_ANON_KEY for admin verification.",
        )
    token = authorization.split(" ", 1)[1].strip()
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/is_current_user_admin",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            json={},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    if not response.json():
        raise HTTPException(status_code=403, detail="Admin access required.")


def _warn_supabase_key_for_server_writes() -> None:
    """RLS blocks anon/publishable keys on student_auth; server must use elevated secret."""
    key = (os.environ.get("SUPABASE_KEY") or "").strip()
    if not key:
        print("WARNING: SUPABASE_KEY is empty — enroll/attendance DB writes will fail.")
        return
    low = key.lower()
    if "publishable" in low or low.startswith("sb_publishable_"):
        print(
            "WARNING: SUPABASE_KEY looks like a publishable/anon client key. "
            "Use the Secret key (sb_secret_...) or legacy service_role JWT from "
            "Dashboard → Project Settings → API — not the publishable key."
        )
        return
    if low.startswith("sb_secret_"):
        return
    try:
        parts = key.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            pad = "=" * (-len(payload_b64) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload_b64 + pad))
            role = claims.get("role")
            if role == "anon":
                print(
                    "WARNING: SUPABASE_KEY JWT role is anon — RLS will block inserts. "
                    "Use service_role JWT or sb_secret_... from Project Settings → API."
                )
            elif role != "service_role":
                print(
                    f"WARNING: SUPABASE_KEY JWT role is {role!r}, not service_role. "
                    "Use service_role or sb_secret_... for this backend."
                )
    except Exception:
        pass


_warn_supabase_key_for_server_writes()


def _debug_enroll_images_enabled() -> bool:
    v = os.environ.get("DEBUG_ENROLL_IMAGES", "1").strip().lower()
    return v in ("1", "true", "yes", "on")


def _save_debug_enroll_image(student_id: str, image_bytes: bytes, original_name: str | None) -> pathlib.Path | None:
    if not _debug_enroll_images_enabled() or not image_bytes:
        return None
    DEBUG_ENROLL_DIR.mkdir(parents=True, exist_ok=True)
    ext = pathlib.Path(original_name or "upload.jpg").suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    safe_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in student_id[:40])
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    out = DEBUG_ENROLL_DIR / f"enroll_{stamp}_{safe_id}{ext}"
    out.write_bytes(image_bytes)
    return out


def _json_error(status_code: int, message: str, details: str | None = None) -> JSONResponse:
    body: dict = {"error": message}
    if details:
        body["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def _handle_api_error(exc: APIError, context: str) -> JSONResponse:
    parts: list[str] = []
    for name in ("message", "details", "hint", "code"):
        val = getattr(exc, name, None)
        if val:
            parts.append(f"{name}: {val}")
    if not parts:
        parts.append(str(exc))
    raw = " — ".join(parts)
    msg = (getattr(exc, "message", None) or "") + str(getattr(exc, "details", None) or "")
    if "row-level security" in msg.lower() or getattr(exc, "code", None) == "42501":
        raw += (
            " — Hint: in server/.env set SUPABASE_KEY to the Secret key (sb_secret_...) "
            "or legacy service_role JWT (Dashboard → Project Settings → API). "
            "Do not use the publishable/anon key. Restart uvicorn after saving .env."
        )
    out = _json_error(502, f"{context} failed.", details=raw)
    print(f"[supabase error] {context}: {raw}")
    return out


def _rgb_array_from_image_bytes(data: bytes) -> np.ndarray:
    """Apply EXIF orientation so pixels match what users see in most viewers."""
    im = Image.open(io.BytesIO(data))
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGB":
        im = im.convert("RGB")
    return np.asarray(im)


def _face_encodings_with_fallback(rgb: np.ndarray) -> list:
    """HOG face finder can miss small/distant faces; upsampling often fixes that."""
    enc = face_recognition.face_encodings(rgb)
    if enc:
        return enc

    for upsample in (2, 3):
        locs = face_recognition.face_locations(rgb, number_of_times_to_upsample=upsample)
        if locs:
            enc = face_recognition.face_encodings(rgb, locs)
            if enc:
                return enc

    if os.environ.get("FACE_CNN_FALLBACK", "").strip().lower() in ("1", "true", "yes", "on"):
        try:
            locs = face_recognition.face_locations(
                rgb, number_of_times_to_upsample=2, model="cnn"
            )
        except Exception:
            locs = []
        if locs:
            return face_recognition.face_encodings(rgb, locs)

    return []


async def _extract_face_embedding(file: UploadFile) -> list[float] | JSONResponse:
    await file.seek(0)
    try:
        data = await file.read()
        rgb = _rgb_array_from_image_bytes(data)
    except Exception as exc:
        return _json_error(400, "Could not decode image.", details=str(exc))

    face_encodings = _face_encodings_with_fallback(rgb)
    if len(face_encodings) == 0:
        return _json_error(400, "No face found in the photo.")

    embedding = [float(x) for x in face_encodings[0].tolist()]
    return embedding


@app.post("/enroll")
async def enroll_player(
    student_id: str = Form(...),
    file: UploadFile = File(...),
):
    await file.seek(0)
    raw_bytes = await file.read()
    saved = _save_debug_enroll_image(student_id, raw_bytes, file.filename)
    if saved is not None:
        print(f"[debug enroll] saved: {saved}")
    await file.seek(0)

    embedding = await _extract_face_embedding(file)
    if isinstance(embedding, JSONResponse):
        return embedding

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    payload = {
        "student_id": student_id.strip(),
        "face_embedding": embedding,
        "last_updated": now.isoformat(timespec="milliseconds"),
    }

    try:
        supabase.table("student_auth").upsert(
            payload,
            on_conflict="student_id",
        ).execute()
    except APIError as exc:
        return _handle_api_error(exc, "Saving face enrollment")

    return {"message": "Face initialized successfully"}


@app.post("/check-attendance")
async def check_attendance(
    student_id: str = Form(...),
    batch_id: str = Form(...),
    file: UploadFile = File(...),
):
    embedding = await _extract_face_embedding(file)
    if isinstance(embedding, JSONResponse):
        return embedding

    try:
        response = supabase.rpc(
            "match_face",
            {
                "query_embedding": embedding,
                "match_threshold": 0.6,
            },
        ).execute()
    except APIError as exc:
        return _handle_api_error(exc, "Face matching")

    if not response.data or len(response.data) == 0:
        return _json_error(404, "Face not recognized.")

    match = response.data[0]
    matched_id = str(match["student_id"]).lower()
    if matched_id != str(student_id).lower():
        return _json_error(
            403,
            "Face does not match the selected student.",
        )

    try:
        supabase.table("attendance").insert(
            {
                "student_id": match["student_id"],
                "batch_id": batch_id,
                "status": "Present",
            }
        ).execute()
    except APIError as exc:
        return _handle_api_error(exc, "Recording attendance")

    return {"message": "Attendance logged successfully."}


@app.post("/admin/coaches")
async def admin_create_coach(
    authorization: str = Header(...),
    login_id: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    temp_password: str = Form(...),
    is_admin: str = Form("false"),
):
    await _require_admin(authorization)

    login_id_norm = _normalize_login_id(login_id)
    login_err = _validate_login_id(login_id_norm)
    if login_err:
        return _json_error(400, login_err)
    if len(temp_password) < 8:
        return _json_error(400, "Temporary password must be at least 8 characters.")

    first_name = first_name.strip()
    last_name = last_name.strip()
    if not first_name or not last_name:
        return _json_error(400, "First and last name are required.")

    email = _login_id_to_email(login_id_norm)

    existing = (
        supabase.table("coaches")
        .select("coach_id")
        .eq("login_id", login_id_norm)
        .limit(1)
        .execute()
    )
    if existing.data:
        return _json_error(409, "A coach with this login ID already exists.")

    try:
        auth_resp = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": temp_password,
                "email_confirm": True,
                "user_metadata": {"login_id": login_id_norm},
            }
        )
    except Exception as exc:
        msg = str(exc)
        if "already been registered" in msg.lower() or "duplicate" in msg.lower():
            return _json_error(409, "Auth user for this coach ID already exists.")
        return _json_error(502, "Could not create auth user.", details=msg)

    auth_user_id = auth_resp.user.id
    if not auth_user_id:
        return _json_error(502, "Auth user created but ID was missing.")

    coach_row = {
        "auth_user_id": auth_user_id,
        "login_id": login_id_norm,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "status": "approved",
        "must_set_password": True,
        "is_admin": is_admin.strip().lower() in ("1", "true", "yes", "on"),
    }

    try:
        insert_resp = supabase.table("coaches").insert(coach_row).execute()
    except APIError as exc:
        try:
            supabase.auth.admin.delete_user(auth_user_id)
        except Exception:
            pass
        return _handle_api_error(exc, "Creating coach profile")

    coach_id = None
    if insert_resp.data and len(insert_resp.data) > 0:
        coach_id = insert_resp.data[0].get("coach_id")

    return {
        "message": "Coach account created. Share the coach ID and temporary password securely.",
        "login_id": login_id_norm,
        "coach_id": coach_id,
    }


@app.post("/admin/coaches/{login_id}/reset-password")
async def admin_reset_coach_password(
    login_id: str,
    authorization: str = Header(...),
    temp_password: str = Form(...),
):
    await _require_admin(authorization)

    login_id_norm = _normalize_login_id(login_id)
    if len(temp_password) < 8:
        return _json_error(400, "Temporary password must be at least 8 characters.")

    coach_resp = (
        supabase.table("coaches")
        .select("auth_user_id, login_id")
        .eq("login_id", login_id_norm)
        .limit(1)
        .execute()
    )
    coach = coach_resp.data[0] if coach_resp.data else None
    if not coach or not coach.get("auth_user_id"):
        return _json_error(404, "Coach not found.")

    auth_user_id = coach["auth_user_id"]
    try:
        supabase.auth.admin.update_user_by_id(
            auth_user_id,
            {"password": temp_password},
        )
        supabase.table("coaches").update({"must_set_password": True}).eq(
            "auth_user_id", auth_user_id
        ).execute()
    except Exception as exc:
        return _json_error(502, "Could not reset password.", details=str(exc))

    return {
        "message": "Password reset. Coach must set a new password on next login.",
        "login_id": login_id_norm,
    }


@app.get("/branches")
async def get_branches():
    response = supabase.table("branches").select("branch_id, branch_name").execute()

    print(f"Sending to App: {response.data}")

    return {"branches": response.data}


@app.get("/batches/{branch_id}")
async def get_batches(branch_id: str):
    response = (
        supabase.table("batches")
        .select("batch_id, batch_name, batch_schedule(day_of_week, start_time, end_time)")
        .eq("branch_id", branch_id)
        .execute()
    )

    return {"batches": response.data}


@app.get("/students/{batch_id}")
async def get_students_by_batch(batch_id: str):
    response = (
        supabase.table("batch_members")
        .select("student_id, students(first_name, last_name, status, parent_phone)")
        .eq("batch_id", batch_id)
        .execute()
    )

    if hasattr(response, "error") and response.error:
        print(f"Error: {response.error}")
        return {"students": [], "error": str(response.error)}

    return {"students": response.data}
