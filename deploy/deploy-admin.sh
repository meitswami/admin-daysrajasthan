#!/bin/bash
set -euo pipefail

ADMIN_DIR=/var/www/daysrajasthan-admin
ADMIN_PORT=3102
ADMIN_REPO="${ADMIN_REPO_URL:-https://github.com/meitswami/admin-daysrajasthan.git}"
BRANCH="${1:-master}"
TOKEN_FILE=/opt/daysrajasthan/env/github-token

export PATH="/usr/bin:$PATH"

if [[ -f "$TOKEN_FILE" ]]; then
  TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
  git config --global credential.helper store
  printf 'https://x-access-token:%s@github.com\n' "$TOKEN" > /root/.git-credentials
  chmod 600 /root/.git-credentials
fi

if [[ ! -d "$ADMIN_DIR/.git" ]]; then
  rm -rf "$ADMIN_DIR"
  git clone --branch "$BRANCH" "$ADMIN_REPO" "$ADMIN_DIR"
else
  cd "$ADMIN_DIR"
  git fetch --all --prune
  git reset --hard "origin/$BRANCH"
fi

cd "$ADMIN_DIR"

if [[ -f /opt/daysrajasthan/env/admin.env ]]; then
  cp /opt/daysrajasthan/env/admin.env "$ADMIN_DIR/.env.local"
fi

# Stop the running app first — open file handles in node_modules cause
# intermittent "Directory not empty" / ENOTEMPTY failures during rm/npm.
pm2 stop daysrajasthan-admin >/dev/null 2>&1 || true
pm2 delete daysrajasthan-admin >/dev/null 2>&1 || true
sleep 1

# Prefer rename+delete over in-place rm -rf (more reliable on busy disks).
remove_tree() {
  local target="$1"
  [[ -e "$target" ]] || return 0
  local trash="${target}.__trash_$$"
  mv "$target" "$trash"
  # Best-effort cleanup; never block deploy if trash delete is flaky.
  chmod -R u+w "$trash" 2>/dev/null || true
  rm -rf "$trash" 2>/dev/null || true
  if [[ -e "$trash" ]]; then
    find "$trash" -mindepth 1 -delete 2>/dev/null || true
    rm -rf "$trash" 2>/dev/null || true
  fi
  # Last resort: leave trash aside so npm can still install into a fresh path.
  if [[ -e "$trash" ]]; then
    echo "WARN: could not fully delete $trash — leaving for later cleanup" >&2
  fi
}

remove_tree node_modules
# Clear any leftover trash dirs from prior failed deploys.
for d in node_modules.__trash_*; do
  [[ -e "$d" ]] || continue
  remove_tree "$d"
done

npm ci || npm install

# Keep previous build until the new one succeeds (failed builds must not wipe production).
remove_tree .next.prev
if [[ -d .next ]]; then
  mv .next .next.prev
fi

if ! npm run build; then
  echo "ADMIN_BUILD_FAILED — restoring previous .next" >&2
  remove_tree .next
  if [[ -d .next.prev ]]; then
    mv .next.prev .next
  fi
  exit 1
fi

remove_tree .next.prev
chown -R deploy:deploy "$ADMIN_DIR"

set -a
[[ -f /opt/daysrajasthan/env/admin.env ]] && . /opt/daysrajasthan/env/admin.env
set +a
export PORT="$ADMIN_PORT"
export HOSTNAME=127.0.0.1
export NODE_ENV=production
pm2 start npm --name daysrajasthan-admin --cwd "$ADMIN_DIR" -- start -- -p "$ADMIN_PORT" -H 127.0.0.1
pm2 save
echo "ADMIN_DEPLOY_OK on port $ADMIN_PORT"
