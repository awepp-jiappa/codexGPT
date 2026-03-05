#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="nas-gpt-chat"
DATA_DIR="${DATA_DIR:-./data}"
BACKUP_PATH="${1:-}"

if [[ -z "$BACKUP_PATH" ]]; then
  echo "usage: $0 <backup-path>" >&2
  exit 1
fi

if [[ ! -d "$BACKUP_PATH" ]]; then
  echo "[restore] backup path not found: $BACKUP_PATH" >&2
  exit 1
fi

if [[ ! -d "$DATA_DIR" ]]; then
  echo "[restore] data directory not found: $DATA_DIR" >&2
  exit 1
fi

docker stop "$CONTAINER_NAME" >/dev/null

SAFE_GUARD="$DATA_DIR/.restore-guard-$(date +%s)"
mkdir -p "$SAFE_GUARD"
if [[ ! -d "$SAFE_GUARD" ]]; then
  echo "[restore] safeguard failed" >&2
  exit 1
fi
rmdir "$SAFE_GUARD"

rm -rf "$DATA_DIR"
cp -a "$BACKUP_PATH" "$DATA_DIR"

docker start "$CONTAINER_NAME" >/dev/null

echo "[restore] restored from $BACKUP_PATH"
