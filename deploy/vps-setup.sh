#!/bin/bash
set -euo pipefail

WEB_DIR=/var/www/daysrajasthan-web
ADMIN_DIR=/var/www/daysrajasthan-admin
WEB_PORT=3101
ADMIN_PORT=3102
WEB_REPO=https://github.com/dimenfox70/travel-days-rajasthan.git
ADMIN_REPO=https://github.com/meitswami/admin-daysrajasthan.git

mkdir -p /opt/daysrajasthan/{scripts,nginx,env,logs,backups}
mkdir -p "$WEB_DIR" "$ADMIN_DIR" /var/www/certbot

# Fix SSH hardening if incomplete
cat > /etc/ssh/sshd_config.d/99-hardening.conf << 'EOF'
Port 22
Port 4822
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
AllowUsers root deploy
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
DebianBanner no
EOF
sshd -t
systemctl disable --now ssh.socket 2>/dev/null || true
systemctl enable ssh.service
systemctl restart ssh

# Weekly security scan cron
cat > /etc/cron.weekly/daysrajasthan-security-scan << 'EOF'
#!/bin/bash
/usr/bin/rkhunter --update --nocolors >/opt/daysrajasthan/logs/rkhunter-update.log 2>&1 || true
/usr/bin/rkhunter --check --sk --nocolors >/opt/daysrajasthan/logs/rkhunter-$(date +%F).log 2>&1 || true
/usr/sbin/chkrootkit >/opt/daysrajasthan/logs/chkrootkit-$(date +%F).log 2>&1 || true
find /tmp /var/tmp /dev/shm -type f \( -iname 'manji*' -o -iname '*.x86' -o -iname 'kinsing*' -o -iname 'xmrig*' \) -delete 2>/dev/null || true
EOF
chmod +x /etc/cron.weekly/daysrajasthan-security-scan

# Ensure deploy user
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash -d /home/deploy deploy
usermod -aG www-data deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
if [[ -f /root/.ssh/authorized_keys ]]; then
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
fi

############################################
# Nginx site: main website
############################################
cat > /etc/nginx/sites-available/daysrajasthan-web.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name daysrajasthan.com www.daysrajasthan.com;

    client_max_body_size 20m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
EOF

############################################
# Nginx site: admin portal
############################################
cat > /etc/nginx/sites-available/daysrajasthan-admin.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name admin.daysrajasthan.com;

    client_max_body_size 30m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:${ADMIN_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90s;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/daysrajasthan-web.conf /etc/nginx/sites-enabled/daysrajasthan-web.conf
ln -sfn /etc/nginx/sites-available/daysrajasthan-admin.conf /etc/nginx/sites-enabled/daysrajasthan-admin.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx

############################################
# Deploy scripts
############################################
cat > /opt/daysrajasthan/scripts/deploy-web.sh << 'EOF'
#!/bin/bash
set -euo pipefail
WEB_DIR=/var/www/daysrajasthan-web
WEB_PORT=3101
WEB_REPO=https://github.com/dimenfox70/travel-days-rajasthan.git
BRANCH="${1:-main}"

export PATH="/usr/bin:$PATH"
cd /var/www

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

cat > /opt/daysrajasthan/env/web.env << EENV
PORT=${WEB_PORT}
NODE_ENV=production
HOSTNAME=127.0.0.1
EENV

chown -R deploy:deploy "$WEB_DIR"

pm2 delete daysrajasthan-web >/dev/null 2>&1 || true
pm2 start npm --name daysrajasthan-web --cwd "$WEB_DIR" -- start -- -p "$WEB_PORT" -H 127.0.0.1
pm2 save
echo "WEB_DEPLOY_OK on port $WEB_PORT"
EOF

cat > /opt/daysrajasthan/scripts/deploy-admin.sh << 'EOF'
#!/bin/bash
set -euo pipefail
ADMIN_DIR=/var/www/daysrajasthan-admin
ADMIN_PORT=3102
ADMIN_REPO="${ADMIN_REPO_URL:-https://github.com/meitswami/admin-daysrajasthan.git}"
BRANCH="${1:-main}"

export PATH="/usr/bin:$PATH"

if [[ ! -d "$ADMIN_DIR/.git" ]]; then
  rm -rf "$ADMIN_DIR"
  git clone --branch "$BRANCH" "$ADMIN_REPO" "$ADMIN_DIR"
else
  cd "$ADMIN_DIR"
  git fetch --all --prune
  git reset --hard "origin/$BRANCH"
fi

cd "$ADMIN_DIR"

# Preserve server env if present
if [[ -f /opt/daysrajasthan/env/admin.env ]]; then
  cp /opt/daysrajasthan/env/admin.env "$ADMIN_DIR/.env.local"
fi

npm ci || npm install
npm run build

chown -R deploy:deploy "$ADMIN_DIR"

pm2 delete daysrajasthan-admin >/dev/null 2>&1 || true
# Load env into process
set -a
[[ -f /opt/daysrajasthan/env/admin.env ]] && . /opt/daysrajasthan/env/admin.env
set +a
export PORT="$ADMIN_PORT"
export HOSTNAME=127.0.0.1
export NODE_ENV=production
pm2 start npm --name daysrajasthan-admin --cwd "$ADMIN_DIR" -- start -- -p "$ADMIN_PORT" -H 127.0.0.1
pm2 save
echo "ADMIN_DEPLOY_OK on port $ADMIN_PORT"
EOF

chmod +x /opt/daysrajasthan/scripts/*.sh

# PM2 boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root >/tmp/pm2-startup.txt || true
bash -c "$(grep -o 'sudo .*' /tmp/pm2-startup.txt | head -1)" 2>/dev/null || true

echo "SETUP_BASE_OK ports web=${WEB_PORT} admin=${ADMIN_PORT}"
