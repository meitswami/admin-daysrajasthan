# Auto-deploy: push → GitHub → VPS (poller + optional webhook)

## How it works

1. **Poller (primary, already active)** — every minute the VPS checks both GitHub repos. If `origin` has a new commit, it runs the deploy script (git pull → npm install → build → PM2 restart).
2. **Webhook (instant, optional)** — GitHub can ping `https://admin.daysrajasthan.com/hooks/github` on every push for near-instant deploy.
3. **PM2** keeps `daysrajasthan-web` (port 3101), `daysrajasthan-admin` (port 3102), and `daysrajasthan-webhook` running across reboots.

## Your daily workflow

1. Edit in Cursor
2. Commit
3. Push to GitHub (`master` for admin, `main` for website)
4. Within ~1 minute the VPS deploys and goes live

## Optional: enable instant webhooks (GitHub UI)

### Admin repo (`meitswami/admin-daysrajasthan`)

1. Open https://github.com/meitswami/admin-daysrajasthan/settings/hooks/new
2. **Payload URL:** `https://admin.daysrajasthan.com/hooks/github`
3. **Content type:** `application/json`
4. **Secret:** value of `/opt/daysrajasthan/env/webhook-secret` on the VPS  
   (`ssh ... 'cat /opt/daysrajasthan/env/webhook-secret'`)
5. Events: **Just the push event**
6. Save

### Website repo (`dimenfox70/travel-days-rajasthan`)

Same settings on https://github.com/dimenfox70/travel-days-rajasthan/settings/hooks/new

## Manual deploy

```bash
bash /opt/daysrajasthan/scripts/deploy-web.sh main
bash /opt/daysrajasthan/scripts/deploy-admin.sh master
```

## Logs

```bash
tail -f /opt/daysrajasthan/logs/poller.log
tail -f /opt/daysrajasthan/logs/webhook.log
pm2 logs
```
