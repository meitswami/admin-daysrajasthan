#!/bin/bash
set -euo pipefail

WEB_DIR=/var/www/daysrajasthan-web
WEB_PORT=3101
WEB_REPO=https://github.com/dimenfox70/travel-days-rajasthan.git
BRANCH="${1:-main}"

export PATH="/usr/bin:$PATH"

if [[ ! -d "$WEB_DIR/.git" ]]; then
  rm -rf "$WEB_DIR"
  git clone --branch "$BRANCH" "$WEB_REPO" "$WEB_DIR"
else
  cd "$WEB_DIR"
  git fetch --all --prune
  git reset --hard "origin/$BRANCH"
fi

cd "$WEB_DIR"
npm ci || npm install
npm run build

cat > /opt/daysrajasthan/env/web.env <<EENV
PORT=${WEB_PORT}
NODE_ENV=production
HOSTNAME=127.0.0.1
EENV

chown -R deploy:deploy "$WEB_DIR"

pm2 delete daysrajasthan-web >/dev/null 2>&1 || true
pm2 start npm --name daysrajasthan-web --cwd "$WEB_DIR" -- start -- -p "$WEB_PORT" -H 127.0.0.1
pm2 save
echo "WEB_DEPLOY_OK on port $WEB_PORT"
