-- Teacher Substitution System Database Migration
-- Run this SQL to create the necessary tables for the teacher substitution system
-- This file creates all tables needed for managing teacher substitutions when a teacher is absent

-- 1. Create teacher_substitutions table (Main substitution container)
CREATE TABLE IF NOT EXISTS teacher_substitutions (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    timetable_id INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    absent_teacher_xml_id VARCHAR(100) NOT NULL,
    absent_teacher_user_id INTEGER,
    absent_teacher_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    distribution_criteria TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (absent_teacher_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_substitutions_timetable (timetable_id),
    INDEX idx_substitutions_school (school_id),
    INDEX idx_substitutions_absent_teacher (absent_teacher_user_id),
    INDEX idx_substitutions_dates (start_date, end_date),
    INDEX idx_substitutions_active (is_active)
);

-- 2. Create substitution_assignments table (Individual class assignments)
CREATE TABLE IF NOT EXISTS substitution_assignments (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    substitution_id INTEGER NOT NULL,
    schedule_id INTEGER NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    day_xml_id VARCHAR(50) NOT NULL,
    period_xml_id VARCHAR(50) NOT NULL,
    substitute_teacher_xml_id VARCHAR(100) NOT NULL,
    substitute_teacher_user_id INTEGER,
    substitute_teacher_name VARCHAR(255) NOT NULL,
    assignment_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (substitution_id) REFERENCES teacher_substitutions(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES timetable_schedules(id) ON DELETE RESTRICT,
    FOREIGN KEY (substitute_teacher_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_assignments_substitution (substitution_id),
    INDEX idx_assignments_schedule (schedule_id),
    INDEX idx_assignments_substitute_teacher (substitute_teacher_user_id),
    INDEX idx_assignments_time_slot (day_xml_id, period_xml_id)
);

-- Verify tables were created
SELECT 
    'teacher_substitutions' as table_name, 
    COUNT(*) as record_count 
FROM teacher_substitutions
UNION ALL
SELECT 
    'substitution_assignments' as table_name, 
    COUNT(*) as record_count 
FROM substitution_assignments;

-- Notes:
-- 1. All tables use InnoDB engine (default) for foreign key support
-- 2. Foreign keys use CASCADE for timetables and SET NULL for user_id (to preserve data if user is deleted)
-- 3. Indexes are added for performance optimization on frequently queried columns
-- 4. The distribution_criteria field stores JSON array of criteria used for assignment
-- 5. All timestamps use CURRENT_TIMESTAMP for automatic date/time tracking


-- ===================================
-- Sample Queries
-- ===================================

-- Get all active substitutions for a school
-- SELECT * FROM teacher_substitutions 
-- WHERE school_id = ? AND is_active = TRUE AND end_date >= CURDATE()
-- ORDER BY created_at DESC;

-- Get all assignments for a specific substitution
-- SELECT sa.*, ts.class_name, ts.subject_name 
-- FROM substitution_assignments sa
-- JOIN timetable_schedules ts ON sa.schedule_id = ts.id
-- WHERE sa.substitution_id = ?
-- ORDER BY sa.day_xml_id, sa.period_xml_id;

-- Get all substitution classes for a specific teacher
-- SELECT sa.*, sub.start_date, sub.end_date, sub.absent_teacher_name
-- FROM substitution_assignments sa
-- JOIN teacher_substitutions sub ON sa.substitution_id = sub.id
-- WHERE sa.substitute_teacher_user_id = ?
--   AND sub.is_active = TRUE
--   AND sub.end_date >= CURDATE()
-- ORDER BY sa.day_xml_id, sa.period_xml_id;

-- Count substitute classes assigned to each teacher
-- SELECT 
--   sa.substitute_teacher_name,
--   sa.substitute_teacher_user_id,
--   COUNT(*) as substitute_class_count
-- FROM substitution_assignments sa
-- JOIN teacher_substitutions sub ON sa.substitution_id = sub.id
-- WHERE sub.school_id = ?
--   AND sub.is_active = TRUE
--   AND sub.end_date >= CURDATE()
-- GROUP BY sa.substitute_teacher_user_id, sa.substitute_teacher_name
-- ORDER BY substitute_class_count DESC;
