# Security Assessment Report
## Tatubu School Management System

---

| Field | Detail |
|---|---|
| **Document Type** | Security Architecture & Controls Report |
| **System Name** | Tatubu School Management System |
| **Version** | 1.0 |
| **Date** | February 2026 |
| **Classification** | Confidential |
| **Prepared For** | Security Review Center |
| **Region** | Sultanate of Oman |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Scope](#2-system-scope)
3. [Technology Stack Security Posture](#3-technology-stack-security-posture)
4. [Identity & Access Management](#4-identity--access-management)
5. [Data Protection](#5-data-protection)
6. [Network & Transport Security](#6-network--transport-security)
7. [Application Security Controls](#7-application-security-controls)
8. [API Security](#8-api-security)
9. [Third-Party Integration Security](#9-third-party-integration-security)
10. [Audit & Logging](#10-audit--logging)
11. [Infrastructure Security](#11-infrastructure-security)
12. [Data Privacy Considerations](#12-data-privacy-considerations)
13. [Known Limitations & Recommendations](#13-known-limitations--recommendations)
14. [Security Controls Summary Matrix](#14-security-controls-summary-matrix)

---

## 1. Executive Summary

Tatubu is a web-based School Management System (SMS) deployed for educational institutions in the Sultanate of Oman. The system digitizes school operations including student attendance, bus tracking, parent communications, timetable management, and teacher substitution workflows.

This report details the security architecture, controls, and practices implemented across all layers of the system — from user authentication to data storage, network communication, third-party integrations, and operational audit trails.

### Security Posture Summary

| Domain | Status | Notes |
|---|---|---|
| Authentication | Implemented | JWT + password hashing |
| Authorization | Implemented | Role-based + school-level isolation |
| Transport Security | Implemented | HTTPS/TLS required in production |
| Data Encryption at Rest | Partial | Passwords hashed; DB-level encryption optional |
| Input Validation | Implemented | ORM-based, server-side validation |
| Rate Limiting | Implemented | Redis-backed, per-endpoint |
| Audit Logging | Implemented | All admin/data actions logged |
| Push Notification Security | Implemented | VAPID standard |
| Third-Party API Security | Implemented | Key-based auth, per-school isolation |
| Vulnerability Management | In Progress | Dependencies tracked via requirements.txt |

---

## 2. System Scope

### Components in Scope

| Component | Technology | Role |
|---|---|---|
| Backend API | Python / Flask 3.0.3 | Core application logic, data management |
| Frontend | React 18.2.0 (PWA) | User interface, delivered as static files |
| Database | MySQL 8.0 | Primary persistent data store |
| Cache / Rate Limiter | Redis 7.0 | Rate limiting, session support |
| WhatsApp Service | Evolution API (Node.js, self-hosted) | Parent messaging via WhatsApp |
| Push Notifications | Web Push API (VAPID) | Browser push notifications |
| SMS Gateway | iBulk SMS (external, Oman provider) | Parent SMS notifications |

### Users & Data Subjects

| Role | Count (per deployment) | Sensitive Data Held |
|---|---|---|
| Super Admin | 1–3 | Credential hash, action logs |
| School Admin | 1–5 per school | Credential hash, action logs |
| Teacher | 10–100 per school | Name, phone, salary (optional), schedule |
| Student | 100–2000 per school | Name, school ID, parent phone, location area, behavior notes, attendance records, QR code |
| Driver | 1–20 per school | Name, phone, license number/expiry |
| Parent | External (not registered users) | Phone number used for SMS/WhatsApp; PIN for pickup |

---

## 3. Technology Stack Security Posture

### Backend (Python / Flask)

| Library | Version | Security Relevance |
|---|---|---|
| `Flask` | 3.0.3 | Latest major version; actively maintained |
| `Flask-JWT-Extended` | 4.6.0 | Industry-standard JWT implementation |
| `Flask-Limiter` | Latest | Rate limiting with Redis backend |
| `Flask-CORS` | 5.0.0 | Controlled CORS policy |
| `Werkzeug` | (Flask dep.) | Password hashing via PBKDF2-SHA256 |
| `SQLAlchemy` | 2.0.36 | ORM prevents raw SQL injection |
| `PyMySQL` | 1.1.1 | Parameterized queries via ORM |
| `pywebpush` | 1.14.1 | VAPID-compliant Web Push |
| `cryptography` | (dep.) | Underlying VAPID key operations |

### Frontend (React PWA)

| Library | Version | Security Relevance |
|---|---|---|
| `React` | 18.2.0 | Active LTS; JSX auto-escapes XSS |
| `Axios` | 1.4.0 | HTTP client; interceptor attaches JWT |
| `React Hook Form` | 7.45.4 | Client-side form validation |

### Evolution API (Node.js)

| Library | Version | Security Relevance |
|---|---|---|
| `Express` | 4.21.2 | HTTP framework |
| `Prisma` | Latest | ORM for database access |
| `Socket.io` | 4.8.1 | WebSocket with auth support |

---

## 4. Identity & Access Management

### 4.1 Authentication Mechanism

The system uses **JSON Web Tokens (JWT)** for stateless authentication.

**Token Types:**

| Token | Expiry | Purpose |
|---|---|---|
| Access Token | 1 hour | API authorization |
| Refresh Token | 30 days | Obtain new access tokens |

**Token Structure (Access Token Payload):**
```json
{
  "sub": 42,
  "role": "teacher",
  "school_id": 3,
  "username": "teacher01",
  "iat": 1708300000,
  "exp": 1708303600
}
```

Tokens are signed using **HS256 (HMAC-SHA256)** with a secret key stored exclusively as an environment variable (`JWT_SECRET_KEY`). The secret is never hardcoded in source code or configuration files committed to version control.

### 4.2 Password Security

Passwords are hashed using **Werkzeug's `generate_password_hash`**, which implements **PBKDF2-SHA256** with a random salt per password.

- Plain-text passwords are **never stored**
- Password comparison uses `check_password_hash` (constant-time comparison)
- Minimum password complexity is enforced at the API level

### 4.3 Role-Based Access Control (RBAC)

The system implements a strict RBAC model. Every protected endpoint declares the allowed roles, and the JWT claim is verified on every request.

| Role | Scope | Permissions |
|---|---|---|
| `admin` (Super Admin) | All schools | Full system access, school management, user management |
| `school_admin` | Own school only | User management, reports, configuration, data deletion |
| `teacher` | Own school, own classes | Attendance recording, timetable view, student notes |
| `student` | Own data only | Own attendance history, notifications |
| `driver` | Own school, own bus | Bus scanner, bus reports, student list |
| `data_analyst` | Own school (read-only) | Reports, analytics, logs |

### 4.4 School-Level Data Isolation (Multi-Tenancy)

All database queries are **scoped by `school_id`** extracted from the verified JWT token. A teacher from School A cannot access data from School B — even if they know the IDs — because the query always filters by the JWT's `school_id` claim.

```
Request → JWT Verified → school_id extracted → DB query: WHERE school_id = {from_token}
```

This prevents horizontal privilege escalation across tenants.

### 4.5 Parent Authentication (Pickup System)

Parents authenticate using a **phone number + 6-digit PIN** system (separate from the main JWT system):

| Control | Detail |
|---|---|
| PIN length | 6 digits |
| Failed attempt limit | 5 attempts |
| Lockout action | Account locked; requires admin reset |
| Session duration | Short-lived JWT (parent scope only) |
| Phone verification | Phone must match a registered student's parent record |

### 4.6 Login Brute-Force Protection

| Control | Configuration |
|---|---|
| Rate limiting | 5 login attempts per 15 minutes per IP address |
| Backend | Flask-Limiter with Redis |
| Scope | Per IP address |
| Response on limit | HTTP 429 Too Many Requests |

---

## 5. Data Protection

### 5.1 Sensitive Data Inventory

| Data Category | Storage Location | Protection Method |
|---|---|---|
| User passwords | MySQL (`users.password_hash`) | PBKDF2-SHA256 hashed |
| JWT secret key | Environment variable | Never in codebase |
| VAPID private key | Environment variable | Never sent to client |
| Evolution API key | MySQL (`schools.evolution_api_key`) | Application-level access control |
| iBulk SMS credentials | MySQL (`schools.ibulk_*`) | Application-level access control |
| Student parent phone | MySQL (`students.parent_phone`) | Access controlled by role |
| Student behavior notes | MySQL (`students.behavior_note`) | Accessible by teacher/admin only |
| Parent pickup PIN | MySQL (`students.parent_pin`) | PIN stored as plaintext (see §13) |
| Driver license number | MySQL (`drivers.license_number`) | Access controlled by role |
| Bus scan history | MySQL (`bus_scans`) | School-scoped access only |

### 5.2 Data in Transit

All data in transit is protected by **TLS 1.2+ (HTTPS)**.

- HTTP traffic is permanently redirected to HTTPS via Nginx
- **HSTS (HTTP Strict Transport Security)** header is set:
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- SSL certificates are issued by **Let's Encrypt** (trusted CA)
- Minimum TLS version: **TLSv1.2**
- Weak cipher suites are disabled in Nginx configuration

### 5.3 API Keys & Secrets Management

| Secret | Storage | Rotation |
|---|---|---|
| `JWT_SECRET_KEY` | `.env` file (server-side only) | Manual; recommended every 6 months |
| `VAPID_PRIVATE_KEY` | `.env` file (server-side only) | Manual; requires re-subscription of clients |
| `VAPID_PUBLIC_KEY` | `.env` + frontend bundle | Public key; safe to expose |
| `DATABASE_URL` | `.env` file (server-side only) | Manual |
| `REDIS_URL` | `.env` file (server-side only) | Manual |
| Evolution API Key | DB + `.env` | Per-school; revocable from DB |
| iBulk SMS credentials | DB (per school) | Per-school; updatable by admin |

All `.env` files are included in `.gitignore` and are **never committed to version control**.

---

## 6. Network & Transport Security

### 6.1 HTTPS / TLS

| Control | Implementation |
|---|---|
| Protocol | HTTPS enforced via Nginx |
| TLS versions | TLSv1.2 and TLSv1.3 only |
| Certificate authority | Let's Encrypt (trusted, auto-renewed) |
| HTTP → HTTPS redirect | Permanent 301 redirect at Nginx |
| HSTS | Enabled, 1-year duration |

### 6.2 Firewall Rules

Only the following ports are exposed externally on the production server:

| Port | Protocol | Purpose |
|---|---|---|
| 22 | TCP | SSH (key-based auth only) |
| 80 | TCP | HTTP (immediately redirected to HTTPS) |
| 443 | TCP | HTTPS (all application traffic) |

All internal service ports (MySQL :3306, Redis :6379, Flask :5000, Evolution API :8080) are **blocked from external access** and accessible only on the loopback interface (`127.0.0.1`).

### 6.3 CORS Policy

Cross-Origin Resource Sharing (CORS) is restricted via **Flask-CORS**:

- Allowed origins: explicitly configured production domain(s) only
- No wildcard (`*`) origins in production
- Pre-flight requests are validated
- Only required HTTP methods are permitted

### 6.4 Security Headers

The following HTTP security headers are set on all responses via Nginx:

| Header | Value |
|---|---|
| `X-Frame-Options` | `SAMEORIGIN` — prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` — prevents MIME-type sniffing |
| `X-XSS-Protection` | `1; mode=block` — legacy XSS filter |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | Configurable (recommended addition) |

---

## 7. Application Security Controls

### 7.1 SQL Injection Prevention

All database interactions are performed through **SQLAlchemy ORM** (version 2.0.36), which uses **parameterized queries** internally. Raw SQL strings are not constructed from user input anywhere in the application.

```python
# Example: ORM query (safe — parameterized)
Student.query.filter_by(school_id=current_school_id, id=student_id).first()
```

### 7.2 Cross-Site Scripting (XSS) Prevention

- **React JSX** automatically escapes all dynamic content before rendering to the DOM, preventing reflected and stored XSS
- Backend API returns JSON only (no HTML rendering), limiting XSS attack surface
- `X-Content-Type-Options: nosniff` header prevents MIME-confusion attacks

### 7.3 Cross-Site Request Forgery (CSRF)

The application uses **JWT Bearer token authentication** (not cookies), which is inherently not vulnerable to CSRF attacks. CSRF tokens are not required because:
- Authentication tokens are stored in `localStorage` / `Authorization` header
- Browsers do not automatically send `Authorization` headers on cross-origin requests
- CORS policy blocks unauthorized cross-origin requests

### 7.4 Input Validation

| Layer | Mechanism |
|---|---|
| Client-side | React Hook Form — field validation, format checks |
| Server-side | Request body validation before any database write |
| ORM layer | Type coercion and constraint enforcement |
| Database | Column constraints, NOT NULL, UNIQUE, FK constraints |

Validation is always enforced **server-side**. Client-side validation is a UX improvement only and is not relied upon for security.

### 7.5 Rate Limiting

Flask-Limiter with Redis backend applies rate limits to sensitive endpoints:

| Endpoint | Limit |
|---|---|
| `POST /api/auth/login` | 5 requests / 15 minutes per IP |
| `POST /api/auth/register` | 10 requests / hour per IP |
| `POST /api/parent-pickup/parent-login` | 5 requests / 15 minutes per IP |
| General API endpoints | 200 requests / minute per user |

Rate limit violations return **HTTP 429 Too Many Requests**.

### 7.6 Error Handling

- Production errors return **generic error messages** — no stack traces, internal paths, or database details are exposed to the client
- Detailed error information is written to server-side log files only
- Flask debug mode (`FLASK_DEBUG=False`) is disabled in production

### 7.7 File Upload Security

Timetable XML uploads are processed server-side with:
- File type validation (XML only)
- Content parsed using a safe XML parser
- No uploaded files are executed or served directly as scripts
- Upload size limits enforced at Nginx level (`client_max_body_size 50M`)

---

## 8. API Security

### 8.1 Authentication Flow

```
Client → POST /api/auth/login (credentials)
       ← 200 OK { access_token, refresh_token }

Client → GET /api/protected (Authorization: Bearer <access_token>)
       ← Flask: decode JWT → verify signature → check expiry
                → extract role + school_id → enforce access
       ← 200 OK (data)

Client → POST /api/auth/refresh (Authorization: Bearer <refresh_token>)
       ← 200 OK { new access_token }
```

### 8.2 Token Security

| Control | Implementation |
|---|---|
| Signing algorithm | HS256 (HMAC-SHA256) |
| Secret storage | Environment variable only |
| Access token expiry | 1 hour |
| Refresh token expiry | 30 days |
| Token revocation | Not implemented (stateless JWT); mitigation: short expiry |

### 8.3 Endpoint Authorization Matrix

Every API endpoint declares its minimum required role. The `@jwt_required()` decorator and role checks enforce this on every request. Attempting to access an endpoint with insufficient privileges returns **HTTP 403 Forbidden**.

| Access Level | Example Endpoints |
|---|---|
| Public (no auth) | `POST /login`, `GET /pickup-display` |
| Any authenticated user | `GET /notifications`, `GET /user` |
| Teacher or above | `POST /attendance/takes`, `GET /timetable` |
| School Admin or above | `POST /classes/create`, `DELETE /buses/<id>` |
| Admin only | `POST /classes/addSchool`, `DELETE /auth/user/<id>` |

---

## 9. Third-Party Integration Security

### 9.1 Evolution API (WhatsApp — Self-Hosted)

| Security Aspect | Detail |
|---|---|
| Hosting | Self-hosted on the same server infrastructure (not external cloud) |
| Network exposure | Internal only; not directly internet-accessible |
| Authentication | API key required for all requests |
| Key storage | Stored in MySQL `schools` table, accessed only by backend |
| Per-school isolation | Each school has its own Evolution API instance name and key |
| Communication channel | Backend → Evolution API over internal network (localhost) |
| Data handled | Message text and recipient phone number only; no message storage in application DB |

### 9.2 iBulk SMS (External Provider — Oman)

| Security Aspect | Detail |
|---|---|
| Communication | HTTPS to iBulk API endpoint |
| Credential storage | Username/password stored in `schools` table, per-school |
| Access control | Credentials readable only by backend; not exposed to frontend |
| Data transmitted | Recipient phone number, message text |
| No persistent storage | SMS content is not stored in the application database |

### 9.3 Web Push / VAPID

| Security Aspect | Detail |
|---|---|
| Protocol | W3C Web Push standard (VAPID) |
| Public key | Shared with frontend (expected — required for push subscription) |
| Private key | Stored exclusively in server `.env`; never transmitted to client |
| Subscription data | `endpoint`, `p256dh`, `auth` stored per user in `push_subscriptions` table |
| Push payload | Encrypted in transit by the push service using the subscription's public key |
| User control | Users can subscribe/unsubscribe; preferences configurable per notification type |

### 9.4 Third-Party Libraries (Dependency Security)

| Language | Dependency File | Management |
|---|---|---|
| Python (backend) | `back/requirements.txt` | Pinned versions |
| JavaScript (frontend) | `frontend/package.json` | Pinned versions |
| JavaScript (Evolution API) | `evolution-api/package.json` | Pinned versions |

**Recommendation**: Run `pip audit` (Python) and `npm audit` (Node.js) regularly to identify known CVEs in dependencies. See §13 for details.

---

## 10. Audit & Logging

### 10.1 Action Logging System

The system maintains an **`action_logs`** table that records all significant administrative and data-modification actions.

**Logged information per record:**

| Field | Description |
|---|---|
| `user_id` | Who performed the action |
| `action` | Human-readable action description |
| `details` | Additional context (e.g., affected record IDs) |
| `ip_address` | Client IP address at time of action |
| `school_id` | School scope |
| `created_at` | Timestamp (Oman time, Asia/Muscat) |

### 10.2 Actions Captured

| Category | Examples |
|---|---|
| Authentication | Login success, login failure, password change |
| User Management | User created, user updated, user deleted |
| Attendance | Attendance recorded, excuse note updated |
| Bus Operations | Bus created, student assigned, QR scan |
| School Configuration | School created, SMS config updated, WhatsApp config updated |
| Data Management | Bulk data deletion, timetable import/activation |
| System | Notification sent, SMS report dispatched |

### 10.3 Log Access Control

- Action logs are accessible only to `admin` and `school_admin` roles
- School admins can only view logs for their own school
- Super admin can view logs across all schools
- Logs are **append-only** — no update or delete endpoints exist for log records

### 10.4 Application & Server Logs

| Log Type | Location | Content |
|---|---|---|
| Flask API access | `/var/log/tatubu/api-access.log` | HTTP requests, response codes, timing |
| Flask API errors | `/var/log/tatubu/api-error.log` | Exceptions, stack traces (server-side only) |
| Nginx access | `/var/log/nginx/access.log` | All incoming HTTP requests |
| Nginx errors | `/var/log/nginx/error.log` | Proxy errors, SSL errors |
| MySQL errors | `/var/log/mysql/error.log` | Database errors |

---

## 11. Infrastructure Security

### 11.1 Server Hardening (Production)

| Control | Implementation |
|---|---|
| OS | Ubuntu 22.04 LTS (supported until April 2027) |
| SSH access | Key-based authentication; password login disabled |
| Root login | Disabled via SSH |
| Application user | Dedicated non-root `tatubu` OS user |
| Port exposure | Only 22, 80, 443 open externally (UFW firewall) |
| Automatic updates | `unattended-upgrades` for security patches |

### 11.2 Process Isolation

- Flask API runs as the unprivileged `tatubu` user (not root)
- Nginx runs as `www-data`
- MySQL runs as `mysql`
- Evolution API runs inside a **Docker container** with no host capabilities

### 11.3 Database Security

| Control | Detail |
|---|---|
| Network binding | MySQL bound to `127.0.0.1` (localhost only) |
| User privileges | Application user has CRUD on `tatubu_db` only; no SUPER, FILE, or PROCESS grants |
| Root access | MySQL root not used by application |
| Password | Strong password set during `mysql_secure_installation` |
| Character set | UTF8MB4 — supports full Unicode including Arabic |

### 11.4 Redis Security

| Control | Detail |
|---|---|
| Network binding | Bound to `127.0.0.1` (localhost only) |
| Authentication | Optional password (`requirepass`) recommended |
| Data stored | Rate limit counters only (not sensitive user data) |
| TTL | Rate limit keys expire automatically |

### 11.5 Docker Security (Evolution API)

| Control | Detail |
|---|---|
| Base image | `node:24-alpine` (minimal attack surface) |
| Container user | Non-root user inside container |
| Port exposure | Port 8080 bound to `127.0.0.1` only |
| Volume mounts | Only `evolution_instances` volume (WhatsApp session data) |
| Network | Internal Docker bridge network |
| Restart policy | `unless-stopped` — survives server reboots |

---

## 12. Data Privacy Considerations

### 12.1 Personal Data Processed

| Data Subject | Personal Data Processed | Purpose |
|---|---|---|
| Students | Name, school ID, location area, photo (optional), attendance records, behavior notes | Educational management |
| Parents | Phone number (1–2 numbers), 6-digit pickup PIN | Safety notifications, pickup system |
| Teachers | Name, phone, email, employee ID, salary (optional) | HR and scheduling |
| Drivers | Name, phone, license number, license expiry | Transport management |

### 12.2 Data Minimization

- Parent passwords/accounts are not created — parents are authenticated via phone + PIN only
- Parent phone numbers are used exclusively for attendance alerts and pickup coordination
- Student location field stores only a general area name (not GPS coordinates)
- No biometric data is collected; QR codes contain only a structured school-assigned ID

### 12.3 Data Retention

- Attendance records are retained indefinitely (required for academic records)
- Bus scan records are retained indefinitely (safety audit trail)
- Action logs are retained indefinitely (compliance)
- Deleted users are soft-deleted or hard-deleted per admin action — school admins have a selective data deletion tool

### 12.4 Data Residency

- All application data is stored in the MySQL database on the hosting server
- Server location is selected by the deploying institution (recommended: Oman or Bahrain region)
- SMS messages are transmitted through iBulk SMS (Oman-based provider)
- WhatsApp messages are transmitted through Evolution API → WhatsApp servers (Meta infrastructure)

---

## 13. Known Limitations & Recommendations

The following items represent current limitations identified during system review and recommended improvements:

| # | Area | Current State | Recommendation | Priority |
|---|---|---|---|---|
| 1 | Parent PIN storage | PIN stored as plaintext in DB | Hash parent PINs using bcrypt/PBKDF2 | **High** |
| 2 | JWT revocation | No token blacklist (stateless) | Implement Redis-based token revocation list for logout | Medium |
| 3 | Dependency scanning | Not automated | Add `pip audit` + `npm audit` to CI/CD pipeline | Medium |
| 4 | Content Security Policy | Not configured | Add `Content-Security-Policy` header in Nginx | Medium |
| 5 | Evolution API key | Stored in plaintext in DB | Encrypt at-rest using AES-256 before DB storage | Medium |
| 6 | Password complexity policy | Basic server-side validation | Enforce minimum length, character class requirements | Medium |
| 7 | Multi-factor authentication | Not implemented | Add TOTP (Google Authenticator) for admin accounts | Medium |
| 8 | Penetration testing | Not performed | Schedule annual third-party pen test | Medium |
| 9 | Session invalidation on password change | Not implemented | Invalidate all active tokens on password change | Medium |
| 10 | Automated backup verification | Not implemented | Periodically restore backup to test environment and verify | Low |
| 11 | SMS credential encryption | Stored in plaintext in DB | Encrypt iBulk credentials at rest | Low |
| 12 | HTTPS for Evolution API internal | HTTP (internal) | Add mTLS for backend-to-Evolution-API communication | Low |

---

## 14. Security Controls Summary Matrix

| Control Category | Control | Status |
|---|---|---|
| **Authentication** | JWT-based stateless authentication | ✅ Implemented |
| | PBKDF2-SHA256 password hashing | ✅ Implemented |
| | Short-lived access tokens (1 hour) | ✅ Implemented |
| | Refresh token rotation | ✅ Implemented |
| | Parent PIN with lockout (5 attempts) | ✅ Implemented |
| | Brute-force protection (rate limiting) | ✅ Implemented |
| | Multi-factor authentication | ❌ Not implemented |
| **Authorization** | Role-based access control (7 roles) | ✅ Implemented |
| | School-level data isolation (multi-tenancy) | ✅ Implemented |
| | Endpoint-level role enforcement | ✅ Implemented |
| | Least-privilege DB user | ✅ Implemented |
| **Data Protection** | TLS 1.2+ for all traffic | ✅ Implemented |
| | HSTS header | ✅ Implemented |
| | Passwords hashed (never plaintext) | ✅ Implemented |
| | Secrets in environment variables | ✅ Implemented |
| | Secrets excluded from version control | ✅ Implemented |
| | Parent PIN hashing | ⚠️ Recommended |
| | At-rest DB encryption | ⚠️ Optional (OS/DB level) |
| **Input Validation** | Server-side input validation | ✅ Implemented |
| | ORM parameterized queries (SQL injection prevention) | ✅ Implemented |
| | React JSX auto-escaping (XSS prevention) | ✅ Implemented |
| | File upload type validation | ✅ Implemented |
| **Network Security** | Firewall (UFW) — minimal open ports | ✅ Implemented |
| | Internal services bound to localhost | ✅ Implemented |
| | CORS restricted to known origins | ✅ Implemented |
| | Security response headers | ✅ Implemented |
| | Content Security Policy | ⚠️ Recommended |
| **API Security** | JWT authentication on all protected endpoints | ✅ Implemented |
| | Rate limiting on sensitive endpoints | ✅ Implemented |
| | Generic error responses (no stack traces) | ✅ Implemented |
| | VAPID private key server-side only | ✅ Implemented |
| **Audit & Logging** | Action log for all admin/data operations | ✅ Implemented |
| | IP address recorded in logs | ✅ Implemented |
| | Log access control (admin-only) | ✅ Implemented |
| | Nginx + application access logs | ✅ Implemented |
| **Infrastructure** | Non-root application user | ✅ Implemented |
| | SSH key-based access | ✅ Implemented |
| | Docker container isolation (Evolution API) | ✅ Implemented |
| | Automated database backups | ✅ Implemented |
| | Dependency vulnerability scanning | ⚠️ Recommended |
| | Penetration testing | ⚠️ Recommended |

**Legend:**
- ✅ Implemented — control is in place
- ⚠️ Recommended — not yet implemented; improvement identified
- ❌ Not implemented — known gap

---

*This report was prepared based on source code review and architectural analysis of the Tatubu School Management System as of February 2026. For questions or clarification, contact the system development team.*
