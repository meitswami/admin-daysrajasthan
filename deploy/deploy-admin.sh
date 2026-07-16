#!/bin/bash
set -euo pipefail

ADMIN_DIR=/var/www/daysrajasthan-admin
ADMIN_PORT=3102
ADMIN_REPO="${ADMIN_REPO_URL:-https://github.com/meitswami/admin-daysrajasthan.git}"
BRANCH="${1:-main}"
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

npm ci || npm install
npm run build
chown -R deploy:deploy "$ADMIN_DIR"

pm2 delete daysrajasthan-admin >/dev/null 2>&1 || true
set -a
[[ -f /opt/daysrajasthan/env/admin.env ]] && . /opt/daysrajasthan/env/admin.env
set +a
export PORT="$ADMIN_PORT"
export HOSTNAME=127.0.0.1
export NODE_ENV=production
pm2 start npm --name daysrajasthan-admin --cwd "$ADMIN_DIR" -- start -- -p "$ADMIN_PORT" -H 127.0.0.1
pm2 save
echo "ADMIN_DEPLOY_OK on port $ADMIN_PORT"
