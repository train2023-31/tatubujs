# WhatsApp Auto-Send — Evolution API Setup Guide

This document covers the full setup of Evolution API integration with the Tatubu school management system.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What Was Built](#2-what-was-built)
3. [VPS Server Setup (One-Time)](#3-vps-server-setup-one-time)
4. [Database Migration](#4-database-migration)
5. [Evolution API Docker Setup](#5-evolution-api-docker-setup)
6. [School Admin Setup (Per School)](#6-school-admin-setup-per-school)
7. [Sending WhatsApp Reports](#7-sending-whatsapp-reports)
8. [Troubleshooting](#8-troubleshooting)
9. [File Reference](#9-file-reference)

---

## 1. Architecture Overview

```
VPS (LightNode)
│
├── Flask Backend    (Gunicorn, port 5000)   ← Tatubu app
├── MySQL            (port 3306, localhost)   ← Tatubu DB + Evolution DB
│
└── Docker
    ├── evolution-api   (port 8080)           ← WhatsApp gateway
    └── evolution-redis (internal)            ← Cache for sessions

Each school connects their OWN WhatsApp number to their OWN instance.
Messages are sent FROM the school's number TO parents.
```

### How it works

1. Each school registers an **instance** on the Evolution API server
2. The school scans a **QR code** with their dedicated WhatsApp phone
3. When attendance is recorded, the system sends messages **automatically** from the school's number
4. Parents receive messages from a number they recognize

---

## 2. What Was Built

### Backend files

| File | Purpose |
|------|---------|
| `back/evolution_whatsapp_service.py` | Service class — create instance, get QR, send messages |
| `back/app/routes/static_routes.py` | 7 new API endpoints (see below) |
| `back/app/models.py` | 7 new fields added to `School` model |
| `back/migrations/versions/add_evolution_whatsapp_config_to_schools.py` | Alembic migration |
| `back/migrations/sql/add_evolution_whatsapp_to_schools.sql` | Manual SQL migration |

### API Endpoints added

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/static/whatsapp-config` | Get school's WhatsApp config |
| PUT | `/api/static/whatsapp-config` | Save school's WhatsApp config |
| POST | `/api/static/create-whatsapp-instance` | Create instance on Evolution API |
| POST | `/api/static/test-whatsapp-connection` | Test connection & get instance state |
| GET | `/api/static/whatsapp-qr` | Get QR code to connect WhatsApp number |
| GET | `/api/static/whatsapp-status` | Refresh current connection status |
| POST | `/api/static/send-whatsapp-test` | Send a test message |
| POST | `/api/static/send-whatsapp-reports` | Send daily attendance reports to parents |

### Frontend files

| File | Purpose |
|------|---------|
| `frontend/src/pages/WhatsAppConfiguration/WhatsAppConfiguration.js` | Full config page |
| `frontend/src/services/api.js` | 8 new API methods added |
| `frontend/src/App.js` | Route `/app/whatsapp-configuration` registered |
| `frontend/src/components/Layout/Sidebar.js` | Nav link added |

### Database fields added to `schools` table

| Column | Type | Description |
|--------|------|-------------|
| `evolution_whatsapp_enabled` | BOOLEAN | Enable/disable auto-send |
| `evolution_api_url` | VARCHAR(255) | Evolution API server URL |
| `evolution_api_key` | VARCHAR(255) | Global API key |
| `evolution_instance_name` | VARCHAR(100) | Unique instance name per school |
| `evolution_instance_token` | VARCHAR(255) | Instance token (optional) |
| `evolution_phone_number` | VARCHAR(20) | Connected WhatsApp number |
| `evolution_instance_status` | VARCHAR(50) | `open` / `close` / `connecting` |

---

## 3. VPS Server Setup (One-Time)

### 3a. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

### 3b. Create a dedicated MySQL user for Evolution API

```bash
mysql -u root -p
```

```sql
CREATE DATABASE evolution_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'evolution'@'%' IDENTIFIED BY 'YourEvolutionPassword123!';
GRANT ALL PRIVILEGES ON evolution_api.* TO 'evolution'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 3c. Allow MySQL to accept Docker connections

```bash
# Check current bind address
grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf

# If it shows 127.0.0.1, change it:
sudo sed -i 's/bind-address.*/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql
```

### 3d. Upload the evolution-api folder to VPS

From Windows (PowerShell):
```powershell
scp -r "C:\Users\User\Desktop\PathToDiv\tatubujs\evolution-api" root@YOUR_VPS_IP:/opt/evolution-api
```

Or use WinSCP / FileZilla.

---

## 4. Database Migration

### Option A — Using Flask migrations (recommended)

```bash
cd /opt/backend
flask db upgrade
```

### Option B — Run the SQL file directly

```bash
mysql -u root -p tatubu < /path/to/back/migrations/sql/add_evolution_whatsapp_to_schools.sql
```

### Option C — Manual SQL

```sql
USE tatubu;

ALTER TABLE schools
  ADD COLUMN evolution_whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN evolution_api_url VARCHAR(255) NULL,
  ADD COLUMN evolution_api_key VARCHAR(255) NULL,
  ADD COLUMN evolution_instance_name VARCHAR(100) NULL,
  ADD COLUMN evolution_instance_token VARCHAR(255) NULL,
  ADD COLUMN evolution_phone_number VARCHAR(20) NULL,
  ADD COLUMN evolution_instance_status VARCHAR(50) NULL DEFAULT 'disconnected';
```

---


-- Create the user (accessible from Docker network)
CREATE USER 'evolut'@'%' IDENTIFIED BY 'Evo2kkkk';

-- Grant access only to the evolution_api database
GRANT ALL PRIVILEGES ON evolution_api.* TO 'evolut'@'%';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SHOW GRANTS FOR 'evolution'@'%';

EXIT;




## 5. Evolution API Docker Setup

### 5a. Configure the `.env` file

Edit `/opt/evolution-api/.env`:

```ini
# Server URL — use your VPS public IP or domain
SERVER_URL=http://YOUR_VPS_IP:8080

# MySQL connection (Prisma format — no +pymysql, must include port)
# URL-encode special characters: ! = %21, @ = %40, # = %23
DATABASE_PROVIDER=mysql
DATABASE_CONNECTION_URI=mysql://evolution:YourEvolutionPassword123%21@host.docker.internal:3306/evolution_api

# API Key — change this to something secret!
AUTHENTICATION_API_KEY=YourStrongSecretKeyHere123!
```

> **Important:** The `!` character must be written as `%21` in the URL.
> Example: password `Pass123!` → `Pass123%21`

### 5b. Start Evolution API

cd /opt/evolution-api
docker compose -f docker-compose-tatubu.yml down
docker compose -f docker-compose-tatubu.yml up -d
docker logs evolution_api --tail 40 -f


```bash
cd /opt/evolution-api
docker compose -f docker-compose-tatubu.yml up -d
```

### 5c. Verify it's running

```bash
docker logs evolution_api --tail 30
# Should show: HTTP - ON: 8080

curl http://localhost:8080
# Should return JSON
```

### 5d. Enable auto-start on server reboot

```bash
sudo systemctl enable docker
# Containers already have restart: always in docker-compose
```

---

## 6. School Admin Setup (Per School)

Each school does this **once** from the app UI.

### Step 1 — Go to WhatsApp Configuration

Sidebar → **إعدادات WhatsApp**

### Step 2 — Fill in the configuration

| Field (Arabic) | Field | Example value |
|----------------|-------|---------------|
| رابط Evolution API | API URL | `http://localhost:8080` |
| مفتاح API | API Key | `YourStrongSecretKeyHere123!` |
| اسم الـ Instance | Instance Name | `school_maarifa_2024` |
| رقم WhatsApp | Phone number | `96891234567` (for reference) |

> Instance name rules: English letters, numbers, and underscores only. No spaces. Must be unique per school.

### Step 3 — Save

Press **حفظ الإعدادات**

### Step 4 — Create Instance

Press **1. إنشاء Instance**

- Success message: `الـ Instance موجود مسبقاً` (already exists) or `تم إنشاء الـ Instance بنجاح`
- Both are fine — proceed to next step

### Step 5 — Get QR Code

Press **عرض رمز QR**

A QR code image will appear.

### Step 6 — Connect WhatsApp

On the school's **dedicated WhatsApp phone**:

1. Open WhatsApp
2. Go to **Settings (⚙️) → Linked Devices → Link a Device**
3. Scan the QR code shown on screen
4. Wait for the phone to show "Device linked"

> Use a dedicated SIM card for the school, not a personal number.

### Step 7 — Verify connection

Press **تحديث الحالة**

Status should change to **متصل ✅**

### Step 8 — Test

1. Turn on **تفعيل إرسال WhatsApp** toggle
2. Press **حفظ الإعدادات**
3. Enter a phone number in the test section
4. Press **إرسال رسالة تجريبية**
5. Confirm the message is received on that phone

---

## 7. Sending WhatsApp Reports

### Auto attendance reports

Call the endpoint from the Daily Report page or any trigger:

```
POST /api/static/send-whatsapp-reports
{
  "date": "2026-02-18",
  "school_id": 1,
  "delay_between_messages": 1.0
}
```

The message sent to each parent:

```
📚 اسم المدرسة
عزيزي ولي أمر الطالب/ة: اسم الطالب
الصف: الصف الثاني | التاريخ: 2026-02-18
🔴 غياب في الحصص: 2, 3
🟡 تأخير في الحصص: 1
للاستفسار يرجى التواصل مع إدارة المدرسة.
```

### Phone number format

Numbers must be in international format without `+`:
- Oman: `96891234567` (968 + 8 digits)
- Saudi: `966501234567`

The service normalizes numbers automatically (removes `+`, `00`, spaces).

---

## 8. Troubleshooting

### Container crashes on start

```bash
docker logs evolution_api --tail 50
```

**P1000: Authentication failed**
→ Wrong MySQL password in `.env`
→ Fix: check `/opt/backend/.env` for correct password, update `DATABASE_CONNECTION_URI`

**P1013: Invalid database string**
→ Wrong URL format — must be `mysql://` not `mysql+pymysql://`
→ Fix: remove `+pymysql`, add port `:3306`

**Connection reset by peer (curl)**
→ Container is restarting in a loop
→ Fix: check logs, usually a DB connection issue

### "Invalid integration" error when creating instance

→ Evolution API v2 requires `"integration": "WHATSAPP-BAILEYS"` in the create request
→ Fixed in `back/evolution_whatsapp_service.py`

### "WhatsApp not configured" when getting QR

→ Config was saved with `evolution_whatsapp_enabled = false`
→ Fixed: `_load_config()` now loads credentials regardless of enabled flag
→ Fix: press **حفظ الإعدادات** again, then retry QR

### QR code expired

→ QR codes expire after ~20 seconds
→ Fix: press **عرض رمز QR** again to generate a new one

### Instance disconnects after a while

→ Normal — WhatsApp Web sessions can expire
→ Fix: press **عرض رمز QR** and scan again

### MySQL not reachable from Docker

```bash
# Find Docker gateway IP
docker network inspect bridge | grep Gateway

# Test connection
docker run --rm mysql:8 mysql -h 172.17.0.1 -u evolution -p -e "SHOW DATABASES;"

# Check MySQL bind address
grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf
# Must be 0.0.0.0, not 127.0.0.1
```

---

## 9. File Reference

```
tatubujs/
│
├── back/
│   ├── evolution_whatsapp_service.py       ← Evolution API service class
│   └── app/
│       ├── models.py                        ← School model (7 new fields)
│       └── routes/
│           └── static_routes.py             ← 8 new WhatsApp endpoints
│
├── evolution-api/
│   ├── .env                                 ← Evolution API configuration
│   ├── docker-compose-tatubu.yml            ← Docker setup for this project
│   └── docker-compose.yaml                  ← Original (uses PostgreSQL)
│
├── frontend/
│   └── src/
│       ├── App.js                           ← /app/whatsapp-configuration route
│       ├── services/api.js                  ← 8 new API methods
│       ├── pages/WhatsAppConfiguration/
│       │   └── WhatsAppConfiguration.js     ← Full config UI page
│       └── components/Layout/Sidebar.js     ← Nav link added
│
├── migrations/
│   ├── versions/
│   │   └── add_evolution_whatsapp_config_to_schools.py  ← Alembic migration
│   └── sql/
│       └── add_evolution_whatsapp_to_schools.sql        ← Manual SQL
│
└── docs/
    └── WHATSAPP_EVOLUTION_API_SETUP.md      ← This file
```

---

## Quick Reference — Common Commands

```bash
# Start Evolution API
cd /opt/evolution-api
docker compose -f docker-compose-tatubu.yml up -d

# Stop Evolution API
docker compose -f docker-compose-tatubu.yml down

# View logs
docker logs evolution_api --tail 50 -f

# Restart only the API container
docker restart evolution_api

# Check status
docker ps
curl http://localhost:8080
```
