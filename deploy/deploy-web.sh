#!/bin/bash
set -euo pipefail

WEB_DIR=/var/www/daysrajasthan-web
WEB_PORT=3101
WEB_REPO_SSH=git@github.com:dimenfox70/travel-days-rajasthan.git
WEB_KEY=/opt/daysrajasthan/env/travel-days-deploy-key
BRANCH="${1:-main}"

export PATH="/usr/bin:$PATH"
export GIT_SSH_COMMAND="ssh -i ${WEB_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

if [[ ! -f "$WEB_KEY" ]]; then
  echo "Missing deploy key: $WEB_KEY"
  echo "Add the public key as a read-only Deploy Key on dimenfox70/travel-days-rajasthan"
  exit 1
fi

if [[ ! -d "$WEB_DIR/.git" ]]; then
  rm -rf "$WEB_DIR"
  git clone --branch "$BRANCH" "$WEB_REPO_SSH" "$WEB_DIR"
else
  cd "$WEB_DIR"
  git remote set-url origin "$WEB_REPO_SSH"
  git config --local core.sshCommand "ssh -i ${WEB_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  git config --local credential.helper ""
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

chown -R deploy:deploy "$WEB_DIR" 2>/dev/null || true

pm2 delete daysrajasthan-web >/dev/null 2>&1 || true
pm2 start npm --name daysrajasthan-web --cwd "$WEB_DIR" -- start -- -p "$WEB_PORT" -H 127.0.0.1
pm2 save
echo "WEB_DEPLOY_OK on port $WEB_PORT sha=$(git -C "$WEB_DIR" rev-parse --short HEAD)"
