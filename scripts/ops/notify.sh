#!/bin/sh
set -eu

print_usage() {
  cat <<'USAGE'
Usage: scripts/ops/notify.sh <event_type> <message>

Reads webhook URL from OPS_WEBHOOK_URL in environment.
If OPS_WEBHOOK_URL is unset, exits 0 without sending.
USAGE
}

if [ "${1:-}" = "--help" ]; then
  print_usage
  exit 0
fi

if [ "$#" -lt 2 ]; then
  print_usage
  exit 2
fi

EVENT_TYPE="$1"
MESSAGE="$2"
WEBHOOK_URL="${OPS_WEBHOOK_URL:-}"

if [ -z "$WEBHOOK_URL" ]; then
  echo "[notify] OPS_WEBHOOK_URL not set, skip"
  exit 0
fi

HOSTNAME_VALUE="$(hostname 2>/dev/null || echo unknown-host)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

payload=$(printf '{"event_type":"%s","timestamp":"%s","host":"%s","message":"%s"}' \
  "$EVENT_TYPE" "$TIMESTAMP" "$HOSTNAME_VALUE" "$(printf '%s' "$MESSAGE" | sed 's/"/\\"/g')")

curl -fsS -X POST -H 'Content-Type: application/json' -d "$payload" "$WEBHOOK_URL" >/dev/null
echo "[notify] sent: $EVENT_TYPE"
