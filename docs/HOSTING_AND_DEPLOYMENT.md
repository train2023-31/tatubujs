# Tatubu School Management System — Hosting & Deployment Guide

> **Version:** 1.0 | **Date:** February 2026

---

## Table of Contents

1. [Deployment Overview](#1-deployment-overview)
2. [Infrastructure Requirements](#2-infrastructure-requirements)
3. [Recommended Hosting Options](#3-recommended-hosting-options)
4. [VPS / Dedicated Server Setup](#4-vps--dedicated-server-setup)
5. [Docker Deployment (Evolution API)](#5-docker-deployment-evolution-api)
6. [Flask Backend Deployment](#6-flask-backend-deployment)
7. [React Frontend Deployment](#7-react-frontend-deployment)
8. [Database Setup (MySQL)](#8-database-setup-mysql)
9. [Redis Setup](#9-redis-setup)
10. [HTTPS / SSL Configuration](#10-https--ssl-configuration)
11. [Environment Variables Reference](#11-environment-variables-reference)
12. [Nginx Configuration](#12-nginx-configuration)
13. [Process Management (Systemd)](#13-process-management-systemd)
14. [Monitoring & Logging](#14-monitoring--logging)
15. [Backup Strategy](#15-backup-strategy)
16. [Scaling Strategy](#16-scaling-strategy)
17. [Quick Deployment Checklist](#17-quick-deployment-checklist)

---

## 1. Deployment Overview

Tatubu consists of three deployable services:

| Service | Technology | Port | Notes |
|---|---|---|---|
| **Flask API** | Python / Gunicorn | 5000 (internal) | Main backend |
| **React Frontend** | Static files | Served by Nginx | PWA, no server needed at runtime |
| **Evolution API** | Node.js / Docker | 8080 (internal) | Optional WhatsApp service |

**Production Architecture:**

```
Internet
    │
    ▼
[Cloudflare DNS / CDN]  (optional but recommended)
    │
    ▼
[Nginx Reverse Proxy]  ← port 80/443
    ├── /api/*          → Flask :5000
    ├── /evolution/*    → Evolution API :8080
    └── /*              → React build (static files)

[MySQL Server]  ← port 3306 (internal network only)
[Redis Server]  ← port 6379 (internal network only)
[Evolution API] ← Docker container
```

---

## 2. Infrastructure Requirements

### Minimum Requirements (Single School, < 500 students)

| Component | Specification |
|---|---|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Storage | 40 GB SSD |
| OS | Ubuntu 22.04 LTS |
| Bandwidth | 100 Mbps |

### Recommended (Multi-School, < 5000 students)

| Component | Specification |
|---|---|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Storage | 80 GB SSD |
| OS | Ubuntu 22.04 LTS |
| Bandwidth | 200 Mbps |

### Software Prerequisites

| Software | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Flask backend |
| Node.js | 18+ | Evolution API |
| MySQL | 8.0+ | Primary database |
| Redis | 7.0+ | Rate limiting / cache |
| Nginx | 1.24+ | Reverse proxy |
| Docker | 24+ | Evolution API container |
| Docker Compose | 2.x | Container orchestration |
| Certbot | Latest | SSL certificates |

---

## 3. Recommended Hosting Options

### Option A: VPS (Best for Full Control)

| Provider | Region | Plan | Monthly Cost (est.) |
|---|---|---|---|
| **DigitalOcean** | SGP1 (Singapore, closest to Oman) | 4 GB / 2 CPU Droplet | ~$24/mo |
| **Vultr** | Dubai / Bahrain | 4 GB / 2 CPU | ~$24/mo |
| **Linode (Akamai)** | Mumbai | 4 GB / 2 CPU | ~$24/mo |
| **Hetzner** | Helsinki / Frankfurt | CX21 (4 GB) | ~$6/mo |
| **AWS EC2** | me-south-1 (Bahrain) | t3.medium | ~$35/mo |
| **Azure** | UAE North | B2s | ~$38/mo |

> **Recommendation for Oman schools**: Vultr Bahrain or AWS Bahrain for lowest latency.

### Option B: Managed Platform (Easier Management)

| Service | What It Hosts | Notes |
|---|---|---|
| **Railway** | Flask API + MySQL | Automatic deploys from Git |
| **Render** | Flask API | Free tier available (with limitations) |
| **PlanetScale** | MySQL only | Serverless MySQL, generous free tier |
| **Vercel / Netlify** | React Frontend only | Static hosting, CDN-backed |
| **Fly.io** | Flask + Docker containers | Global edge deployment |

### Option C: On-Premise (School Network)

Suitable if the school has an on-site server room:
- Install Ubuntu Server 22.04 on physical/virtual server
- Follow VPS setup steps below
- Set up dynamic DNS (e.g. Cloudflare Tunnel) for external access
- Ensure UPS backup power

---

## 4. VPS / Dedicated Server Setup

### 4.1 Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y \
  python3 python3-pip python3-venv \
  nginx \
  mysql-server \
  redis-server \
  git \
  curl \
  certbot python3-certbot-nginx \
  ufw

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
```

### 4.2 Firewall Setup

```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw deny 3306    # MySQL - internal only
sudo ufw deny 6379    # Redis - internal only
sudo ufw deny 5000    # Flask - proxied via Nginx
sudo ufw deny 8080    # Evolution API - proxied via Nginx
sudo ufw enable
sudo ufw status
```

### 4.3 Create Application User

```bash
# Create dedicated app user (don't run as root)
sudo adduser tatubu
sudo usermod -aG sudo tatubu
su - tatubu
```

---

## 5. Docker Deployment (Evolution API)

### 5.1 Directory Setup

```bash
cd /home/tatubu
git clone <repository-url> tatubujs
cd tatubujs/evolution-api
```

### 5.2 Configure Environment

```bash
cp .env.example .env
nano .env
```

Key settings in `evolution-api/.env`:

```env
# Server
SERVER_URL=https://your-domain.com/evolution
SERVER_PORT=8080

# Authentication
AUTHENTICATION_API_KEY=your_super_secret_key_here

# Database (choose one)
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://evo_user:evo_pass@localhost:5432/evolution_db

# Redis
CACHE_REDIS_URI=redis://localhost:6379/1
CACHE_REDIS_ENABLED=true

# Storage
STORE_MESSAGES=true
STORE_MESSAGE_UP=true
STORE_CONTACTS=true

# Logging
LOG_LEVEL=ERROR
LOG_COLOR=true
```

### 5.3 Start Evolution API

```bash
# Use the provided docker-compose file
docker compose -f docker-compose-tatubu.yml up -d

# Verify containers are running
docker compose -f docker-compose-tatubu.yml ps

# View logs
docker compose -f docker-compose-tatubu.yml logs -f evolution-api
```

### 5.4 `docker-compose-tatubu.yml` Reference

```yaml
version: '3.8'
services:
  evolution-api:
    image: evoapicloud/evolution-api:latest
    container_name: evolution_api
    ports:
      - "8080:8080"
    env_file:
      - .env
    volumes:
      - evolution_instances:/evolution/instances
    restart: unless-stopped
    networks:
      - tatubu-net

  evolution-manager:
    image: evoapicloud/evolution-manager:latest
    container_name: evolution_manager
    ports:
      - "4000:4000"
    environment:
      - EVOLUTION_API_URL=http://evolution-api:8080
      - EVOLUTION_API_KEY=${AUTHENTICATION_API_KEY}
    depends_on:
      - evolution-api
    restart: unless-stopped
    networks:
      - tatubu-net

  redis:
    image: redis:7-alpine
    container_name: evolution_redis
    restart: unless-stopped
    networks:
      - tatubu-net

volumes:
  evolution_instances:

networks:
  tatubu-net:
    driver: bridge
```

---

## 6. Flask Backend Deployment

### 6.1 Setup Python Environment

```bash
cd /home/tatubu/tatubujs/back

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn  # production WSGI server
```

### 6.2 Configure Environment

```bash
cp .env.example .env
nano .env
```

`back/.env` contents:

```env
# Flask
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your_very_long_random_secret_key_here

# Database
DATABASE_URL=mysql+pymysql://tatubu_user:db_password@localhost:3306/tatubu_db

# JWT
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Redis (rate limiting)
REDIS_URL=redis://localhost:6379/0

# Web Push (VAPID)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_CLAIM_EMAIL=admin@your-domain.com

# CORS
CORS_ORIGINS=https://your-domain.com
```

**Generate VAPID keys:**
```bash
pip install py-vapid
vapid --gen
# Copy the generated public and private keys to .env
```

### 6.3 Initialize Database

```bash
cd /home/tatubu/tatubujs/back
source venv/bin/activate

# Run migrations
flask db upgrade

# (Optional) Create initial admin user
flask shell
>>> from app import db
>>> from app.models import User
>>> # Create admin user via app logic
```

### 6.4 Test with Gunicorn

```bash
cd /home/tatubu/tatubujs/back
source venv/bin/activate

gunicorn --workers 4 --bind 0.0.0.0:5000 "app:create_app()"
```

---

## 7. React Frontend Deployment

### 7.1 Build the Frontend

```bash
cd /home/tatubu/tatubujs/frontend

# Install dependencies
npm install

# Configure production environment
cat > .env.production << EOF
REACT_APP_API_URL=https://your-domain.com
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key_here
EOF

# Build production bundle
npm run build
```

### 7.2 Deploy Static Files

```bash
# Copy build output to Nginx web root
sudo mkdir -p /var/www/tatubu
sudo cp -r build/* /var/www/tatubu/
sudo chown -R www-data:www-data /var/www/tatubu
```

> The React build is entirely static (HTML/CSS/JS). No Node.js server is needed in production.

---

## 8. Database Setup (MySQL)

### 8.1 Secure MySQL Installation

```bash
sudo mysql_secure_installation
# Follow prompts: set root password, remove anonymous users, disable remote root login
```

### 8.2 Create Database and User

```sql
-- Connect as root
sudo mysql -u root -p

-- Create database
CREATE DATABASE tatubu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER 'tatubu_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON tatubu_db.* TO 'tatubu_user'@'localhost';

-- For Evolution API (if using MySQL instead of PostgreSQL)
CREATE DATABASE evolution_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'evo_user'@'localhost' IDENTIFIED BY 'evo_password_here';
GRANT ALL PRIVILEGES ON evolution_db.* TO 'evo_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### 8.3 MySQL Performance Tuning

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# InnoDB settings
innodb_buffer_pool_size = 1G       # Set to ~50-70% of RAM
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2  # Better performance, slight durability tradeoff

# Connection settings
max_connections = 200
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

```bash
sudo systemctl restart mysql
```

---

## 9. Redis Setup

```bash
# Edit Redis config for security
sudo nano /etc/redis/redis.conf
```

Key settings:
```conf
# Bind to localhost only (security)
bind 127.0.0.1

# Set password (optional but recommended)
requirepass your_redis_password_here

# Max memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
```

```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
# Expected: PONG
```

---

## 10. HTTPS / SSL Configuration

### 10.1 Obtain SSL Certificate (Let's Encrypt)

```bash
# Ensure your domain's DNS A record points to your server IP
# Then obtain certificate:

sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is set up via systemd timer automatically
```

### 10.2 Self-Signed Certificate (for testing)

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/tatubu.key \
    -out /etc/ssl/certs/tatubu.crt \
    -subj "/C=OM/ST=Muscat/L=Muscat/O=Tatubu/CN=your-domain.com"
```

> **Note**: PWA push notifications require a valid trusted SSL certificate in production. Self-signed certs work for local testing only.

---

## 11. Environment Variables Reference

### Flask Backend (`back/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `FLASK_ENV` | Yes | `production` or `development` | `production` |
| `FLASK_DEBUG` | Yes | Enable debug mode | `False` |
| `SECRET_KEY` | Yes | Flask secret key (random 64 chars) | `abc123...` |
| `DATABASE_URL` | Yes | MySQL connection string | `mysql+pymysql://user:pass@host/db` |
| `JWT_SECRET_KEY` | Yes | JWT signing key | `jwt_secret_...` |
| `JWT_ACCESS_TOKEN_EXPIRES` | No | Seconds (default 3600) | `3600` |
| `JWT_REFRESH_TOKEN_EXPIRES` | No | Seconds (default 2592000) | `2592000` |
| `REDIS_URL` | Yes | Redis connection string | `redis://localhost:6379/0` |
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key for push | `BNcR...` |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key (keep secret) | `xyzA...` |
| `VAPID_CLAIM_EMAIL` | Yes | mailto for VAPID | `admin@school.edu.om` |
| `CORS_ORIGINS` | Yes | Allowed CORS origins | `https://school.edu.om` |

### Frontend (`frontend/.env.production`)

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_API_URL` | Yes | Backend API base URL |
| `REACT_APP_VAPID_PUBLIC_KEY` | Yes | VAPID public key (same as backend) |

### Evolution API (`evolution-api/.env`)

| Variable | Required | Description |
|---|---|---|
| `SERVER_URL` | Yes | Public URL of Evolution API |
| `SERVER_PORT` | Yes | Internal port (8080) |
| `AUTHENTICATION_API_KEY` | Yes | Master API key |
| `DATABASE_URL` | Yes | PostgreSQL or MySQL URL |
| `CACHE_REDIS_URI` | Yes | Redis URL |

---

## 12. Nginx Configuration

### `/etc/nginx/sites-available/tatubu`

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # React frontend (static files)
    root /var/www/tatubu;
    index index.html;

    # Service Worker — no cache (critical for PWA updates)
    location = /service-worker.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    # Static assets — long cache
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Flask API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        client_max_body_size 50M;
    }

    # Evolution API proxy
    location /evolution/ {
        rewrite ^/evolution/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # React Router — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tatubu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 13. Process Management (Systemd)

### 13.1 Flask API Service

Create `/etc/systemd/system/tatubu-api.service`:

```ini
[Unit]
Description=Tatubu Flask API
After=network.target mysql.service redis.service
Requires=mysql.service redis.service

[Service]
User=tatubu
Group=tatubu
WorkingDirectory=/home/tatubu/tatubujs/back
Environment=PATH=/home/tatubu/tatubujs/back/venv/bin
EnvironmentFile=/home/tatubu/tatubujs/back/.env
ExecStart=/home/tatubu/tatubujs/back/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind 127.0.0.1:5000 \
    --timeout 120 \
    --access-logfile /var/log/tatubu/api-access.log \
    --error-logfile /var/log/tatubu/api-error.log \
    "app:create_app()"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Create log directory
sudo mkdir -p /var/log/tatubu
sudo chown tatubu:tatubu /var/log/tatubu

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable tatubu-api
sudo systemctl start tatubu-api
sudo systemctl status tatubu-api
```

### 13.2 Evolution API (via Docker Compose)

Create `/etc/systemd/system/tatubu-evolution.service`:

```ini
[Unit]
Description=Tatubu Evolution API (WhatsApp)
After=docker.service
Requires=docker.service

[Service]
User=tatubu
WorkingDirectory=/home/tatubu/tatubujs/evolution-api
ExecStart=docker compose -f docker-compose-tatubu.yml up
ExecStop=docker compose -f docker-compose-tatubu.yml down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable tatubu-evolution
sudo systemctl start tatubu-evolution
```

### 13.3 Service Management Commands

```bash
# Check status of all Tatubu services
sudo systemctl status tatubu-api tatubu-evolution nginx mysql redis

# Restart Flask API (e.g. after code update)
sudo systemctl restart tatubu-api

# View live logs
sudo journalctl -u tatubu-api -f
sudo tail -f /var/log/tatubu/api-error.log
```

---

## 14. Monitoring & Logging

### 14.1 Log Locations

| Service | Log Location |
|---|---|
| Flask API (access) | `/var/log/tatubu/api-access.log` |
| Flask API (errors) | `/var/log/tatubu/api-error.log` |
| Nginx (access) | `/var/log/nginx/access.log` |
| Nginx (errors) | `/var/log/nginx/error.log` |
| MySQL | `/var/log/mysql/error.log` |
| Evolution API | `docker compose -f docker-compose-tatubu.yml logs` |
| Systemd | `journalctl -u tatubu-api` |

### 14.2 Health Check Endpoint

The Flask API exposes a health check at:
```
GET /api/health
Response: { "status": "ok", "timestamp": "2026-02-19T10:00:00+04:00" }
```

### 14.3 Uptime Monitoring (Recommended Tools)

| Tool | Type | Free Tier | URL |
|---|---|---|---|
| **UptimeRobot** | Uptime monitoring + alerts | Yes (50 monitors) | uptimerobot.com |
| **Betterstack** | Uptime + log management | Yes | betterstack.com |
| **Grafana + Prometheus** | Full metrics stack | Self-hosted | grafana.com |
| **Sentry** | Error tracking | Yes | sentry.io |

### 14.4 Basic Health Monitoring Script

```bash
# /home/tatubu/scripts/health-check.sh
#!/bin/bash

API_URL="https://your-domain.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ "$RESPONSE" != "200" ]; then
    echo "API health check FAILED (HTTP $RESPONSE)" | mail -s "Tatubu Alert" admin@school.edu.om
    sudo systemctl restart tatubu-api
fi
```

```bash
# Run every 5 minutes via cron
crontab -e
# Add: */5 * * * * /home/tatubu/scripts/health-check.sh
```

---

## 15. Backup Strategy

### 15.1 Database Backup

```bash
# /home/tatubu/scripts/backup-db.sh
#!/bin/bash

BACKUP_DIR="/home/tatubu/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="tatubu_db"
DB_USER="tatubu_user"
DB_PASS="your_db_password"

mkdir -p $BACKUP_DIR

# Dump with compression
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

```bash
chmod +x /home/tatubu/scripts/backup-db.sh

# Schedule daily backup at 2 AM Oman time
crontab -e
# Add: 0 2 * * * /home/tatubu/scripts/backup-db.sh
```

### 15.2 Remote Backup (AWS S3 / DigitalOcean Spaces)

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Upload backup to S3
aws s3 cp /home/tatubu/backups/mysql/ s3://tatubu-backups/mysql/ --recursive

# Or use rclone for DigitalOcean Spaces / any S3-compatible storage
```

### 15.3 Evolution API Data Backup

```bash
# Backup Evolution API Docker volume
docker run --rm \
    -v evolution_instances:/data \
    -v /home/tatubu/backups/evolution:/backup \
    alpine tar czf /backup/evolution_$(date +%Y%m%d).tar.gz /data
```

### 15.4 Backup Schedule Summary

| Data | Frequency | Retention | Location |
|---|---|---|---|
| MySQL full dump | Daily (2 AM) | 30 days local, 90 days S3 |
| Evolution API volumes | Weekly | 4 weeks |
| Application code | Git (continuous) | All history |
| `.env` files | Encrypted copy | Separate secure location |

---

## 16. Scaling Strategy

### 16.1 Vertical Scaling (Scale Up)

Simplest approach — upgrade VPS plan:
- Double RAM when MySQL buffer pool needs more memory
- Add CPU when Gunicorn workers are consistently at 100%
- Add SSD storage when database grows > 50 GB

### 16.2 Horizontal Scaling (Scale Out)

For high load (10+ schools, thousands of concurrent users):

```
[Load Balancer]  (Nginx / HAProxy / AWS ALB)
     │
     ├──► Flask API Instance 1 (app server)
     ├──► Flask API Instance 2 (app server)
     └──► Flask API Instance 3 (app server)
          │
          ▼
     [MySQL Primary]  ←──── [MySQL Replica(s)]  (read replicas)
          │
     [Redis Cluster]  (shared rate limiting / cache)
```

**Required changes for horizontal Flask scaling:**
1. Store sessions in Redis (not in-memory)
2. JWT is stateless — already horizontally scalable
3. Uploaded files must go to shared storage (S3/NFS), not local disk
4. Rate limiting must use shared Redis (already configured)

### 16.3 CDN for Frontend

Place the React static build behind Cloudflare or AWS CloudFront:
- Reduces server load for static assets
- Improves load time for users across Oman
- Provides DDoS protection
- Free tier available on Cloudflare

```
# Cloudflare setup:
1. Add domain to Cloudflare
2. Set DNS A record → server IP
3. Enable proxy (orange cloud)
4. Set Cache Rules: "Cache Everything" for /static/*
5. Set Cache Rules: "Bypass Cache" for /api/*
```

---

## 17. Quick Deployment Checklist

### Pre-Deployment

- [ ] Domain name purchased and DNS configured
- [ ] VPS provisioned (Ubuntu 22.04 LTS)
- [ ] SSH key-based access configured
- [ ] Firewall rules set (only 22, 80, 443 open externally)

### Database

- [ ] MySQL 8.0 installed and secured
- [ ] `tatubu_db` database created with UTF8MB4 charset
- [ ] `tatubu_user` created with limited privileges
- [ ] Flask migrations run successfully (`flask db upgrade`)

### Backend (Flask)

- [ ] Python virtual environment created
- [ ] All requirements installed (`pip install -r requirements.txt`)
- [ ] `.env` file configured with all required variables
- [ ] VAPID keys generated and saved to `.env`
- [ ] Gunicorn starts without errors
- [ ] Systemd service enabled and running

### Frontend (React)

- [ ] `npm install` completed
- [ ] `.env.production` configured with API URL and VAPID public key
- [ ] `npm run build` completed successfully
- [ ] Build files deployed to `/var/www/tatubu/`

### Evolution API (Optional WhatsApp)

- [ ] Docker and Docker Compose installed
- [ ] `.env` file configured with API key and database URL
- [ ] Docker containers start successfully
- [ ] WhatsApp instance connected (QR code scanned via Manager UI)
- [ ] Test message sent successfully from Flask backend

### Nginx & SSL

- [ ] Nginx installed and configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] HTTPS redirect working
- [ ] `/api/*` routes proxied to Flask correctly
- [ ] React Router — `try_files` fallback configured
- [ ] Service Worker cache headers configured

### Security

- [ ] Strong passwords set for MySQL, Redis, JWT, VAPID
- [ ] `.env` files not in version control (in `.gitignore`)
- [ ] CORS restricted to production domain
- [ ] Rate limiting enabled and tested
- [ ] Automated backups scheduled

### Monitoring

- [ ] Health check endpoint responding
- [ ] UptimeRobot (or equivalent) monitoring configured
- [ ] Log rotation configured
- [ ] Alert emails configured for service failures

### Go-Live Verification

- [ ] Login works end-to-end
- [ ] Attendance recording works and sends notifications
- [ ] Push notifications received on mobile device
- [ ] PWA installable from browser
- [ ] Bus QR scanner works on mobile camera
- [ ] WhatsApp message received by test phone
- [ ] SSL certificate valid (check with `ssl-checker.internet.bs`)

---

## Appendix: Useful Commands

```bash
# Check all service statuses
sudo systemctl status tatubu-api nginx mysql redis-server

# Restart all Tatubu services
sudo systemctl restart tatubu-api

# View Flask API logs (live)
sudo tail -f /var/log/tatubu/api-error.log

# Check disk usage
df -h

# Check MySQL database size
mysql -u root -p -e "SELECT table_schema, ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size (MB)' FROM information_schema.tables GROUP BY table_schema;"

# Check Redis memory
redis-cli info memory | grep used_memory_human

# Check active connections to Flask
sudo ss -tlnp | grep 5000

# Test Evolution API health
curl http://localhost:8080/

# Force SSL certificate renewal
sudo certbot renew --force-renewal

# Run database backup manually
/home/tatubu/scripts/backup-db.sh
```
