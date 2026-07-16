#!/bin/bash
# Poll GitHub remotes and auto-deploy when HEAD changes.
# Safe to run from cron every minute.
set -euo pipefail

LOG=/opt/daysrajasthan/logs/poller.log
LOCKDIR=/opt/daysrajasthan/locks
STATE=/opt/daysrajasthan/env
mkdir -p "$LOCKDIR" "$(dirname "$LOG")"

# Avoid git dubious ownership failures under cron
git config --global --add safe.directory /var/www/daysrajasthan-admin >/dev/null 2>&1 || true
git config --global --add safe.directory /var/www/daysrajasthan-web >/dev/null 2>&1 || true
git config --global --add safe.directory '*' >/dev/null 2>&1 || true

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

run_if_changed() {
  local name="$1"
  local dir="$2"
  local branch="$3"
  local script="$4"
  local state_file="$STATE/last-sha-${name}"
  local lock="$LOCKDIR/deploy-${name}.lock"

  if [[ ! -d "$dir/.git" ]]; then
    log "SKIP $name: no git repo at $dir"
    return 0
  fi

  # Skip if deploy already running
  if [[ -f "$lock" ]]; then
    local pid
    pid="$(cat "$lock" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      log "SKIP $name: deploy in progress (pid $pid)"
      return 0
    fi
  fi

  cd "$dir"
  git fetch --quiet origin "$branch" 2>>"$LOG" || {
    log "WARN $name: git fetch failed"
    return 0
  }

  local remote_sha local_sha
  remote_sha="$(git rev-parse "origin/$branch")"
  local_sha="$(git rev-parse HEAD)"

  if [[ -f "$state_file" ]]; then
    local last
    last="$(tr -d '\r\n' < "$state_file")"
    if [[ "$remote_sha" == "$last" && "$remote_sha" == "$local_sha" ]]; then
      return 0
    fi
  else
    # First run: record current SHA without deploying
    printf '%s\n' "$local_sha" > "$state_file"
    log "INIT $name sha=$local_sha"
    return 0
  fi

  if [[ "$remote_sha" == "$local_sha" ]]; then
    printf '%s\n' "$remote_sha" > "$state_file"
    return 0
  fi

  log "CHANGE $name $local_sha -> $remote_sha — deploying"
  echo $$ > "$lock"
  if bash "$script" "$branch" >>"/opt/daysrajasthan/logs/deploy-${name}-poller.log" 2>&1; then
    printf '%s\n' "$remote_sha" > "$state_file"
    log "OK $name deployed $remote_sha"
  else
    log "FAIL $name deploy failed (see deploy-${name}-poller.log)"
  fi
  rm -f "$lock"
}

# Ensure credentials for private admin repo
if [[ -f /opt/daysrajasthan/env/github-token ]]; then
  TOKEN="$(tr -d '\r\n' < /opt/daysrajasthan/env/github-token)"
  git config --global credential.helper store
  printf 'https://x-access-token:%s@github.com\n' "$TOKEN" > /root/.git-credentials
  chmod 600 /root/.git-credentials
fi

run_if_changed "web"   /var/www/daysrajasthan-web   main   /opt/daysrajasthan/scripts/deploy-web.sh
run_if_changed "admin" /var/www/daysrajasthan-admin master /opt/daysrajasthan/scripts/deploy-admin.sh
