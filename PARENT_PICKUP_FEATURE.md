# Parent Pickup Feature Implementation

## Overview
This document describes the new parent pickup feature that allows parents to request and confirm student pickup from school.

## Features Implemented

### 1. Database Model (`back/app/models.py`)
- Added `ParentPickup` model with the following fields:
  - `student_id`: Reference to the student
  - `school_id`: Reference to the school
  - `parent_phone`: Parent's phone number for verification
  - `status`: Pickup status (pending, confirmed, completed)
  - `request_time`: When parent requested pickup
  - `confirmation_time`: When parent confirmed arrival at school
  - `completed_time`: When pickup was completed
  - `pickup_date`: Date of pickup for filtering

### 2. Backend API Routes (`back/app/routes/parent_pickup_routes.py`)
Created new API endpoints:

#### `/parent-pickup/parent-login` (POST)
- Parent login by scanning student QR code and verifying with phone number
- Returns JWT token for parent session

#### `/parent-pickup/request-pickup` (POST - JWT Required)
- Parent requests to pick up their student
- Creates pickup request with "pending" status

#### `/parent-pickup/confirm-pickup` (POST - JWT Required)
- Parent confirms arrival at school
- Updates status to "confirmed"
- Student name will appear on TV display

#### `/parent-pickup/complete-pickup` (POST - JWT Required)
- Parent confirms they have the student
- Updates status to "completed"

#### `/parent-pickup/my-pickup-status` (GET - JWT Required)
- Get parent's current pickup status for today

#### `/parent-pickup/confirmed-pickups` (GET - Public)
- Get all confirmed pickups for TV display
- Can be filtered by school_id
- Refreshes every 10 seconds

#### `/parent-pickup/all-pickups` (GET - JWT Required, Admin)
- Admin endpoint to view all pickup requests
- Supports date and status filtering

#### `/parent-pickup/cancel-pickup` (POST - JWT Required)
- Cancel a pickup request

### 3. Frontend - Login Page (`frontend/src/pages/Auth/Login.js`)
- Added parent mode toggle button with QR icon
- When enabled:
  - Username field becomes "Student Username"
  - Password field becomes "Parent Phone Number"
  - Login process uses parent login endpoint

### 4. Frontend - Student Dashboard (`frontend/src/pages/Dashboard/Dashboard.js`)
Added parent pickup section that appears when parent is logged in:

**Pending Status:**
- Shows request time
- "I've Arrived" button to confirm arrival
- Cancel button

**Confirmed Status:**
- Shows request time and arrival time
- Alert that student name appears on TV screen
- "Confirm Pickup" button to complete

**Completed Status:**
- Shows all timestamps (request, arrival, completion)
- Success message

### 5. Frontend - Pickup Display Page (`frontend/src/pages/PickupDisplay/PickupDisplay.js`)
Full-screen TV display showing:
- Real-time clock
- List of students ready for pickup
- Student name, username, and arrival time
- Beautiful gradient design with animations
- Auto-refreshes every 10 seconds

**URL:** `/pickup-display`

### 6. API Service Updates (`frontend/src/services/api.js`)
Added `parentPickupAPI` with methods:
- `requestPickup()`
- `confirmPickup()`
- `completePickup()`
- `getMyPickupStatus()`
- `getConfirmedPickups(schoolId)`
- `getAllPickups(params)`
- `cancelPickup(pickupId)`

### 7. Authentication Context (`frontend/src/contexts/AuthContext.js`)
- Updated to support parent mode login
- Stores `isParentMode` flag in localStorage
- Handles parent login flow

### 8. App Routing (`frontend/src/App.js`)
- Added public route `/pickup-display` for TV screen
- No authentication required for display page

## Usage Flow

### For Parents:
1. **Login**: 
   - Toggle "Parent Mode" on login page
   - Scan student's QR code OR enter student username
   - Enter parent phone number (must match student's phone)
   - Click login

2. **Request Pickup**:
   - On dashboard, click "Send Pickup Request"
   - School is notified

3. **Confirm Arrival**:
   - When at school, click "I've Arrived"
   - Student name appears on TV display

4. **Complete Pickup**:
   - After receiving student, click "Confirm Pickup"
   - Process is complete

### For School Staff:
1. **TV Display**:
   - Open `/pickup-display` on TV browser
   - Shows all students with confirmed parent arrival
   - Auto-refreshes every 10 seconds
   - Full-screen, no login required

2. **Admin Management**:
   - View all pickup requests in admin panel
   - Filter by date and status
   - Monitor pickup activity

## Database Migration Required

After deploying, run:

```bash
cd back
flask db revision --autogenerate -m "Add ParentPickup table"
flask db upgrade
```

Or manually create the `parent_pickups` table:

```sql
CREATE TABLE parent_pickups (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    school_id INTEGER NOT NULL REFERENCES schools(id),
    parent_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_time TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmation_time TIMESTAMP WITH TIME ZONE,
    completed_time TIMESTAMP WITH TIME ZONE,
    pickup_date DATE NOT NULL
);

CREATE INDEX idx_parent_pickups_student ON parent_pickups(student_id);
CREATE INDEX idx_parent_pickups_school ON parent_pickups(school_id);
CREATE INDEX idx_parent_pickups_date_status ON parent_pickups(pickup_date, status);
```

## Security Features

1. **Phone Verification**: Parents must enter the phone number registered with the student
2. **JWT Authentication**: All parent actions require valid JWT token
3. **School Isolation**: Pickup requests are filtered by school
4. **Date-based Filtering**: Only today's pickups are processed

## Configuration Notes

- Pickup requests are automatically filtered by current date
- TV display refreshes every 10 seconds
- Parent dashboard refreshes pickup status every 15 seconds
- Completed pickups remain visible on dashboard but don't show on TV

## Files Modified/Created

### Backend:
- ✅ `back/app/models.py` - Added ParentPickup model
- ✅ `back/app/routes/parent_pickup_routes.py` - New file
- ✅ `back/app/__init__.py` - Registered new blueprint

### Frontend:
- ✅ `frontend/src/pages/Auth/Login.js` - Added parent mode
- ✅ `frontend/src/pages/Dashboard/Dashboard.js` - Added pickup section
- ✅ `frontend/src/pages/PickupDisplay/PickupDisplay.js` - New file
- ✅ `frontend/src/services/api.js` - Added pickup API methods
- ✅ `frontend/src/contexts/AuthContext.js` - Added parent login support
- ✅ `frontend/src/App.js` - Added pickup display route

## Testing Checklist

- [ ] Database migration successful
- [ ] Parent can login with student QR and phone
- [ ] Parent can request pickup
- [ ] Parent can confirm arrival
- [ ] Parent can complete pickup
- [ ] TV display shows confirmed pickups
- [ ] TV display auto-refreshes
- [ ] Parent dashboard shows correct status
- [ ] Can cancel pickup request
- [ ] Multiple parents can use system simultaneously
- [ ] Phone number verification works

## Future Enhancements

1. SMS notifications to parents when student is ready
2. Admin dashboard for pickup management
3. Historical pickup reports
4. Multiple phone numbers per student (both parents)
5. Estimated wait time display
6. QR code scanner integration for faster parent login
7. Push notifications for mobile app
