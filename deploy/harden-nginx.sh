#!/bin/bash
set -euo pipefail

cat > /tmp/nginx-deny-snippet.conf <<'EOF'
    location ~* /(node_modules|\.next|\.git|\.env|package(-lock)?\.json) {
        deny all;
        return 404;
    }
EOF

for f in /etc/nginx/sites-available/daysrajasthan-web.conf /etc/nginx/sites-available/daysrajasthan-admin.conf; do
  if grep -q 'location ~\* /(node_modules' "$f"; then
    echo "already $f"
    continue
  fi
  awk '
    /location \/ \{/ && !done {
      while ((getline line < "/tmp/nginx-deny-snippet.conf") > 0) print line
      close("/tmp/nginx-deny-snippet.conf")
      done=1
    }
    { print }
  ' "$f" > /tmp/ngxnew && mv /tmp/ngxnew "$f"
  echo "patched $f"
done

nginx -t
systemctl reload nginx

for p in /node_modules/ /.next/ /.git/config /.env; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" --resolve daysrajasthan.com:443:127.0.0.1 "https://daysrajasthan.com$p")
  echo "web $p -> $code"
done

echo HARDEN_OK
