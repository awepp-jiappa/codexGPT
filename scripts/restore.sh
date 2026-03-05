#!/bin/sh
set -eu

print_usage() {
  cat <<'USAGE'
Usage: scripts/restore.sh --backup-dir <path> [options]

Options:
  --backup-dir <path>    backup directory created by backup.sh (required)
  --compose-path <path>  docker compose file path (default: ./docker-compose.yml)
  --project-dir <path>   project root path (default: current directory)
  --data-dir <path>      host data directory (default: <project-dir>/data)
  --force                allow restore when containers are currently running
  --pre-snapshot         create backup snapshot before restore
  --help                 show this help
USAGE
}

COMPOSE_PATH="./docker-compose.yml"
PROJECT_DIR="$(pwd)"
DATA_DIR=""
BACKUP_DIR=""
FORCE="0"
PRE_SNAPSHOT="0"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --compose-path) COMPOSE_PATH="$2"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --force) FORCE="1"; shift ;;
    --pre-snapshot) PRE_SNAPSHOT="1"; shift ;;
    --help) print_usage; exit 0 ;;
    *) echo "[restore] unknown option: $1" >&2; print_usage >&2; exit 2 ;;
  esac
done

[ -n "$DATA_DIR" ] || DATA_DIR="$PROJECT_DIR/data"

if [ -z "$BACKUP_DIR" ]; then
  echo "[restore] --backup-dir is required" >&2
  print_usage >&2
  exit 2
fi
if [ ! -d "$BACKUP_DIR" ]; then
  echo "[restore] backup directory not found: $BACKUP_DIR" >&2
  exit 1
fi
if [ ! -d "$BACKUP_DIR/data" ]; then
  echo "[restore] invalid backup, missing data directory: $BACKUP_DIR/data" >&2
  exit 1
fi
if [ ! -d "$DATA_DIR" ]; then
  echo "[restore] data directory not found: $DATA_DIR" >&2
  exit 1
fi

running="0"
if docker compose -f "$COMPOSE_PATH" ps --status running 2>/dev/null | grep -q .; then
  running="1"
fi

if [ "$running" = "1" ] && [ "$FORCE" != "1" ]; then
  echo "[restore] containers are running. re-run with --force to continue." >&2
  exit 1
fi

if [ "$PRE_SNAPSHOT" = "1" ]; then
  SNAPSHOT_DIR="$PROJECT_DIR/backups/pre-restore-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$SNAPSHOT_DIR"
  echo "[restore] creating pre-restore snapshot: $SNAPSHOT_DIR"
  cp -a "$DATA_DIR" "$SNAPSHOT_DIR/data"
fi

if [ "$running" = "1" ]; then
  echo "[restore] stopping containers"
  docker compose -f "$COMPOSE_PATH" stop >/dev/null
fi

tmp_target="$DATA_DIR.restore-tmp-$(date +%s)"
cp -a "$BACKUP_DIR/data" "$tmp_target"
rm -rf "$DATA_DIR"
mv "$tmp_target" "$DATA_DIR"

if [ "$running" = "1" ]; then
  echo "[restore] starting containers"
  docker compose -f "$COMPOSE_PATH" start >/dev/null
fi

echo "[restore] success: restored from $BACKUP_DIR"
