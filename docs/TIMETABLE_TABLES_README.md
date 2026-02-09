# Timetable Tables SQL Migration

This SQL file creates all necessary tables for the timetable system.

## File Location
`back/migrations/timetable_tables.sql`

## Tables Created

1. **timetables** - Main timetable container
   - Stores timetable metadata (name, school, creator, active status)
   - Links to schools and users

2. **timetable_days** - Days of the week
   - Stores day information (name, short name)
   - Links to timetables

3. **timetable_periods** - Time periods/slots
   - Stores period information (number, start time, end time)
   - Links to timetables

4. **timetable_teacher_mappings** - Teacher mapping
   - Maps XML teacher IDs to database teacher IDs
   - Links to timetables and teachers

5. **timetable_schedules** - Individual schedule entries
   - Stores actual lesson schedules
   - Contains class, subject, teacher, classroom, day, and period information
   - Links to timetables

## How to Run

### Option 1: Using MySQL Command Line
```bash
mysql -u your_username -p your_database_name < back/migrations/timetable_tables.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin
1. Open MySQL Workbench or phpMyAdmin
2. Select your database
3. Open the SQL file: `back/migrations/timetable_tables.sql`
4. Execute the script

### Option 3: Using Python/Flask
```python
from app import db, create_app

app = create_app()
with app.app_context():
    with open('migrations/timetable_tables.sql', 'r') as f:
        sql = f.read()
        db.session.execute(sql)
        db.session.commit()
```

### Option 4: Using Alembic (Recommended)
If you prefer using Alembic migrations:
```bash
cd back
flask db upgrade
```

## Verification

After running the SQL file, you should see output showing the count of records in each table (all should be 0 for new tables).

## Dependencies

This migration requires the following tables to exist:
- `schools` - School information
- `users` - User accounts
- `teachers` - Teacher information (extends users)

## Notes

- All foreign keys use `ON DELETE CASCADE` for timetables to ensure data consistency
- Teacher mappings use `ON DELETE SET NULL` to preserve data if a teacher is deleted
- Indexes are created for performance optimization
- The `unique_teacher_mapping` constraint ensures one mapping per teacher per timetable

## Troubleshooting

If you encounter errors:

1. **Foreign key constraint errors**: Make sure `schools`, `users`, and `teachers` tables exist
2. **Table already exists**: The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
3. **Permission errors**: Make sure your database user has CREATE TABLE and CREATE INDEX permissions
