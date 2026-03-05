#!/bin/sh
set -eu

print_usage() {
  cat <<'USAGE'
Usage: scripts/ops/status.sh [--compose-path <path>] [--project-dir <path>] [--data-dir <path>] [--help]
USAGE
}

COMPOSE_PATH="./docker-compose.yml"
PROJECT_DIR="$(pwd)"
DATA_DIR=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --compose-path) COMPOSE_PATH="$2"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --help) print_usage; exit 0 ;;
    *) echo "[status] unknown option: $1" >&2; print_usage >&2; exit 2 ;;
  esac
done

[ -n "$DATA_DIR" ] || DATA_DIR="$PROJECT_DIR/data"
BACKUPS_DIR="$PROJECT_DIR/backups"

echo "== Container Status =="
docker compose -f "$COMPOSE_PATH" ps || true

echo "\n== Recent Logs (tail 40) =="
docker compose -f "$COMPOSE_PATH" logs --tail 40 || true

echo "\n== Data / DB Size =="
if [ -d "$DATA_DIR" ]; then
  du -sh "$DATA_DIR" 2>/dev/null || true
  find "$DATA_DIR" -maxdepth 1 -type f -name '*.db' -exec du -h {} \; 2>/dev/null || true
else
  echo "data directory not found: $DATA_DIR"
fi

echo "\n== Last Backup =="
if [ -d "$BACKUPS_DIR" ]; then
  latest=$(find "$BACKUPS_DIR" -mindepth 1 -maxdepth 1 -type d -name 'backup-*' | sort | tail -n 1)
  if [ -n "$latest" ]; then
    echo "$latest"
  else
    echo "no backups found"
  fi
else
  echo "backups directory not found: $BACKUPS_DIR"
fi
