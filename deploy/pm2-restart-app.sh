#!/bin/bash
# Soft-reload helper: restart app without dropping PM2 process list integrity
set -euo pipefail
NAME="$1"
CWD="$2"
PORT="$3"
shift 3 || true

pm2 describe "$NAME" >/dev/null 2>&1 && pm2 delete "$NAME" >/dev/null 2>&1 || true
pm2 start npm --name "$NAME" --cwd "$CWD" -- start -- -p "$PORT" -H 127.0.0.1
pm2 save
