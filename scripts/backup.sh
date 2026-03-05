#!/bin/sh
set -eu

print_usage() {
  cat <<'USAGE'
Usage: scripts/backup.sh [options]

Options:
  --compose-path <path>  docker compose file path (default: ./docker-compose.yml)
  --project-dir <path>   project root path (default: current directory)
  --data-dir <path>      host data directory (default: <project-dir>/data)
  --out-dir <path>       backup output directory (default: <project-dir>/backups)
  --rotate <N>           keep last N backups (default: 7, 0 disables deletion)
  --stop                 stop containers during backup
  --include-env          include .env in backup config set (default: excluded)
  --help                 show this help
USAGE
}

COMPOSE_PATH="./docker-compose.yml"
PROJECT_DIR="$(pwd)"
DATA_DIR=""
OUT_DIR=""
ROTATE="7"
STOP_CONTAINERS="0"
INCLUDE_ENV="0"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --compose-path) COMPOSE_PATH="$2"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --rotate) ROTATE="$2"; shift 2 ;;
    --stop) STOP_CONTAINERS="1"; shift ;;
    --include-env) INCLUDE_ENV="1"; shift ;;
    --help) print_usage; exit 0 ;;
    *) echo "[backup] unknown option: $1" >&2; print_usage >&2; exit 2 ;;
  esac
done

[ -n "$DATA_DIR" ] || DATA_DIR="$PROJECT_DIR/data"
[ -n "$OUT_DIR" ] || OUT_DIR="$PROJECT_DIR/backups"

if ! echo "$ROTATE" | grep -Eq '^[0-9]+$'; then
  echo "[backup] --rotate must be a non-negative integer" >&2
  exit 2
fi

OPS_NOTIFY="$PROJECT_DIR/scripts/ops/notify.sh"
notify_failure() {
  code=$?
  if [ "$code" -ne 0 ] && [ -x "$OPS_NOTIFY" ]; then
    "$OPS_NOTIFY" "backup_failed" "backup.sh failed with exit code $code" >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap notify_failure EXIT

if [ ! -d "$DATA_DIR" ]; then
  echo "[backup] data directory not found: $DATA_DIR" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$OUT_DIR/backup-$STAMP"
if [ -e "$TARGET" ]; then
  echo "[backup] target already exists: $TARGET" >&2
  exit 1
fi

if [ "$STOP_CONTAINERS" = "1" ]; then
  echo "[backup] stopping containers"
  docker compose -f "$COMPOSE_PATH" stop >/dev/null
fi

mkdir -p "$TARGET"
echo "[backup] copying data from $DATA_DIR"
cp -a "$DATA_DIR" "$TARGET/data"

mkdir -p "$TARGET/config"
for config in docker-compose.yml Dockerfile next.config.mjs package.json prisma/schema.prisma; do
  if [ -f "$PROJECT_DIR/$config" ]; then
    mkdir -p "$TARGET/config/$(dirname "$config")"
    cp "$PROJECT_DIR/$config" "$TARGET/config/$config"
  fi
done
if [ "$INCLUDE_ENV" = "1" ] && [ -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/.env" "$TARGET/config/.env"
fi

cat > "$TARGET/metadata.txt" <<META
timestamp=$STAMP
project_dir=$PROJECT_DIR
data_dir=$DATA_DIR
compose_path=$COMPOSE_PATH
META

if [ "$STOP_CONTAINERS" = "1" ]; then
  echo "[backup] starting containers"
  docker compose -f "$COMPOSE_PATH" start >/dev/null
fi

if [ "$ROTATE" -gt 0 ]; then
  backups=$(find "$OUT_DIR" -mindepth 1 -maxdepth 1 -type d -name 'backup-*' | sort)
  count=$(printf '%s\n' "$backups" | sed '/^$/d' | wc -l | tr -d ' ')
  if [ "$count" -gt "$ROTATE" ]; then
    remove_count=$((count - ROTATE))
    printf '%s\n' "$backups" | sed '/^$/d' | head -n "$remove_count" | while IFS= read -r old; do
      echo "[backup] removing old backup: $old"
      rm -rf "$old"
    done
  fi
fi

echo "[backup] success: $TARGET"
trap - EXIT
exit 0
