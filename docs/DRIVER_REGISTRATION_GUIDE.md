# 🚗 Driver Registration & Bus Assignment Guide

## ✅ Complete Implementation Summary

### **1. Driver Registration** ✅

**Location:** `/app/users` (إدارة المستخدمين)

**How to Register a Driver:**
1. Go to **إدارة المستخدمين** (Users Management)
2. Click **إضافة مستخدم جديد** (Add New User)
3. Fill in the form:
   - Username
   - Email
   - Full Name
   - Phone Number
   - **Role: Select "سائق" (Driver)**
   - Password
4. Click **إضافة المستخدم** (Add User)
5. Driver account is created!

**Note:** 
- School Admin can add drivers
- Admin can add drivers for any school
- Driver role is now available in the dropdown

---

### **2. Assign Driver to Bus** ✅

**Location:** `/app/buses` (إدارة الحافلات)

**How to Assign Driver:**
1. Go to **إدارة الحافلات** (Bus Management)
2. Click **تعديل** (Edit) button on any bus
3. In the edit form, you'll see:
   - Bus Number
   - Bus Name
   - Capacity
   - Plate Number
   - **السائق (Driver)** - Dropdown with all available drivers
4. Select a driver from the dropdown
5. Click **تحديث الحافلة** (Update Bus)
6. Driver is now assigned to the bus!

**Note:**
- Only one driver per bus (enforced by database)
- If driver is already assigned to another bus, you'll need to unassign them first
- Drivers without buses will appear in the dropdown

---

### **3. Assign Students to Bus** ✅

**Location:** `/app/buses` (إدارة الحافلات)

**How to Assign Students:**
1. Go to **إدارة الحافلات** (Bus Management)
2. Click **تعيين طلاب** (Assign Students) button (👥 icon) on any bus
3. In the modal, you'll see:
   - **Current Students** - List of students already assigned
   - **Add Students** - Search and select students to add
4. Search for students by name or username
5. Check the boxes next to students you want to assign
6. Click **تعيين (X)** button (X = number of selected students)
7. Students are now assigned to the bus!

**Note:**
- Students can be assigned to multiple buses
- Capacity is checked before assignment
- You can remove students by clicking **إزالة** (Remove) next to their name

---

## 📍 Quick Reference

### **Where to Go:**

| Task | Page | Button/Action |
|------|------|---------------|
| **Register Driver** | `/app/users` | إضافة مستخدم جديد → Select "سائق" |
| **Assign Driver to Bus** | `/app/buses` | Edit bus → Select driver from dropdown |
| **Assign Students to Bus** | `/app/buses` | Click 👥 icon → Select students → تعيين |
| **View Bus Details** | `/app/buses` | View table (shows driver name, student count) |

---

## 🎯 Complete Workflow

### **Step 1: Create Driver Account**
```
إدارة المستخدمين → إضافة مستخدم جديد
→ Fill form → Role: سائق → إضافة
```

### **Step 2: Create Bus**
```
إدارة الحافلات → إضافة حافلة جديدة
→ Fill bus details → إضافة الحافلة
```

### **Step 3: Assign Driver to Bus**
```
إدارة الحافلات → Edit bus → Select driver → تحديث
```

### **Step 4: Assign Students to Bus**
```
إدارة الحافلات → 👥 icon → Select students → تعيين
```

### **Step 5: Driver Uses Scanner**
```
Driver logs in → Auto-redirected to scanner
→ Bus pre-selected → Start scanning!
```

---

## ✨ Features Added

✅ **Driver Role in User Registration**
- Available in role dropdown
- Shows description: "يمكن للسائق تسجيل الدخول لمسح رموز QR للطلاب..."
- Works for both Admin and School Admin

✅ **Driver Tab in Users Page**
- New "السائقين" (Drivers) tab
- Filter by driver role
- View all drivers

✅ **Driver Assignment in Bus Form**
- Dropdown showing all available drivers
- Shows driver name and username
- Can assign/unassign drivers
- Shows message if no drivers available

✅ **Student Assignment Modal**
- Search functionality
- Current students list
- Add/remove students
- Capacity checking

✅ **Backend Support**
- Driver model registered
- Driver registration endpoint updated
- Bus-driver relationship working

---

## 🔧 Technical Details

### **Database:**
- `drivers` table linked to `users`
- `buses.driver_id` references `drivers.id` (unique constraint)
- One driver = One bus (enforced)

### **API Endpoints:**
- `POST /api/auth/register` - Supports driver role
- `PUT /api/bus/buses/:id` - Update bus (including driver_id)
- `GET /api/bus/driver/my-bus` - Get driver's bus

### **Frontend:**
- Users.js - Driver role in registration
- BusManagement.js - Driver assignment dropdown
- BusManagement.js - Student assignment modal
- Helpers.js - Driver role display name and color

---

## 📝 Summary

**To Register Drivers:**
→ Go to `/app/users` → Add user → Select "سائق" role

**To Assign Drivers to Buses:**
→ Go to `/app/buses` → Edit bus → Select driver from dropdown

**To Assign Students to Buses:**
→ Go to `/app/buses` → Click 👥 icon → Select students → تعيين

Everything is ready to use! 🎉


