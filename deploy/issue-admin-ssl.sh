#!/bin/bash
set -euo pipefail

# Run after DNS A record for admin.daysrajasthan.com -> VPS IP propagates
certbot --nginx \
  -d admin.daysrajasthan.com \
  --non-interactive \
  --agree-tos \
  --email admin@daysrajasthan.com \
  --redirect

nginx -t
systemctl reload nginx
echo "HTTPS enabled for https://admin.daysrajasthan.com"
