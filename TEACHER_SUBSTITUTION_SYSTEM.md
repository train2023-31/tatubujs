# نظام إحتياط المعلمين - Teacher Substitution System

## نظرة عامة | Overview

نظام متكامل لإدارة إحتياط المعلمين الغائبين في المدرسة، يقوم بتوزيع حصص المعلم الغائب تلقائياً على المعلمين الإحتياط بناءً على معايير ذكية.

A comprehensive system for managing substitute teachers when a teacher is absent, automatically distributing the absent teacher's classes to substitute teachers based on intelligent criteria.

---

## المميزات | Features

### 1. توزيع ذكي للحصص | Intelligent Class Distribution
- **نفس المادة**: إعطاء الأولوية للمعلمين الذين يدرسون نفس المادة
- **أقل عدد حصص**: توزيع الحصص على المعلمين الأقل انشغالاً
- **أقل حصص إحتياط سابقة**: توزيع عادل للحصص الإحتياط
- **عدم التعارض**: ضمان عدم وجود تعارض في جدول المعلم البديل

### 2. إدارة شاملة | Comprehensive Management
- تسجيل غياب المعلم مع تحديد فترة الغياب
- حساب الإحتياط تلقائياً قبل الحفظ
- عرض الإحتياط المقترحة مع التوضيحات
- إمكانية تعديل أو حذف الإحتياط

### 3. عرض تفاعلي | Interactive Display
- عرض الحصص الإحتياط في جدول المعلم
- تمييز واضح للحصص الإحتياط باللون الأصفر
- عرض سبب اختيار المعلم البديل
- عرض الإحتياط الإحتياط الأخرى

---

## البنية التقنية | Technical Architecture

### قاعدة البيانات | Database

#### الجداول | Tables

**1. `teacher_substitutions`**
```sql
- id: معرف فريد
- timetable_id: معرف الجدول الدراسي
- school_id: معرف المدرسة
- absent_teacher_xml_id: معرف المعلم الغائب من XML
- absent_teacher_user_id: معرف المعلم الغائب من قاعدة البيانات
- absent_teacher_name: اسم المعلم الغائب
- start_date: تاريخ بداية الغياب
- end_date: تاريخ نهاية الغياب
- distribution_criteria: معايير التوزيع (JSON)
- created_by: من قام بإنشاء البديل
- created_at: تاريخ الإنشاء
- is_active: هل البديل نشط
```

**2. `substitution_assignments`**
```sql
- id: معرف فريد
- substitution_id: معرف البديل الأساسي
- schedule_id: معرف الحصة الأصلية
- class_name: اسم الفصل
- subject_name: اسم المادة
- day_xml_id: معرف اليوم
- period_xml_id: معرف الحصة
- substitute_teacher_xml_id: معرف المعلم البديل من XML
- substitute_teacher_user_id: معرف المعلم البديل من قاعدة البيانات
- substitute_teacher_name: اسم المعلم البديل
- assignment_reason: سبب اختيار هذا المعلم
- created_at: تاريخ الإنشاء
```

### الواجهة الخلفية | Backend

#### ملفات رئيسية | Main Files

**1. `back/app/models.py`**
- نماذج `TeacherSubstitution` و `SubstitutionAssignment`
- العلاقات بين الجداول
- دوال التحويل `to_dict()`

**2. `back/app/routes/substitution_routes.py`**
- API endpoints لإدارة الإحتياط
- خوارزمية `calculate_substitute_teachers()` للتوزيع الذكي
- معالجة الطلبات والتحقق من الصلاحيات

#### خوارزمية التوزيع | Distribution Algorithm

```python
def calculate_substitute_teachers(timetable_id, absent_teacher_xml_id, school_id, criteria):
    """
    1. جلب جميع حصص المعلم الغائب
    2. جلب جميع المعلمين المتاحين
    3. حساب إحصائيات كل معلم:
       - عدد الحصص الأسبوعية
       - عدد الحصص الإحتياط الحالية
       - المواد التي يدرسها
       - جدوله الزمني
    4. لكل حصة، اختيار أفضل معلم بديل:
       - التحقق من عدم التعارض
       - حساب النقاط بناءً على المعايير
       - ترتيب المرشحين حسب النقاط
    5. إرجاع القائمة مع الإحتياط المقترحة
    """
```

