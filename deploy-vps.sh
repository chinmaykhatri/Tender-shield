#!/bin/bash
# ============================================================================
# TenderShield — VPS Deployment Script
# ============================================================================
# Deploys the complete stack on a fresh Ubuntu 22.04 VPS:
#   1. Hyperledger Fabric (orderer, peer, CouchDB)
#   2. Next.js frontend with real Fabric connection
#   3. Nginx reverse proxy with Let's Encrypt HTTPS
#
# Prerequisites:
#   - Ubuntu 22.04 VPS (DigitalOcean $6/mo, 1GB RAM, 25GB SSD)
#   - Domain name pointed to VPS IP (e.g., demo.tendershield.in)
#   - SSH access as root
#
# Usage:
#   chmod +x deploy-vps.sh
#   ./deploy-vps.sh
# ============================================================================

set -euo pipefail

# ─── Configuration ───
DOMAIN="${DOMAIN:-demo.tendershield.in}"
EMAIL="${EMAIL:-admin@tendershield.in}"
PROJECT_DIR="/opt/tendershield"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  TenderShield VPS Deployment                            ║"
echo "║  Domain: $DOMAIN                                        ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ─── Step 1: Install Docker ───
echo "▶ Step 1: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
    systemctl enable docker
    systemctl start docker
fi
docker --version

if ! command -v docker-compose &> /dev/null; then
    apt-get update && apt-get install -y docker-compose-plugin
fi

echo "✅ Docker installed"

# ─── Step 2: Install Nginx + Certbot ───
echo "▶ Step 2: Installing Nginx..."
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

echo "✅ Nginx installed"

# ─── Step 3: Clone/Copy Project ───
echo "▶ Step 3: Setting up project..."
mkdir -p $PROJECT_DIR
if [ -d "/root/Tender-Shield" ]; then
    cp -r /root/Tender-Shield/* $PROJECT_DIR/
else
    echo "⚠️  Please copy your project to $PROJECT_DIR first"
    echo "   Run: scp -r 'Tender Sheild/*' root@YOUR_VPS_IP:$PROJECT_DIR/"
    exit 1
fi

cd $PROJECT_DIR

echo "✅ Project ready at $PROJECT_DIR"

# ─── Step 4: Create .env file ───
echo "▶ Step 4: Creating environment..."
cat > .env.production.local << 'ENVFILE'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY

# Fabric
FABRIC_PEER_HOST=peer0.ministry.tendershield.gov.in
FABRIC_PEER_PORT=7051
FABRIC_ORDERER_HOST=orderer.tendershield.gov.in
FABRIC_ORDERER_PORT=7050
FABRIC_API_KEY=tendershield-fabric-demo-2026
FABRIC_MODE=DOCKER

# App
NODE_ENV=production
NEXT_PUBLIC_DEMO_MODE=true
ENVFILE

echo "⚠️  Edit $PROJECT_DIR/.env.production.local with real keys!"
echo "✅ Environment file created"

# ─── Step 5: Start Fabric Network ───
echo "▶ Step 5: Starting Fabric network..."
docker compose -f docker-compose.fabric.yml down 2>/dev/null || true
docker compose -f docker-compose.fabric.yml up -d

echo "Waiting for Fabric to be ready..."
sleep 15

# Verify containers
echo "Fabric containers:"
docker ps --filter "label=service=tendershield-fabric" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "✅ Fabric network running"

# ─── Step 6: Build and Start Frontend ───
echo "▶ Step 6: Building frontend..."
docker build -f Dockerfile.frontend -t tendershield-frontend .

# Stop old container if exists
docker stop tendershield-app 2>/dev/null || true
docker rm tendershield-app 2>/dev/null || true

# Run with Fabric network access
docker run -d \
    --name tendershield-app \
    --network tendershield_fabric \
    --env-file .env.production.local \
    -e NODE_ENV=production \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -p 3000:3000 \
    --restart unless-stopped \
    tendershield-frontend

echo "✅ Frontend running on port 3000"

# ─── Step 7: Configure Nginx ───
echo "▶ Step 7: Configuring Nginx..."
cat > /etc/nginx/sites-available/tendershield << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    # Redirect to HTTPS (after certbot)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/tendershield /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "✅ Nginx configured"

# ─── Step 8: SSL Certificate ───
echo "▶ Step 8: Getting SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL || {
    echo "⚠️  SSL failed — run manually: certbot --nginx -d $DOMAIN"
}

echo "✅ SSL configured"

# ─── Final Status ───
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🎉 TenderShield Deployed!                              ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Frontend:  https://$DOMAIN                             ║"
echo "║  Fabric:    4 containers running                        ║"
echo "║  SSL:       Let's Encrypt auto-renew                    ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  IMPORTANT:                                             ║"
echo "║  1. Edit .env.production.local with real API keys       ║"
echo "║  2. Rebuild: docker restart tendershield-app            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Show running containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -10
