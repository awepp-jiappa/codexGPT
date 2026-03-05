#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="nas-gpt-chat"
DATA_DIR="${DATA_DIR:-./data}"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
STOP_CONTAINER=false

if [[ "${1:-}" == "--stop-container" ]]; then
  STOP_CONTAINER=true
fi

if [[ ! -d "$DATA_DIR" ]]; then
  echo "[backup] data directory not found: $DATA_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_ROOT/data-backup-$STAMP"

if [[ -e "$TARGET" ]]; then
  echo "[backup] target already exists: $TARGET" >&2
  exit 1
fi

if $STOP_CONTAINER; then
  docker stop "$CONTAINER_NAME" >/dev/null
fi

cp -a "$DATA_DIR" "$TARGET"
echo "[backup] created: $TARGET"

if $STOP_CONTAINER; then
  docker start "$CONTAINER_NAME" >/dev/null
fi
