#!/bin/bash
set -euo pipefail

echo "=== SUSPICIOUS PROCESSES ==="
ps aux | grep -Ei 'manji|xmrig|kinsing|kdevtmp|\.x86' | grep -v grep || echo none

echo "=== LISTEN ==="
ss -tlnp

echo "=== TMP PATTERNS ==="
find /tmp /var/tmp /dev/shm -type f \( -iname 'manji*' -o -iname '*.x86' -o -iname 'xmrig*' -o -iname 'kinsing*' \) 2>/dev/null || echo none

echo "=== PHP/ELF IN WEB ==="
find /var/www/daysrajasthan-web /var/www/daysrajasthan-admin -type f \( -name '*.php' -o -name '*.elf' -o -name '*.x86' \) 2>/dev/null | head -20 || echo none

echo "=== WORLD WRITABLE WWW DIRS ==="
find /var/www -type d -perm -0002 2>/dev/null | head -20 || echo none

echo "=== CRON ==="
ls /etc/cron.d/
cat /etc/cron.d/daysrajasthan-autodeploy 2>/dev/null || true

echo "=== CLAMAV ==="
clamscan -r --infected --bell /var/www/daysrajasthan-web/public /var/www/daysrajasthan-admin/public 2>/dev/null | tail -20 || true

echo "=== HOMEPAGE HAS IFRAME/EVAL ==="
curl -skL --resolve daysrajasthan.com:443:127.0.0.1 https://daysrajasthan.com/ -o /tmp/home.html
wc -c /tmp/home.html
grep -oE '<(script|iframe)[^>]*>' /tmp/home.html | head -20 || true
grep -cE 'eval\(|atob\(|coinhive|cryptonight|xmrig' /tmp/home.html || true

echo "=== EXPOSED PATHS ==="
for p in /.env /.git/config /package.json /node_modules/ /.next/ /wp-admin/ /phpmyadmin/; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve daysrajasthan.com:443:127.0.0.1 "https://daysrajasthan.com$p")
  echo "web $p -> $code"
done
for p in /.env /.git/config /package.json /hooks/github/health; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --resolve admin.daysrajasthan.com:443:127.0.0.1 "https://admin.daysrajasthan.com$p")
  echo "admin $p -> $code"
done

echo "=== PM2 ==="
pm2 jlist | python3 -c 'import sys,json; d=json.load(sys.stdin); print("\n".join(f"{x[\"name\"]} {x[\"pm2_env\"][\"status\"]}" for x in d))'

echo SCAN_DONE