#### نقاط المعايير | Criteria Scoring

- **نفس المادة**: +100 نقطة
- **أقل حصص**: حتى +50 نقطة (عكسي)
- **أقل إحتياط**: حتى +30 نقطة (عكسي)
- **عدم التعارض**: إلزامي (استبعاد المعلم عند التعارض)

#### API Endpoints

```
GET    /api/substitutions/                           # جلب جميع الإحتياط
POST   /api/substitutions/calculate                  # حساب الإحتياط (بدون حفظ)
POST   /api/substitutions/                           # إنشاء بديل جديد
GET    /api/substitutions/:id                        # جلب بديل محدد
DELETE /api/substitutions/:id                        # حذف بديل
POST   /api/substitutions/:id/deactivate             # إلغاء تفعيل بديل
GET    /api/substitutions/teacher/:teacherUserId     # جلب إحتياط معلم محدد
```

### الواجهة الأمامية | Frontend

#### ملفات رئيسية | Main Files

**1. `frontend/src/pages/TeacherSubstitution/TeacherSubstitution.js`**
- صفحة إدارة الإحتياط الرئيسية
- نموذج تسجيل الغياب
- عرض الإحتياط المحسوبة
- إدارة الإحتياط النشطة

**2. `frontend/src/pages/Dashboard/Dashboard.js`**
- عرض الحصص الإحتياط في جدول المعلم
- تمييز الحصص الإحتياط بالألوان
- جلب الإحتياط من API

**3. `frontend/src/services/api.js`**
- `substitutionAPI`: وظائف API للإحتياط
- دوال لجميع العمليات (CRUD)

**4. `frontend/src/App.js`**
- مسار `/app/teacher-substitution`
- حماية بالصلاحيات (school_admin, data_analyst)

**5. `frontend/src/components/Layout/Sidebar.js`**
- رابط "إحتياط المعلمين" في القائمة الجانبية

---

## التثبيت | Installation

### 1. قاعدة البيانات | Database Setup

#### الطريقة الأولى: SQL مباشر
```bash
mysql -u username -p database_name < back/migrations/substitution_tables.sql
```

#### الطريقة الثانية: Alembic Migration
```bash
cd back
flask db upgrade
```

### 2. التحقق | Verification

```sql
-- التحقق من وجود الجداول
SHOW TABLES LIKE '%substitution%';

-- التحقق من البنية
DESCRIBE teacher_substitutions;
DESCRIBE substitution_assignments;
```

### 3. إعادة تشغيل الخادم | Restart Server

```bash
# Backend
cd back
python run.py

# Frontend
cd frontend
npm start
```

---

## دليل الاستخدام | User Guide

### للإداريين | For Administrators

#### 1. تسجيل غياب معلم | Register Teacher Absence

1. انتقل إلى **الجداول الدراسية** → **إحتياط المعلمين**
2. اختر الجدول الدراسي النشط
3. اضغط على **تسجيل غياب معلم**
4. املأ البيانات:
   - المعلم الغائب
   - من تاريخ
   - إلى تاريخ
   - معايير التوزيع (يمكن تحديد أكثر من معيار)
5. اضغط **حساب الإحتياط**
6. راجع النتائج المقترحة
7. اضغط **حفظ الإحتياط**

#### 2. عرض الإحتياط النشطة | View Active Substitutions

- يتم عرض جميع الإحتياط النشطة تلقائياً
- يمكن توسيع كل بديل لرؤية التفاصيل
- يمكن حذف البديل عند الحاجة

#### 3. إدارة الإحتياط | Manage Substitutions

- **عرض**: اضغط على السهم لتوسيع التفاصيل
- **حذف**: اضغط على أيقونة سلة المهملات

### للمعلمين | For Teachers

