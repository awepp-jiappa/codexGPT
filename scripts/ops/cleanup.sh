#!/bin/sh
set -eu

print_usage() {
  cat <<'USAGE'
Usage: scripts/ops/cleanup.sh [--base-url <url>] [--admin-token <token>] [--help]

Calls /api/admin/maintenance/cleanup with ADMIN_TASK_TOKEN bearer auth.
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
    *) echo "[cleanup] unknown option: $1" >&2; print_usage >&2; exit 2 ;;
  esac
done

if [ -z "$ADMIN_TOKEN" ]; then
  echo "[cleanup] ADMIN_TASK_TOKEN is required (env or --admin-token)" >&2
  exit 2
fi

if ! res=$(curl -fsS -X POST -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/admin/maintenance/cleanup"); then
  echo "[cleanup] cleanup request failed" >&2
  "$SCRIPT_DIR/notify.sh" "cleanup_failed" "cleanup endpoint failed at $BASE_URL/api/admin/maintenance/cleanup" >/dev/null 2>&1 || true
  exit 1
fi

deleted=$(printf '%s' "$res" | sed -n 's/.*"deleted"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n 1)
[ -n "$deleted" ] || deleted="unknown"

echo "[cleanup] success: deleted=$deleted"
echo "$res"
