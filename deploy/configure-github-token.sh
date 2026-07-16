#!/bin/bash
set -euo pipefail

TOKEN_FILE=/opt/daysrajasthan/env/github-token

if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "Create $TOKEN_FILE with your GitHub fine-grained PAT (one line, no spaces)."
  echo "Required permission: Repository access -> meitswami/admin-daysrajasthan -> Contents: Read"
  exit 1
fi

TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
git config --global credential.helper store
printf 'https://x-access-token:%s@github.com\n' "$TOKEN" > /root/.git-credentials
chmod 600 /root/.git-credentials
echo "GitHub token configured for private clone/pull."