#### عرض الحصص الإحتياط | View Substitute Classes

1. انتقل إلى **لوحة التحكم**
2. ستظهر الحصص الإحتياط في جدولك الزمني
3. الحصص الإحتياط مميزة بـ:
   - خلفية صفراء
   - شارة "بديل"
   - معلومات الفصل والمادة

---

## المعايير والتوزيع | Criteria & Distribution

### معايير التوزيع | Distribution Criteria

#### 1. نفس المادة (same_subject)
- **الأولوية**: عالية جداً (+100 نقطة)
- **الوصف**: يفضل المعلمين الذين يدرسون نفس المادة
- **المثال**: إذا كان المعلم الغائب يدرس الرياضيات، يتم البحث عن معلمي رياضيات

#### 2. أقل عدد حصص (fewest_classes)
- **الأولوية**: عالية (حتى +50 نقطة)
- **الوصف**: يفضل المعلمين الذين لديهم أقل عدد حصص أسبوعية
- **المثال**: معلم لديه 15 حصة أسبوعياً يحصل على أولوية أكثر من معلم لديه 25 حصة

#### 3. أقل حصص إحتياط (fewest_substitutions)
- **الأولوية**: متوسطة (حتى +30 نقطة)
- **الوصف**: يفضل المعلمين الذين لديهم أقل عدد حصص إحتياط سابقة
- **المثال**: معلم لم يسبق له تغطية حصص إحتياط يحصل على أولوية أعلى

#### 4. عدم التعارض (no_conflict) ⚠️ إلزامي
- **الأولوية**: إلزامي
- **الوصف**: يتم استبعاد المعلمين الذين لديهم حصة في نفس الوقت
- **المثال**: إذا كانت الحصة الإحتياط يوم الأحد الحصة الأولى، لا يتم اختيار معلم لديه حصة في نفس الوقت

### أمثلة عملية | Practical Examples

#### مثال 1: معلم رياضيات غائب
```
الحصة: الصف 3-أ، رياضيات، يوم الأحد، الحصة الثانية

المرشحون:
1. المعلم أحمد (معلم رياضيات، 18 حصة، 2 حصة إحتياط) = 100 + 35 + 20 = 155 نقطة ✓
2. المعلمة فاطمة (معلمة فيزياء، 15 حصص، 0 حصة إحتياط) = 0 + 40 + 30 = 70 نقطة
3. المعلم علي (معلم رياضيات، لديه حصة في نفس الوقت) = مستبعد ✗

النتيجة: يتم اختيار المعلم أحمد
```

#### مثال 2: معلم لغة إنجليزية غائب
```
الحصة: الصف 2-ب، إنجليزي، يوم الاثنين، الحصة الثالثة

المرشحون:
1. المعلمة سارة (معلمة إنجليزي، 22 حصة، 5 حصص إحتياط) = 100 + 25 + 10 = 135 نقطة
2. المعلمة مريم (معلمة عربي، 16 حصص، 1 حصة إحتياط) = 0 + 38 + 28 = 66 نقطة
3. المعلم محمد (معلم إنجليزي، 18 حصص، 2 حصص إحتياط) = 100 + 35 + 20 = 155 نقطة ✓

النتيجة: يتم اختيار المعلم محمد
```

---

## استعلامات مفيدة | Useful Queries

### 1. عدد الحصص الإحتياط لكل معلم
```sql
SELECT 
    u.fullName AS 'اسم المعلم',
    COUNT(sa.id) AS 'عدد الحصص الإحتياط'
FROM substitution_assignments sa
JOIN teacher_substitutions ts ON sa.substitution_id = ts.id
JOIN users u ON sa.substitute_teacher_user_id = u.id
WHERE ts.school_id = 1
  AND ts.is_active = TRUE
  AND ts.end_date >= CURDATE()
GROUP BY sa.substitute_teacher_user_id, u.fullName
ORDER BY COUNT(sa.id) DESC;
```

