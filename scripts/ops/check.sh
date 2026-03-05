#!/bin/sh
set -eu

print_usage() {
  cat <<'USAGE'
Usage: scripts/ops/check.sh [--base-url <url>] [--admin-token <token>] [--help]

Checks /health and optionally /metrics when admin token is provided.
USAGE
}

BASE_URL="${APP_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TASK_TOKEN:-}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --base-url) BASE_URL="$2"; shift 2 ;;
    --admin-token) ADMIN_TOKEN="$2"; shift 2 ;;
    --help) print_usage; exit 0 ;;
    *) echo "[check] unknown option: $1" >&2; print_usage >&2; exit 2 ;;
  esac
done

if ! health=$(curl -fsS "$BASE_URL/health"); then
  echo "[check] health check failed" >&2
  "$SCRIPT_DIR/notify.sh" "health_check_failed" "health endpoint failed at $BASE_URL/health" >/dev/null 2>&1 || true
  exit 1
fi

echo "[check] /health ok"
echo "$health"

if [ -n "$ADMIN_TOKEN" ]; then
  if metrics=$(curl -fsS -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/metrics"); then
    echo "[check] /metrics ok"
    echo "$metrics"
  else
    echo "[check] /metrics failed" >&2
    "$SCRIPT_DIR/notify.sh" "metrics_check_failed" "metrics endpoint failed at $BASE_URL/metrics" >/dev/null 2>&1 || true
    exit 1
  fi
fi
