#!/usr/bin/env bash
# OWASP ZAP baseline against staging Face API.
# Usage: API_BASE_URL=https://your-api.fly.dev ./scripts/zap-baseline.sh
set -euo pipefail

API_BASE_URL="${API_BASE_URL:?Set API_BASE_URL to staging HTTPS origin (no trailing slash)}"
OUT_DIR="${OUT_DIR:-security-reports}"
mkdir -p "$OUT_DIR"

docker run --rm -v "$(pwd)/${OUT_DIR}:/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "${API_BASE_URL}" -r zap-baseline.html -J zap-baseline.json -I

echo "Reports written to ${OUT_DIR}/zap-baseline.html"
echo "Triage alerts into SECURITY_AUDIT.md (info leaks, missing headers, auth issues)."