### 2. جدول المعلم مع الإحتياط
```sql
SELECT 
    'حصة عادية' AS النوع,
    ts.class_name AS الفصل,
    ts.subject_name AS المادة,
    td.name AS اليوم,
    tp.name AS الحصة
FROM timetable_schedules ts
JOIN timetable_teacher_mappings ttm ON ts.teacher_xml_id = ttm.xml_teacher_id
JOIN timetable_days td ON ts.day_xml_id = td.xml_id
JOIN timetable_periods tp ON ts.period_xml_id = tp.xml_id
WHERE ttm.user_id = 123  -- معرف المعلم

UNION ALL

SELECT 
    'حصة إحتياط' AS النوع,
    sa.class_name AS الفصل,
    sa.subject_name AS المادة,
    td.name AS اليوم,
    tp.name AS الحصة
FROM substitution_assignments sa
JOIN teacher_substitutions ts ON sa.substitution_id = ts.id
JOIN timetable_days td ON sa.day_xml_id = td.xml_id
JOIN timetable_periods tp ON sa.period_xml_id = tp.xml_id
WHERE sa.substitute_teacher_user_id = 123  -- معرف المعلم
  AND ts.is_active = TRUE
  AND ts.end_date >= CURDATE()

ORDER BY اليوم, الحصة;
```

### 3. تقرير الغياب والإحتياط
```sql
SELECT 
    ts.absent_teacher_name AS 'المعلم الغائب',
    ts.start_date AS 'من تاريخ',
    ts.end_date AS 'إلى تاريخ',
    COUNT(sa.id) AS 'عدد الحصص',
    GROUP_CONCAT(DISTINCT sa.substitute_teacher_name SEPARATOR ', ') AS 'المعلمون الإحتياط'
FROM teacher_substitutions ts
LEFT JOIN substitution_assignments sa ON ts.id = sa.substitution_id
WHERE ts.school_id = 1
  AND ts.is_active = TRUE
GROUP BY ts.id, ts.absent_teacher_name, ts.start_date, ts.end_date
ORDER BY ts.start_date DESC;
```

---

## استكشاف الأخطاء | Troubleshooting

### مشكلة: لا تظهر الإحتياط في جدول المعلم
**الحل:**
1. تحقق من أن البديل نشط (`is_active = TRUE`)
2. تحقق من أن التاريخ ضمن الفترة المحددة
3. تحقق من ربط المعلم في الجدول الدراسي

### مشكلة: لا يتم اختيار أي معلم بديل
**الحل:**
1. تحقق من معيار "عدم التعارض" - قد يكون جميع المعلمين لديهم حصص
2. جرب إلغاء بعض المعايير
3. تحقق من وجود معلمين متاحين في الجدول

### مشكلة: خطأ في إنشاء البديل
**الحل:**
1. تحقق من أن جميع الحقول المطلوبة مملوءة
2. تحقق من أن التواريخ صحيحة (البداية قبل النهاية)
3. تحقق من الصلاحيات

---

## التطوير المستقبلي | Future Development

### ميزات مقترحة | Suggested Features

1. **إشعارات تلقائية**
   - إشعار المعلم البديل بالحصة الجديدة
   - إشعار المدير بتسجيل الغياب

2. **تقارير متقدمة**
   - تقرير شامل لحصص المعلم الإحتياط
   - إحصائيات الغياب
   - معدلات الإحتياط

3. **تكامل مع نظام الحضور**
   - ربط الغياب بسجلات الحضور
   - تحديث تلقائي للإحتياط

4. **موافقات متعددة المستويات**
   - طلب موافقة المعلم البديل
   - موافقة المدير على الإحتياط

5. **جدولة مسبقة**
   - تسجيل الغياب المخطط مسبقاً
   - حجز إحتياط مسبقاً

---

## الدعم | Support

للمساعدة أو الاستفسارات:
- راجع التوثيق الفني
- تحقق من سجلات الأخطاء
- تواصل مع فريق الدعم الفني

---

## الترخيص | License

هذا النظام جزء من نظام إدارة المدارس الشامل
© 2026 جميع الحقوق محفوظة
