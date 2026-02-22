# Tatubu School Management System — System Overview & High-Level Design (HLD)

> **Version:** 1.0 | **Date:** February 2026 | **Region:** Sultanate of Oman

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Goals & Objectives](#2-goals--objectives)
3. [Stakeholders & User Roles](#3-stakeholders--user-roles)
4. [High-Level Architecture](#4-high-level-architecture)
5. [System Components](#5-system-components)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Integration Architecture](#7-integration-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Scalability & Multi-Tenancy](#9-scalability--multi-tenancy)
10. [Key Feature Modules](#10-key-feature-modules)

---

## 1. System Overview

**Tatubu** is a comprehensive, multi-tenant School Management System (SMS) built for educational institutions in the Sultanate of Oman. It digitizes and automates the daily operational workflows of schools — from attendance tracking and timetable management to bus safety and real-time parent communication.

The system is delivered as a **Progressive Web App (PWA)**, making it accessible on desktop browsers, Android, and iOS devices without requiring separate native apps. It operates fully in **Arabic (RTL)** with timezone support for **Asia/Muscat (GMT+4)**.

### Core Value Proposition

| Problem | Tatubu Solution |
|---|---|
| Manual paper-based attendance | Digital attendance with auto-notifications |
| No parent visibility into school events | Real-time WhatsApp & push notifications |
| Bus safety risks | QR-code scanning with forgotten-student alerts |
| Ad-hoc substitute teacher management | Automated scoring-based substitution engine |
| Disconnected communication channels | Unified SMS, WhatsApp, and push notifications |
| No audit trail for school actions | Comprehensive action logging system |

---

## 2. Goals & Objectives

### Functional Goals
- Provide a unified platform for school administration, teachers, students, parents, and drivers
- Automate attendance recording and parent notification delivery
- Enable real-time bus tracking via QR code scanning
- Manage timetables with XML import and teacher substitution
- Support multi-school administration from a single platform

### Non-Functional Goals
- **Availability**: 99.5%+ uptime for core workflows
- **Performance**: API responses < 500ms for standard queries
- **Security**: JWT-based auth, rate limiting, data isolation per school
- **Accessibility**: Full RTL Arabic layout; PWA installable on mobile
- **Offline Support**: Service Worker caching for offline page access

---

## 3. Stakeholders & User Roles

| Role | Description | Key Access |
|---|---|---|
| **Super Admin** | Platform owner; manages all schools | All features, school CRUD, system logs |
| **School Admin** | Manages a single school | Users, classes, reports, notifications, config |
| **Teacher** | Records attendance, views timetable | Attendance, timetable, substitutions, notifications |
| **Student** | Views own data | Own attendance history, notifications |
| **Driver** | Manages bus operations | Bus dashboard, QR scan, student lists |
| **Data Analyst** | Read-only reporting access | Reports, logs, analytics |
| **Parent** | External; receives notifications | Pickup requests, notification receipt (via SMS/WhatsApp) |

---

## 4. High-Level Architecture

### Architecture Style
**Three-Tier Web Application** with an optional microservice (Evolution API) for WhatsApp messaging.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  React PWA        │  │  Mobile Browser  │  │  Desktop     │  │
│  │  (SPA + SW)       │  │  (Android/iOS)   │  │  Browser     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
└───────────┼──────────────────────┼────────────────────┼─────────┘
            │ HTTPS / REST API     │                    │
┌───────────▼──────────────────────▼────────────────────▼─────────┐
│                       APPLICATION LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Flask REST API (Python 3.x)                  │   │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │   │   Auth   │ │Attendance│ │   Bus    │ │Timetable │   │   │
│  │   │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │   │   │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │   │  Notif.  │ │  Class   │ │  Parent  │ │  Static  │   │   │
│  │   │  Routes  │ │  Routes  │ │  Pickup  │ │  Routes  │   │   │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Evolution API (Node.js / TypeScript)           │   │
│  │            WhatsApp Messaging Microservice                │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   MySQL DB      │  │  Redis Cache │  │  PostgreSQL (Evo.API)│ │
│  │  (Primary Store)│  │  (Rate Limit)│  │  (WhatsApp State)   │ │
│  └────────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### External Services

```
Flask Backend ──────► iBulk SMS API      (Oman SMS provider)
Flask Backend ──────► VAPID Push Servers (Web Push / FCM)
Flask Backend ──────► Evolution API      (self-hosted, local network)
Evolution API ───────► WhatsApp Servers  (via Baileys protocol)
```

---

## 5. System Components

### 5.1 Frontend — React PWA

| Attribute | Detail |
|---|---|
| Framework | React 18.2.0 (SPA) |
| Routing | React Router DOM v6 |
| State Management | React Query v3 + React Context |
| Styling | Tailwind CSS 3.3.3 |
| Charts | Recharts 2.7.2 |
| HTTP Client | Axios 1.4.0 |
| PWA | Service Worker + Web Push API + manifest.json |
| Build Tool | Create React App / custom scripts |
| Offline | Service Worker caches static assets + API responses |

**Page Architecture:**

```
App.js
 ├── AuthContext (JWT state)
 ├── NotificationContext (push notification state)
 └── Routes
      ├── /login            → Login page
      ├── /dashboard        → Role-specific dashboard
      ├── /attendance       → Attendance recording
      ├── /bus              → Bus management (admin/driver)
      ├── /bus-scanner      → QR scanner (driver)
      ├── /timetable        → Timetable viewer/manager
      ├── /substitutions    → Teacher substitution
      ├── /notifications    → Notification center
      ├── /whatsapp         → WhatsApp messaging
      ├── /sms              → SMS management
      ├── /reports          → Analytics & reports
      ├── /classes          → Class/subject management
      ├── /users            → User management
      ├── /parent-pickup    → Pickup display (TV mode)
      └── /settings/*       → Configuration pages
```

---

### 5.2 Backend — Flask REST API

| Attribute | Detail |
|---|---|
| Framework | Flask 3.0.3 |
| ORM | SQLAlchemy 2.0.36 |
| Database | MySQL (PyMySQL 1.1.1) |
| Auth | Flask-JWT-Extended 4.6.0 (access + refresh tokens) |
| Migrations | Flask-Migrate / Alembic |
| Rate Limiting | Flask-Limiter (Redis backend) |
| Push Notifications | pywebpush (VAPID) |
| CORS | Flask-CORS |
| Timezone | pytz — Asia/Muscat (GMT+4) |

**Route Module Breakdown:**

| Module | File | Responsibility |
|---|---|---|
| Authentication | `auth.py` | Login, register, user management, logs |
| Attendance | `attendance_routes.py` | Record, query, reports, SMS integration |
| Bus | `bus_routes.py` | Bus CRUD, QR scanning, reports |
| Classes | `class_routes.py` | Classes, subjects, school management |
| Users | `user_routes.py` | User listing, behavior notes |
| Timetable | `timetable_routes.py` | XML import, schedules, teacher mapping |
| Substitutions | `substitution_routes.py` | Substitute calculation and management |
| Notifications | `notification_routes.py` | Push subscriptions, preferences, delivery |
| Parent Pickup | `parent_pickup_routes.py` | PIN auth, pickup requests/confirmation |
| Static | `static_routes.py` | File serving, versioning |

---

### 5.3 Evolution API — WhatsApp Microservice

| Attribute | Detail |
|---|---|
| Runtime | Node.js 24 (Alpine Docker) |
| Language | TypeScript 5.7.2 |
| Framework | Express 4.21.2 |
| WhatsApp Library | Baileys 7.0.0 (WhatsApp Web protocol) |
| Database | Prisma ORM (PostgreSQL or MySQL) |
| WebSocket | Socket.io 4.8.1 |
| Message Queue | Optional: RabbitMQ / Kafka / SQS |
| Storage | Optional: MinIO / S3 for media |
| Management UI | evolution-manager (port 4000) |
| API Port | 8080 |

**Responsibilities:**
- Maintain persistent WhatsApp Web sessions via QR code authentication
- Send text, media, and document messages programmatically
- Expose REST API consumed by Flask backend
- Support multi-instance (one per school WhatsApp number)

---

### 5.4 Data Layer

| Store | Technology | Purpose |
|---|---|---|
| Primary Database | MySQL | All application data |
| WhatsApp State DB | PostgreSQL (optional MySQL) | Evolution API session & message state |
| Cache / Rate Limit | Redis | Flask-Limiter rate limiting, session cache |
| File Storage | Local filesystem / S3 (optional) | Media files for WhatsApp |

---

## 6. Data Flow Diagrams

### 6.1 Attendance Recording Flow

```
Teacher (Browser)
    │
    ├──► POST /api/attendance/takes
    │         │
    │    Flask validates JWT, school isolation
    │         │
    │    Write attendance records to MySQL
    │         │
    │    ┌────▼────────────────────────────────┐
    │    │       Notification Service           │
    │    │  ┌──────────┐  ┌──────────────────┐ │
    │    │  │ Push     │  │  WhatsApp        │ │
    │    │  │ (VAPID)  │  │  (Evolution API) │ │
    │    │  └──────────┘  └──────────────────┘ │
    │    └────────────────────────────────────┘
    │
    ◄── 200 OK (attendance saved)

Parent Device
    │
    ├──◄ Web Push Notification (service worker)
    └──◄ WhatsApp message ("Your child was absent today")
```

### 6.2 Bus QR Scan Flow

```
Driver (Browser / Mobile)
    │
    ├──► Camera opens QR scanner
    │
    ├──► Scans student QR code (encoded student ID)
    │
    ├──► POST /api/bus/scan  { student_id, bus_id, scan_type: "board"|"exit" }
    │         │
    │    Flask validates driver assignment
    │         │
    │    Write BusScan record to MySQL
    │         │
    │    Notification Service → parent push/WhatsApp
    │
    ◄── 200 OK { student_name, scan_type, timestamp }

(Scheduled Job) Check Forgotten Students
    │
    ├──► GET /api/bus/check-forgotten-students
    │         │
    │    Find students with "board" but no "exit" after school hours
    │         │
    │    Alert → Driver push notification
    │    Alert → Admin push notification
```

### 6.3 Parent Pickup Flow

```
Parent (Mobile Browser)
    │
    ├──► POST /api/parent-pickup/verify-parent-phone
    │         │ (sends OTP or validates phone)
    │
    ├──► POST /api/parent-pickup/parent-login  { phone, PIN }
    │         │ (JWT issued for parent session)
    │
    ├──► POST /api/parent-pickup/request-pickup  { student_id }
    │         │
    │    Creates ParentPickup record (status: requested)
    │
School TV / Display Screen
    │
    └──► GET /api/parent-pickup/display-pickups (auto-refresh)
              │
         Shows pending pickups → Staff confirms arrival
              │
         POST /api/parent-pickup/confirm-pickup
              │
         POST /api/parent-pickup/complete-pickup
```

### 6.4 WhatsApp Message Flow

```
Flask Backend (Notification Service)
    │
    ├──► Attendance / Bus event triggers notification
    │
    ├──► Check: school.evolution_whatsapp_enabled == True
    │
    ├──► POST http://evolution-api:8080/message/sendText/{instance}
    │         │
    │    Evolution API validates API key
    │         │
    │    Baileys sends message via WhatsApp Web protocol
    │         │
    │    WhatsApp servers deliver to parent's phone
    │
    ◄── { key: { id: "..." }, status: "PENDING" }
```

---

## 7. Integration Architecture

### 7.1 SMS Integration (iBulk SMS)

- **Provider**: iBulk SMS (Oman-based carrier-grade SMS)
- **Protocol**: REST API over HTTPS
- **Trigger points**: Daily attendance reports, bulk parent communications
- **Configuration**: Per-school credentials stored in `schools` table
- **Features**: Balance checking, test SMS, bulk send, Unicode Arabic support

### 7.2 WhatsApp Integration (Evolution API)

- **Self-hosted**: Evolution API runs within the same infrastructure
- **Auth**: Per-school API key + instance name
- **Connection**: WhatsApp Web QR code scan (one per school phone number)
- **Message types**: Text, media, documents
- **Fallback**: System continues operating if WhatsApp is unavailable

### 7.3 Web Push Notifications (VAPID)

- **Protocol**: W3C Web Push (VAPID keys)
- **Delivery**: Browser push servers (GCM / APNs for iOS 16.4+)
- **Offline delivery**: Messages queued and delivered when device comes online
- **User control**: Per-notification-type preferences (attendance, bus, timetable, etc.)
- **Service Worker**: Intercepts and displays push notifications even when app is closed

### 7.4 Integration Summary Diagram

```
                    ┌─────────────────────────────┐
                    │      Flask Backend           │
                    │                             │
      ┌─────────────┤  Notification Service        ├─────────────┐
      │             │                             │             │
      ▼             └──────────────┬──────────────┘             ▼
┌──────────┐                       │                    ┌──────────────┐
│ iBulk    │                       ▼                    │  VAPID Push  │
│ SMS API  │              ┌──────────────────┐          │  Servers     │
│ (Oman)   │              │  Evolution API   │          │ (GCM/APNs)  │
└──────────┘              │  (Self-hosted)   │          └──────┬───────┘
     │                    └────────┬─────────┘                 │
     │ SMS                         │ Baileys                   │ Push
     ▼                             ▼                           ▼
Parent Phone              WhatsApp Servers              Parent Device
```

---

## 8. Security Architecture

### 8.1 Authentication & Authorization

| Layer | Mechanism |
|---|---|
| API Auth | JWT (access token 1hr, refresh token 30d) |
| Password Storage | Werkzeug `generate_password_hash` (PBKDF2-SHA256) |
| Rate Limiting | Flask-Limiter: 5 login attempts / 15 min per IP |
| Role Enforcement | JWT claims checked on every protected route |
| School Isolation | Every query filtered by `school_id` from JWT |
| Parent Auth | 6-digit PIN, 5-attempt lockout, phone verification |
| Driver Auth | Separate PIN/password for bus operations |

### 8.2 API Security

| Control | Implementation |
|---|---|
| CORS | Configured origins via Flask-CORS |
| Input Validation | Request body validation before DB writes |
| SQL Injection | SQLAlchemy ORM (parameterized queries) |
| Failed Login Logging | IP + timestamp recorded in `action_logs` |
| HTTPS | Required in production (SSL cert via Let's Encrypt) |

### 8.3 Data Security

| Control | Detail |
|---|---|
| Multi-tenant isolation | All data scoped to `school_id` |
| VAPID Private Key | Never sent to client; stored server-side only |
| Evolution API Key | Stored encrypted in school record |
| JWT Secrets | Environment variables, not in codebase |
| Audit Logging | All admin/data-change actions logged |

### 8.4 Security Flow

```
Request → HTTPS → CORS check → Rate Limit → JWT Verify
    → Role Check → School Isolation → Business Logic → Response
```

---

## 9. Scalability & Multi-Tenancy

### Multi-Tenancy Model

Tatubu uses a **shared database, shared schema** multi-tenancy model:
- All schools share the same MySQL database and tables
- Every table with school-specific data has a `school_id` foreign key
- Application-level isolation: JWT tokens contain `school_id`; all queries filter by it
- Super admin can access all schools; school admins are isolated to their school

### Scaling Considerations

| Layer | Approach |
|---|---|
| Flask API | Horizontal scaling via Gunicorn workers; load balancer |
| MySQL | Primary-replica read scaling; connection pooling (SQLAlchemy) |
| Redis | Single instance for rate limiting (or Redis Cluster for HA) |
| Evolution API | One instance per deployment; scales by adding instances per school |
| Static Assets | CDN-served React build (Nginx or Cloudflare) |
| Push Notifications | Batched delivery via pywebpush async workers |

---

## 10. Key Feature Modules

### Module Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TATUBU MODULES                        │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │ Attendance │  │    Bus    │  │    Timetable &    │   │
│  │  Tracking  │  │ Management│  │   Substitutions   │   │
│  └───────────┘  └───────────┘  └───────────────────┘   │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │   Multi-  │  │   Push /  │  │  Parent Pickup    │   │
│  │  Channel  │  │   In-App  │  │     System        │   │
│  │   Notif.  │  │   Notif.  │  │                   │   │
│  └───────────┘  └───────────┘  └───────────────────┘   │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │ Analytics │  │  User &   │  │   Action Logging  │   │
│  │ & Reports │  │  School   │  │   & Audit Trail   │   │
│  │           │  │  MGMT     │  │                   │   │
│  └───────────┘  └───────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Module Descriptions

| Module | Description |
|---|---|
| **Attendance** | Record present/absent/late/excused per student per subject. Daily confirmation, summary views, monthly reports, repeated absence detection. |
| **Bus Management** | QR code boarding/exit scans, real-time student location on bus, forgotten student alerts, daily reports. |
| **Timetable** | Import from XML (aSc Timetables format), teacher mapping, period management, activate/deactivate versions. |
| **Substitutions** | Automated scoring algorithm selects best available substitute teacher when a teacher is absent. |
| **Notifications** | Unified notification center with in-app, push (VAPID), SMS, and WhatsApp delivery channels. Per-user preferences. |
| **Parent Pickup** | Parent-facing pickup request system with PIN auth. Display screen for school reception. |
| **Analytics** | Teacher performance reports, attendance statistics, bus reports, exportable to PDF/Excel. |
| **User & School Management** | Multi-school CRUD, role-based user management, bulk import via structured data. |
| **Action Logs** | Immutable audit trail of all admin and data-modification actions with IP tracking. |
| **News** | School-level and system-level announcements visible to users per their role/school. |
