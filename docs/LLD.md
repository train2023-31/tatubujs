# Tatubu School Management System — Low-Level Design (LLD)

> **Version:** 1.0 | **Date:** February 2026

---

## Table of Contents

1. [Database Schema (LLD)](#1-database-schema-lld)
2. [API Endpoint Reference](#2-api-endpoint-reference)
3. [Backend Service Layer](#3-backend-service-layer)
4. [Frontend Component Architecture](#4-frontend-component-architecture)
5. [Authentication & Authorization Flow](#5-authentication--authorization-flow)
6. [Notification Delivery Pipeline](#6-notification-delivery-pipeline)
7. [Bus Tracking Logic](#7-bus-tracking-logic)
8. [Substitution Algorithm](#8-substitution-algorithm)
9. [Timetable XML Import Pipeline](#9-timetable-xml-import-pipeline)
10. [Parent Pickup State Machine](#10-parent-pickup-state-machine)

---

## 1. Database Schema (LLD)

### Entity-Relationship Overview

```
schools ──< users (polymorphic)
              ├── students
              ├── teachers
              └── drivers

schools ──< classes ──< subjects
schools ──< buses ──< bus_students >── students

attendances: student + class + subject + date + status

timetables ──< timetable_days ──< timetable_periods
timetables ──< timetable_schedules (day + period + teacher + subject + class)
timetables ──< timetable_teacher_mappings (xml_name → teacher)

teacher_substitutions ──< substitution_assignments

notifications ──< notification_reads
             ──< notification_deleted
push_subscriptions (user → device endpoint)
notification_preferences (user → per-type settings)

parent_pickups (student + parent_phone + status + timestamps)
action_logs (user + action + ip + timestamp)
```

---

### Table: `schools`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | School identifier |
| `name` | VARCHAR(255) | NOT NULL | School name |
| `address` | TEXT | - | Physical address |
| `is_active` | BOOLEAN | DEFAULT TRUE | Enable/disable school |
| `ibulk_sms_enabled` | BOOLEAN | DEFAULT FALSE | SMS feature toggle |
| `ibulk_username` | VARCHAR(100) | - | iBulk SMS username |
| `ibulk_password` | VARCHAR(100) | - | iBulk SMS password |
| `ibulk_sender_id` | VARCHAR(20) | - | SMS sender ID |
| `ibulk_api_url` | VARCHAR(255) | - | iBulk API endpoint |
| `ibulk_balance_threshold` | FLOAT | DEFAULT 10.0 | Low balance alert threshold |
| `ibulk_current_balance` | FLOAT | - | Cached balance |
| `evolution_whatsapp_enabled` | BOOLEAN | DEFAULT FALSE | WhatsApp toggle |
| `evolution_api_url` | VARCHAR(255) | - | Evolution API URL |
| `evolution_api_key` | VARCHAR(255) | - | Evolution API key |
| `evolution_instance_name` | VARCHAR(100) | - | WhatsApp instance name |
| `evolution_instance_token` | VARCHAR(255) | - | Instance auth token |
| `evolution_phone_number` | VARCHAR(20) | - | School WhatsApp number |
| `evolution_instance_status` | VARCHAR(50) | - | Connection status |
| `created_at` | DATETIME | DEFAULT NOW() | Creation timestamp |

---

### Table: `users` (Base — Polymorphic)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | User identifier |
| `username` | VARCHAR(80) | UNIQUE, NOT NULL | Login username |
| `password_hash` | VARCHAR(255) | NOT NULL | PBKDF2-SHA256 hash |
| `role` | VARCHAR(20) | NOT NULL | admin / school_admin / teacher / student / driver / data_analyst |
| `school_id` | INT | FK → schools.id | School association |
| `first_name` | VARCHAR(100) | - | First name |
| `last_name` | VARCHAR(100) | - | Last name |
| `email` | VARCHAR(150) | - | Email address |
| `phone` | VARCHAR(20) | - | Phone number |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account status |
| `created_at` | DATETIME | DEFAULT NOW() | Registration date |
| `type` | VARCHAR(20) | NOT NULL | Polymorphic discriminator |

---

### Table: `students` (extends `users`)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, FK → users.id | Student ID |
| `student_id_number` | VARCHAR(50) | - | School-assigned ID |
| `parent_phone` | VARCHAR(20) | - | Parent contact |
| `parent_phone_2` | VARCHAR(20) | - | Secondary parent contact |
| `parent_pin` | VARCHAR(6) | - | 6-digit pickup PIN |
| `parent_pin_attempts` | INT | DEFAULT 0 | Failed PIN attempts |
| `parent_pin_locked` | BOOLEAN | DEFAULT FALSE | PIN lockout state |
| `behavior_note` | TEXT | - | Teacher behavior notes |
| `location` | VARCHAR(100) | - | Home area/region |
| `qr_code` | TEXT | - | Encoded QR payload |

---

### Table: `teachers` (extends `users`)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, FK → users.id | Teacher ID |
| `employee_id` | VARCHAR(50) | - | HR employee number |
| `salary` | FLOAT | - | Monthly salary |
| `weekly_classes` | INT | - | Expected classes/week |
| `job_name` | VARCHAR(100) | - | Position/title |
| `specialization` | VARCHAR(100) | - | Subject specialization |

---

### Table: `drivers` (extends `users`)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, FK → users.id | Driver ID |
| `license_number` | VARCHAR(50) | - | Driver's license |
| `license_expiry` | DATE | - | License expiry date |

---

### Table: `classes`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Class identifier |
| `name` | VARCHAR(100) | NOT NULL | Class name (e.g. "Grade 5A") |
| `school_id` | INT | FK → schools.id | School |
| `teacher_id` | INT | FK → teachers.id | Home room teacher |
| `academic_year` | VARCHAR(20) | - | e.g. "2025-2026" |
| `grade_level` | INT | - | Grade number |
| `created_at` | DATETIME | DEFAULT NOW() | - |

---

### Table: `subjects`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Subject identifier |
| `name` | VARCHAR(100) | NOT NULL | Subject name |
| `school_id` | INT | FK → schools.id | School scope |
| `color` | VARCHAR(7) | - | Hex color for UI |

---

### Table: `attendances`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Record ID |
| `student_id` | INT | FK → students.id | Student |
| `class_id` | INT | FK → classes.id | Class |
| `subject_id` | INT | FK → subjects.id | Subject |
| `teacher_id` | INT | FK → teachers.id | Recording teacher |
| `date` | DATE | NOT NULL | Attendance date |
| `status` | ENUM | NOT NULL | present / absent / late / excused |
| `excuse_note` | TEXT | - | Reason for excuse |
| `school_id` | INT | FK → schools.id | School |
| `created_at` | DATETIME | DEFAULT NOW() | Record creation |

> **Unique Constraint**: `(student_id, subject_id, date)` — prevents duplicate records per student per subject per day.

---

### Table: `buses`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Bus ID |
| `name` | VARCHAR(100) | NOT NULL | Bus identifier / route name |
| `plate_number` | VARCHAR(20) | - | License plate |
| `capacity` | INT | - | Max students |
| `driver_id` | INT | FK → drivers.id | Assigned driver |
| `school_id` | INT | FK → schools.id | School |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active status |

---

### Table: `bus_scans`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Scan record ID |
| `student_id` | INT | FK → students.id | Scanned student |
| `bus_id` | INT | FK → buses.id | Bus |
| `driver_id` | INT | FK → drivers.id | Scanning driver |
| `scan_type` | ENUM | NOT NULL | board / exit |
| `scanned_at` | DATETIME | DEFAULT NOW() | Scan timestamp (Oman time) |
| `school_id` | INT | FK → schools.id | School |

---

### Table: `timetables`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Timetable ID |
| `name` | VARCHAR(200) | NOT NULL | Timetable version name |
| `school_id` | INT | FK → schools.id | School |
| `is_active` | BOOLEAN | DEFAULT FALSE | Only one active at a time |
| `xml_source` | TEXT | - | Original XML content |
| `created_at` | DATETIME | DEFAULT NOW() | Import date |

### Table: `timetable_schedules`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Schedule entry ID |
| `timetable_id` | INT | FK → timetables.id | Parent timetable |
| `day_id` | INT | FK → timetable_days.id | Day of week |
| `period_id` | INT | FK → timetable_periods.id | Time period |
| `teacher_id` | INT | FK → teachers.id | Assigned teacher |
| `subject_id` | INT | FK → subjects.id | Subject |
| `class_id` | INT | FK → classes.id | Class |

---

### Table: `teacher_substitutions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Substitution record |
| `absent_teacher_id` | INT | FK → teachers.id | Absent teacher |
| `date` | DATE | NOT NULL | Absence date |
| `school_id` | INT | FK → schools.id | School |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active/closed |
| `created_by` | INT | FK → users.id | Created by admin |
| `created_at` | DATETIME | DEFAULT NOW() | - |

### Table: `substitution_assignments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Assignment ID |
| `substitution_id` | INT | FK → teacher_substitutions.id | Parent record |
| `substitute_teacher_id` | INT | FK → teachers.id | Substitute teacher |
| `period_id` | INT | FK → timetable_periods.id | Period to cover |
| `class_id` | INT | FK → classes.id | Class to cover |
| `subject_id` | INT | FK → subjects.id | Subject to cover |

---

### Table: `notifications`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Notification ID |
| `title` | VARCHAR(255) | NOT NULL | Notification title |
| `body` | TEXT | NOT NULL | Message content |
| `type` | VARCHAR(50) | NOT NULL | attendance / bus / timetable / substitution / pickup / system |
| `target_type` | VARCHAR(30) | NOT NULL | all / role / user / school |
| `target_role` | VARCHAR(20) | - | Target role (if role-targeted) |
| `target_user_id` | INT | FK → users.id | Target user (if user-targeted) |
| `school_id` | INT | FK → schools.id | School scope |
| `data` | JSON | - | Extra payload data |
| `created_at` | DATETIME | DEFAULT NOW() | - |

### Table: `push_subscriptions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Subscription ID |
| `user_id` | INT | FK → users.id | Subscriber |
| `endpoint` | TEXT | NOT NULL | Push service URL |
| `p256dh` | TEXT | NOT NULL | Public key |
| `auth` | TEXT | NOT NULL | Auth secret |
| `user_agent` | TEXT | - | Device/browser info |
| `created_at` | DATETIME | DEFAULT NOW() | Subscription date |

---

### Table: `parent_pickups`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Pickup request ID |
| `student_id` | INT | FK → students.id | Student |
| `parent_phone` | VARCHAR(20) | NOT NULL | Requesting parent |
| `school_id` | INT | FK → schools.id | School |
| `status` | ENUM | NOT NULL | requested / confirmed / completed / cancelled |
| `requested_at` | DATETIME | DEFAULT NOW() | Request time |
| `confirmed_at` | DATETIME | - | Staff confirmation time |
| `completed_at` | DATETIME | - | Pickup completion time |
| `notes` | TEXT | - | Optional notes |

---

### Table: `action_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AI | Log ID |
| `user_id` | INT | FK → users.id | Acting user |
| `action` | VARCHAR(255) | NOT NULL | Action description |
| `details` | TEXT | - | Additional context |
| `ip_address` | VARCHAR(50) | - | Client IP |
| `school_id` | INT | FK → schools.id | School |
| `created_at` | DATETIME | DEFAULT NOW() | Timestamp |

---

## 2. API Endpoint Reference

### Base URL
```
Production: https://<your-domain>/api
Development: http://localhost:5000/api
```

### Authentication Header
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

### 2.1 Authentication (`/api/auth`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| POST | `/login` | No | - | Login; returns access + refresh tokens |
| POST | `/register` | Yes | admin | Create admin user |
| POST | `/register_Students` | Yes | school_admin | Bulk register students |
| POST | `/register_Teacher` | Yes | school_admin | Bulk register teachers |
| POST | `/register_Driver` | Yes | school_admin | Register driver |
| GET | `/user` | Yes | Any | Get current user profile |
| PUT | `/update_user/<id>` | Yes | admin/school_admin | Update user fields |
| DELETE | `/user/<id>` | Yes | admin | Delete user |
| PUT | `/change_password` | Yes | Any | Change own password |
| POST | `/send-absence-notifications` | Yes | teacher/admin | Send WhatsApp absence alerts |
| GET | `/view_logs` | Yes | admin/school_admin | Paginated action logs |
| DELETE | `/delete_school_data` | Yes | admin | Selective school data deletion |
| PUT | `/toggle_school_status/<id>` | Yes | admin | Activate/deactivate school |

**Login Request/Response:**
```json
// POST /api/auth/login
Request:
{
  "username": "teacher01",
  "password": "securepassword"
}

Response 200:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": 42,
    "username": "teacher01",
    "role": "teacher",
    "school_id": 3,
    "first_name": "Ahmed",
    "last_name": "Al-Rashidi"
  }
}

Response 401:
{
  "error": "Invalid credentials"
}
```

---

### 2.2 Attendance (`/api/attendance`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| POST | `/takes` | Yes | teacher | Record attendance for a class |
| GET | `/attendanceByClass/<class_id>` | Yes | teacher/admin | Monthly attendance matrix |
| GET | `/attendanceByClass_subject/<class_id>` | Yes | teacher | Attendance by subject/date |
| GET | `/attendanceSummary` | Yes | admin/school_admin | Daily summary all classes |
| GET | `/teacherReport` | Yes | admin | Teacher attendance performance |
| GET | `/teacherHistory/<teacher_id>` | Yes | admin | Teacher history |
| GET | `/attendanceDetailsByStudent` | Yes | admin/teacher | Per-student details by date |
| GET | `/repeated_absence` | Yes | admin/teacher | Students with ≥ N absences |
| GET | `/students_with_excused_attendance` | Yes | teacher/admin | Excused students |
| PUT | `/update_excuse_note` | Yes | teacher/admin | Bulk update excuse notes |
| POST | `/confirm-day-absents` | Yes | teacher | Confirm daily absences |
| GET | `/student/my-attendance-history` | Yes | student | Own attendance history |
| GET | `/student/my-attendance-stats` | Yes | student | Own statistics |
| POST | `/send-daily-sms-reports` | Yes | admin | Send SMS attendance reports |
| GET | `/check-sms-balance` | Yes | admin | Check iBulk SMS balance |
| POST | `/send-test-sms` | Yes | admin | Send test SMS |

**Record Attendance Request:**
```json
// POST /api/attendance/takes
{
  "class_id": 5,
  "subject_id": 12,
  "date": "2026-02-19",
  "attendance": [
    { "student_id": 101, "status": "present" },
    { "student_id": 102, "status": "absent" },
    { "student_id": 103, "status": "late" },
    { "student_id": 104, "status": "excused", "excuse_note": "Medical" }
  ]
}
```

---

### 2.3 Bus Management (`/api/bus`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/buses` | Yes | admin/school_admin | List all buses |
| POST | `/buses` | Yes | admin/school_admin | Create bus |
| PUT | `/buses/<id>` | Yes | admin/school_admin | Update bus |
| DELETE | `/buses/<id>` | Yes | admin | Delete bus |
| GET | `/buses/<id>/students` | Yes | admin/driver | Bus student list |
| POST | `/buses/<id>/assign-students` | Yes | admin | Assign students to bus |
| POST | `/buses/<id>/remove-students` | Yes | admin | Remove students from bus |
| POST | `/scan` | Yes | driver | Record QR scan (board/exit) |
| GET | `/scans` | Yes | admin/driver | Scan history with filters |
| GET | `/students/<id>/bus-status` | Yes | admin | Student current bus status |
| GET | `/buses/<id>/current-students` | Yes | driver/admin | Students currently on bus |
| GET | `/reports/daily` | Yes | admin | Daily bus report |
| POST | `/check-forgotten-students` | Yes | admin/system | Check for forgotten students |
| GET | `/driver/my-bus` | Yes | driver | Driver's assigned bus |

**Scan Request:**
```json
// POST /api/bus/scan
{
  "student_qr_payload": "TATUBU_STU_101_2025",
  "bus_id": 3,
  "scan_type": "board"
}

Response 200:
{
  "student_id": 101,
  "student_name": "Fatima Al-Balushi",
  "scan_type": "board",
  "bus_name": "Route A - North",
  "timestamp": "2026-02-19T07:32:15+04:00"
}
```

---

### 2.4 Timetable (`/api/timetable`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/timetables` | Yes | admin/teacher | List timetables |
| GET | `/timetables/<id>` | Yes | admin/teacher | Full timetable detail |
| POST | `/timetables` | Yes | admin | Create from XML upload |
| PUT | `/timetables/<id>` | Yes | admin | Update timetable |
| DELETE | `/timetables/<id>` | Yes | admin | Delete timetable |
| GET | `/timetables/<id>/teacher-mappings` | Yes | admin | XML→DB teacher mappings |
| PUT | `/timetables/<id>/teacher-mappings` | Yes | admin | Update teacher mappings |
| POST | `/timetables/<id>/activate` | Yes | admin | Set as active timetable |
| GET | `/teacher/my-timetable` | Yes | teacher | Own weekly schedule |

---

### 2.5 Substitutions (`/api/substitutions`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/` | Yes | admin/school_admin | List substitutions |
| POST | `/calculate` | Yes | admin | Auto-calculate substitutes |
| POST | `/` | Yes | admin | Create manual substitution |
| GET | `/<id>` | Yes | admin | Get substitution detail |
| PUT | `/<id>` | Yes | admin | Update substitution |
| DELETE | `/<id>` | Yes | admin | Delete substitution |
| POST | `/<id>/deactivate` | Yes | admin | Close substitution |
| GET | `/teacher/<id>` | Yes | teacher | Own substitution assignments |

---

### 2.6 Notifications (`/api/notifications`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| GET | `/` | Yes | Any | List notifications (paginated) |
| GET | `/unread-count` | Yes | Any | Unread count |
| POST | `/<id>/read` | Yes | Any | Mark single as read |
| POST | `/mark-all-read` | Yes | Any | Mark all as read |
| DELETE | `/<id>/delete` | Yes | Any | Soft delete for current user |
| POST | `/` | Yes | admin | Create notification |
| GET | `/push-status` | Yes | Any | Push subscription status |
| POST | `/subscribe` | Yes | Any | Register push subscription |
| POST | `/unsubscribe` | Yes | Any | Remove push subscription |
| GET | `/preferences` | Yes | Any | Get notification preferences |
| PUT | `/preferences` | Yes | Any | Update notification preferences |

**Push Subscribe Request:**
```json
// POST /api/notifications/subscribe
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcR...",
    "auth": "tB3..."
  }
}
```

---

### 2.7 Parent Pickup (`/api/parent-pickup`)

| Method | Endpoint | Auth Required | Role | Description |
|---|---|---|---|---|
| POST | `/verify-parent-phone` | No | - | Verify parent phone |
| POST | `/parent-login` | No | - | Login with phone + PIN |
| POST | `/reset-parent-pin` | No | - | Reset own PIN |
| POST | `/admin-reset-parent-pin` | Yes | admin | Admin reset parent PIN |
| POST | `/request-pickup` | Yes (parent) | - | Submit pickup request |
| POST | `/confirm-pickup` | Yes | admin/teacher | Confirm parent arrival |
| POST | `/complete-pickup` | Yes | admin/teacher | Complete pickup |
| GET | `/my-pickup-status` | Yes (parent) | - | Parent's active pickup status |
| GET | `/confirmed-pickups` | No | - | Public display endpoint |
| GET | `/display-pickups` | No | - | TV display view |
| GET | `/all-pickups` | Yes | admin | All pickups (admin) |
| POST | `/cancel-pickup` | Yes | admin/parent | Cancel pickup |

---

## 3. Backend Service Layer

### 3.1 Notification Service (`notification_service.py`)

Handles delivery of notifications across all channels (in-app DB, push, WhatsApp).

```
notify_student_attendance(student_id, attendance_status, date)
    ├── Create Notification record (DB)
    ├── Send Web Push → student device
    └── Send WhatsApp → parent phone (if enabled)

notify_student_bus_scan(student_id, bus_id, scan_type)
    ├── Create Notification record (DB)
    ├── Send Web Push → student/parent device
    └── Send WhatsApp → parent phone (if enabled)

notify_teacher_substitution(teacher_id, substitution_id)
    ├── Create Notification record (DB)
    └── Send Web Push → teacher device

notify_driver_forgot_students(driver_id, bus_id, student_ids)
    ├── Create Notification record (DB)
    └── Send Web Push → driver device

notify_admin_forgot_students_on_bus(school_id, bus_id, student_ids)
    ├── Create Notification record (DB)
    └── Send Web Push → all admins in school
```

### 3.2 WhatsApp Service (`evolution_whatsapp_service.py`)

```python
class EvolutionWhatsAppService:
    def __init__(self, school: School)
        # Loads: api_url, api_key, instance_name from school record

    def send_message(phone: str, message: str) → dict
        # POST {api_url}/message/sendText/{instance_name}
        # Headers: { apikey: api_key }
        # Returns: { key: { id }, status: "PENDING"|"SENT"|"DELIVERED" }

    def check_instance_status() → str
        # GET {api_url}/instance/connectionState/{instance_name}

    def get_qr_code() → str
        # GET {api_url}/instance/connect/{instance_name}
```

### 3.3 iBulk SMS Service (`ibulk_sms_service.py`)

```python
class IBulkSMSService:
    def __init__(self, school: School)
        # Loads credentials from school record

    def send_sms(phone: str, message: str) → dict
        # POST ibulk_api_url with auth + message

    def send_bulk_sms(recipients: list[dict]) → dict
        # Batch send to multiple phones

    def check_balance() → float
        # GET balance endpoint; updates school.ibulk_current_balance

    def send_daily_attendance_report(class_id, date) → dict
        # Compose and send per-student attendance report to parents
```

### 3.4 Push Notification Delivery

```python
def send_push_notification(subscription: PushSubscription, payload: dict):
    webpush(
        subscription_info={
            "endpoint": subscription.endpoint,
            "keys": { "p256dh": subscription.p256dh, "auth": subscription.auth }
        },
        data=json.dumps(payload),
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_claims={ "sub": f"mailto:{VAPID_CLAIM_EMAIL}" }
    )
```

---

## 4. Frontend Component Architecture

### 4.1 Component Hierarchy

```
App.js
 ├── AuthContext.Provider
 │    └── NotificationContext.Provider
 │         └── Router
 │              ├── Layout (sidebar + header)
 │              │    ├── Header
 │              │    │    ├── NotificationBell
 │              │    │    └── UserMenu
 │              │    ├── Sidebar (role-based nav links)
 │              │    └── <Outlet> (page content)
 │              └── Public Routes
 │                   ├── /login
 │                   └── /pickup-display (TV mode, no sidebar)
```

### 4.2 Key Component Details

#### `NotificationBell`
- Polls `GET /api/notifications/unread-count` every 60s
- Displays badge with count
- Dropdown shows last 5 notifications
- Integrates with `NotificationContext`

#### `BusScanner`
- Uses `html5-qrcode` library for camera access
- Decodes QR payload → extracts student ID
- Sends `POST /api/bus/scan`
- Displays result card (student name, scan type)
- Works on mobile (camera API)

#### `StudentQRCode`
- Generates QR code from student `qr_code` field using `qrcode.react`
- Supports bulk PDF export via `jsPDF`
- Print-optimized layout

#### `Dashboard` (role-specific)
- Reads JWT role from `AuthContext`
- Renders `StatCard` components with role-appropriate KPIs
- Teacher: today's classes, attendance pending
- Admin: school-wide attendance rate, bus status, alerts
- Driver: bus capacity, today's scans
- Student: own attendance stats

#### `PushNotificationSettings`
- Checks browser push support (`'serviceWorker' in navigator && 'PushManager' in window`)
- Calls `Notification.requestPermission()`
- Subscribes via `registration.pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })`
- Posts subscription to `POST /api/notifications/subscribe`

### 4.3 State Management

| State | Mechanism | Scope |
|---|---|---|
| Authentication (JWT) | `AuthContext` + `localStorage` | Global |
| Current User | `AuthContext` | Global |
| Notifications | `NotificationContext` | Global |
| Server Data (lists, queries) | `React Query` (with caching) | Per-component |
| Forms | `React Hook Form` | Per-form |
| UI State (modals, tabs) | `useState` / `useReducer` | Local |

### 4.4 API Service Layer (`frontend/src/services/`)

All API calls are centralized via `axios` with an interceptor that:
1. Attaches `Authorization: Bearer <token>` header
2. On 401 response → redirects to `/login` and clears stored token
3. Handles network errors with toast notifications

---

## 5. Authentication & Authorization Flow

### 5.1 Login Flow

```
POST /api/auth/login
    │
    ├── Rate limit check (5/15min per IP via Redis)
    │
    ├── Query: SELECT * FROM users WHERE username = ?
    │
    ├── verify_password(hash, provided_password)  [Werkzeug]
    │
    ├── Check: user.is_active == True
    │
    ├── Check: school.is_active == True (if school_admin/teacher/etc.)
    │
    ├── Log to action_logs: { action: "login", user_id, ip }
    │
    └── Return:
         access_token: JWT { sub: user_id, role, school_id, exp: +1hr }
         refresh_token: JWT { sub: user_id, exp: +30d }
```

### 5.2 Protected Route Enforcement

```python
@jwt_required()
def protected_endpoint():
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims["role"]
    school_id = claims["school_id"]

    # Role check
    if role not in ALLOWED_ROLES:
        return 403

    # School isolation
    data = Model.query.filter_by(school_id=school_id).all()
```

### 5.3 JWT Token Structure

```json
// Access Token Payload
{
  "sub": 42,              // user_id
  "role": "teacher",
  "school_id": 3,
  "username": "teacher01",
  "first_name": "Ahmed",
  "iat": 1708300000,
  "exp": 1708303600       // +1 hour
}
```

---

## 6. Notification Delivery Pipeline

### 6.1 Delivery Decision Tree

```
Event Occurs (attendance, bus scan, etc.)
    │
    ├── Create Notification record in DB
    │
    ├── Find target users (by role / user_id / school)
    │
    ├── For each target user:
    │    │
    │    ├── Check NotificationPreference for this type
    │    │    └── If disabled → skip
    │    │
    │    ├── [In-App] Notification visible in /notifications page ✓
    │    │
    │    ├── [Push] Find PushSubscription records for user
    │    │    └── Send Web Push via pywebpush (async)
    │    │
    │    └── [WhatsApp/SMS] Only for parent-targeted notifications
    │         ├── Check school.evolution_whatsapp_enabled
    │         │    └── If True → send via Evolution API
    │         └── Check school.ibulk_sms_enabled
    │              └── If True → send via iBulk SMS
```

### 6.2 Service Worker Push Receipt

```javascript
// public/service-worker.js
self.addEventListener('push', (event) => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/logo192.png',
        badge: '/badge.png',
        data: { url: data.url || '/' },
        actions: data.actions || []
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    clients.openWindow(event.notification.data.url);
});
```

---

## 7. Bus Tracking Logic

### 7.1 QR Code Encoding

Each student has a unique QR code payload:
```
Format: TATUBU_STU_{student_id}_{school_id}
Example: TATUBU_STU_101_3
```

The QR scanner decodes this, validates the format, extracts `student_id`, and verifies the student belongs to the driver's bus for the current school.

### 7.2 Scan State Machine

```
Student state on a given day:

  [Not Yet Scanned]
       │
       │ QR scan (board)
       ▼
   [On Bus]
       │
       │ QR scan (exit) at school arrival
       ▼
  [Off Bus / At School]
       │
       │ QR scan (board) at departure
       ▼
   [On Bus - Returning]
       │
       │ QR scan (exit) at home stop
       ▼
  [Home - Arrived]
```

### 7.3 Forgotten Student Detection

```python
# Runs at end of school day (cron / scheduled endpoint)
def check_forgotten_students(school_id):
    buses = Bus.query.filter_by(school_id=school_id, is_active=True).all()
    for bus in buses:
        # Find students with board scan but no subsequent exit scan today
        on_bus = query_students_currently_on_bus(bus.id, date=today)
        if on_bus:
            notify_driver_forgot_students(bus.driver_id, bus.id, on_bus)
            notify_admin_forgot_students_on_bus(school_id, bus.id, on_bus)
```

---

## 8. Substitution Algorithm

### 8.1 Scoring System

When a teacher is absent, the system calculates the best available substitute:

```python
def calculate_substitute_score(candidate_teacher, absent_teacher, period):
    score = 100  # base score

    # Same subject specialization
    if candidate.specialization == period.subject.name:
        score += 30

    # Free period (no class at this time)
    if not has_class_at(candidate, period.day, period.time):
        score += 20

    # Fewer substitutions today (lower load)
    todays_substitutions = count_todays_substitutions(candidate)
    score -= todays_substitutions * 10

    # Same grade level experience
    if teaches_grade(candidate, period.class.grade_level):
        score += 15

    return score
```

### 8.2 Assignment Process

```
POST /api/substitutions/calculate
    │
    ├── Get absent teacher's schedule for the day
    │    (from active timetable)
    │
    ├── For each period the absent teacher has:
    │    │
    │    ├── Get all available teachers in school
    │    │
    │    ├── Filter: not absent themselves
    │    │
    │    ├── Score each candidate
    │    │
    │    └── Assign top-scoring teacher
    │
    └── Create SubstitutionAssignment records
         └── Notify each assigned substitute teacher
```

---

## 9. Timetable XML Import Pipeline

### 9.1 Supported Format

The system imports timetables from **aSc Timetables** XML export format.

```xml
<!-- Example aSc XML structure -->
<timetable>
  <periods>
    <period id="1" name="Period 1" starttime="07:30" endtime="08:15"/>
  </periods>
  <teachers>
    <teacher id="t1" short="AHM" name="Ahmed Al-Rashidi"/>
  </teachers>
  <classes>
    <class id="c1" name="Grade 5A"/>
  </classes>
  <subjects>
    <subject id="s1" name="Mathematics"/>
  </subjects>
  <lessons>
    <lesson id="l1" classids="c1" subjectid="s1" teacherids="t1"
            periodsperweek="5" days="12345"/>
  </lessons>
</timetable>
```

### 9.2 Import Pipeline

```
POST /api/timetable/timetables  (multipart XML upload)
    │
    ├── Parse XML → extract periods, teachers, classes, subjects, lessons
    │
    ├── Create Timetable record (store raw XML)
    │
    ├── Create TimetableDay records (Mon-Fri or per school)
    │
    ├── Create TimetablePeriod records (time slots)
    │
    ├── Create TimetableSchedule records (lessons → day + period)
    │
    ├── Create TimetableTeacherMapping records
    │    └── XML teacher name → NULL (pending admin mapping to DB teacher)
    │
    └── Return: timetable_id + unmapped teachers list

PUT /api/timetable/timetables/<id>/teacher-mappings
    └── Admin maps XML teacher names → DB teacher records

POST /api/timetable/timetables/<id>/activate
    └── Deactivate all other timetables for school
         └── Set this one is_active = True
```

---

## 10. Parent Pickup State Machine

### 10.1 States

```
                    [REQUESTED]
                        │
                        │ Staff sees on display screen
                        │ POST /confirm-pickup
                        ▼
                   [CONFIRMED]
                        │
                        │ Student brought to gate
                        │ POST /complete-pickup
                        ▼
                   [COMPLETED]

From any state:
    POST /cancel-pickup → [CANCELLED]
```

### 10.2 Display Screen

The `/pickup-display` page is designed for a school TV/monitor:
- No authentication required (public endpoint for display only)
- Auto-refreshes every 10 seconds
- Shows confirmed pickups (student name, class, time)
- Designed for large screen readability (large fonts, Arabic RTL)

### 10.3 Parent Authentication

```
POST /api/parent-pickup/verify-parent-phone
    └── Validate phone exists in students.parent_phone

POST /api/parent-pickup/parent-login
    ├── Query: Student with parent_phone = ?
    ├── Check: parent_pin_locked == False
    ├── Verify 6-digit PIN
    ├── On fail: increment parent_pin_attempts
    │    └── If attempts >= 5: set parent_pin_locked = True
    └── On success: reset attempts; return short-lived parent JWT
```
