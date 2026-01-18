# Teacher Substitution Tables - Installation Guide

## Overview
This SQL script creates the necessary database tables for the teacher substitution system. This system allows schools to manage teacher absences by automatically distributing their classes to other available teachers based on configurable criteria.

## Tables Created

### 1. `teacher_substitutions`
Stores information about teacher absences:
- **Purpose**: Records when a teacher is absent and needs substitution
- **Key Fields**:
  - `absent_teacher_xml_id`: Reference to teacher in timetable XML
  - `start_date` / `end_date`: Absence period
  - `distribution_criteria`: Rules for assigning substitute teachers (JSON)
  - `is_active`: Whether substitution is currently in effect

### 2. `substitution_assignments`
Stores individual class assignments to substitute teachers:
- **Purpose**: Records which teacher will cover each specific class
- **Key Fields**:
  - `schedule_id`: Reference to original timetable schedule
  - `substitute_teacher_xml_id`: Teacher covering the class
  - `day_xml_id` / `period_xml_id`: When the class occurs
  - `assignment_reason`: Explanation of why this teacher was selected

## Installation Instructions

### Method 1: Using MySQL Command Line

```bash
# Log in to MySQL
mysql -u your_username -p

# Select your database
USE your_database_name;

# Run the SQL script
source /path/to/substitution_tables.sql;
```

### Method 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database server
3. Select your database from the sidebar
4. Go to **File** → **Run SQL Script**
5. Select `substitution_tables.sql`
6. Click **Run**

### Method 3: Using phpMyAdmin

1. Log in to phpMyAdmin
2. Select your database from the left sidebar
3. Click on the **Import** tab
4. Click **Choose File** and select `substitution_tables.sql`
5. Scroll down and click **Go**

### Method 4: Using Python (if using Flask-Migrate)

```bash
# Create a new migration
flask db revision -m "Add teacher substitution tables"

# Copy the SQL into the upgrade function or use execute
# Edit the generated migration file in migrations/versions/

# Apply the migration
flask db upgrade
```

## Verification

After running the script, verify that the tables were created successfully:

```sql
-- Check if tables exist
SHOW TABLES LIKE '%substitution%';

-- Check table structures
DESCRIBE teacher_substitutions;
DESCRIBE substitution_assignments;

-- Verify foreign keys
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_NAME IN ('teacher_substitutions', 'substitution_assignments')
    AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## Dependencies

These tables require the following tables to exist first:
- `timetables` (from timetable_tables.sql)
- `timetable_schedules` (from timetable_tables.sql)
- `schools` (core system table)
- `users` (core system table)

**Important**: Make sure you have run `timetable_tables.sql` before running this script.

## Features Supported

### Distribution Criteria
The system supports the following criteria for selecting substitute teachers:
- **same_subject**: Prioritize teachers who teach the same subject
- **fewest_classes**: Prioritize teachers with fewer weekly classes
- **fewest_substitutions**: Prioritize teachers with fewer existing substitutions
- **no_conflict**: Exclude teachers who have a class at the same time (mandatory)

### Automatic Assignment
The backend algorithm (`calculate_substitute_teachers` in `substitution_routes.py`) uses these criteria to automatically suggest the best substitute teacher for each class.

## API Endpoints

After installation, the following API endpoints will be available:

- `GET /api/substitutions/` - Get all substitutions
- `POST /api/substitutions/calculate` - Calculate substitute assignments
- `POST /api/substitutions/` - Create a new substitution
- `GET /api/substitutions/:id` - Get specific substitution
- `DELETE /api/substitutions/:id` - Delete substitution
- `POST /api/substitutions/:id/deactivate` - Deactivate substitution
- `GET /api/substitutions/teacher/:teacherUserId` - Get teacher's substitutions

## Sample Usage Queries

### Get Active Substitutions
```sql
SELECT * FROM teacher_substitutions 
WHERE school_id = 1 
  AND is_active = TRUE 
  AND end_date >= CURDATE()
ORDER BY created_at DESC;
```

### Get Substitute Classes for a Teacher
```sql
SELECT 
    sa.class_name,
    sa.subject_name,
    sa.day_xml_id,
    sa.period_xml_id,
    sub.absent_teacher_name,
    sub.start_date,
    sub.end_date
FROM substitution_assignments sa
JOIN teacher_substitutions sub ON sa.substitution_id = sub.id
WHERE sa.substitute_teacher_user_id = 123
  AND sub.is_active = TRUE
  AND sub.end_date >= CURDATE()
ORDER BY sa.day_xml_id, sa.period_xml_id;
```

### Count Substitute Classes per Teacher
```sql
SELECT 
    u.fullName,
    COUNT(*) as substitute_count
FROM substitution_assignments sa
JOIN teacher_substitutions sub ON sa.substitution_id = sub.id
JOIN users u ON sa.substitute_teacher_user_id = u.id
WHERE sub.school_id = 1
  AND sub.is_active = TRUE
  AND sub.end_date >= CURDATE()
GROUP BY sa.substitute_teacher_user_id, u.fullName
ORDER BY substitute_count DESC;
```

## Troubleshooting

### Error: "Cannot add foreign key constraint"
- **Cause**: Referenced tables don't exist
- **Solution**: Run `timetable_tables.sql` first

### Error: "Table already exists"
- **Cause**: Tables were created in a previous run
- **Solution**: Either drop the tables first or modify the script to use `CREATE TABLE IF NOT EXISTS`

### Error: "Unknown column in 'field list'"
- **Cause**: Referenced columns don't exist in parent tables
- **Solution**: Ensure all parent tables are up to date

## Rollback

If you need to remove these tables:

```sql
-- Drop tables in reverse order (child tables first)
DROP TABLE IF EXISTS substitution_assignments;
DROP TABLE IF EXISTS teacher_substitutions;
```

## Support

For issues or questions about this migration:
1. Check the error message carefully
2. Verify all dependencies are installed
3. Ensure database user has CREATE TABLE permissions
4. Check MySQL/MariaDB version compatibility

## Version History

- **v1.0** (2026-01-16): Initial release
  - Basic substitution tracking
  - Automatic assignment algorithm
  - Integration with teacher dashboards
