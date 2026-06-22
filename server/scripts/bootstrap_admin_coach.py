#!/usr/bin/env python3
"""One-time bootstrap: create first admin coach (login_id + temp password).

Usage (from server/ with .env configured):
  python scripts/bootstrap_admin_coach.py --login-id admin --password 'TempPass123!' --first-name Admin --last-name User

Requires SUPABASE_URL and SUPABASE_KEY (service role) in server/.env.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

_SERVER_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_SERVER_DIR / ".env")

DOMAIN = "login.mccc.internal"
_LOGIN_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]{3,32}$")


def main() -> int:
    parser = argparse.ArgumentParser(description="Bootstrap admin coach account")
    parser.add_argument("--login-id", required=True, help="Coach ID for login (e.g. admin)")
    parser.add_argument("--password", required=True, help="Temporary password (min 8 chars)")
    parser.add_argument("--first-name", default="Admin")
    parser.add_argument("--last-name", default="User")
    args = parser.parse_args()

    login_id = args.login_id.strip().lower()
    if len(args.password) < 8:
        print("Error: password must be at least 8 characters", file=sys.stderr)
        return 1
    if not _LOGIN_ID_RE.match(login_id):
        print("Error: invalid login-id format", file=sys.stderr)
        return 1

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("Error: set SUPABASE_URL and SUPABASE_KEY in server/.env", file=sys.stderr)
        return 1

    email = f"{login_id}@{DOMAIN}"
    sb = create_client(url, key)

    existing = sb.table("coaches").select("coach_id").eq("login_id", login_id).limit(1).execute()
    if existing.data:
        print(f"Coach with login_id={login_id!r} already exists.")
        return 0

    print(f"Creating auth user {email} ...")
    auth_resp = sb.auth.admin.create_user(
        {
            "email": email,
            "password": args.password,
            "email_confirm": True,
            "user_metadata": {"login_id": login_id},
        }
    )
    auth_user_id = auth_resp.user.id

    print("Inserting coaches row ...")
    sb.table("coaches").insert(
        {
            "auth_user_id": auth_user_id,
            "login_id": login_id,
            "email": email,
            "first_name": args.first_name.strip(),
            "last_name": args.last_name.strip(),
            "status": "approved",
            "must_set_password": True,
            "is_admin": True,
        }
    ).execute()

    print("Done.")
    print(f"  Coach ID: {login_id}")
    print(f"  Temp password: {args.password}")
    print("  Sign in on the app and set a new password on first login.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
