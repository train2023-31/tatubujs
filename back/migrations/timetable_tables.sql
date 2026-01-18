-- Timetable System Database Migration
-- Run this SQL to create the necessary tables for the timetable system
-- This file creates all tables needed for managing school timetables

-- 1. Create timetables table (Main timetable container)
CREATE TABLE IF NOT EXISTS timetables (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    school_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    xml_data TEXT,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_timetable_school (school_id),
    INDEX idx_timetable_active (is_active)
);

-- 2. Create timetable_days table (Days of the week)
CREATE TABLE IF NOT EXISTS timetable_days (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    timetable_id INTEGER NOT NULL,
    day_id VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    short_name VARCHAR(20),
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    INDEX idx_day_timetable (timetable_id)
);

-- 3. Create timetable_periods table (Time periods/slots)
CREATE TABLE IF NOT EXISTS timetable_periods (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    timetable_id INTEGER NOT NULL,
    period_id VARCHAR(50) NOT NULL,
    period_number INTEGER NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    INDEX idx_period_timetable (timetable_id)
);

-- 4. Create timetable_teacher_mappings table (Map XML teachers to DB teachers)
CREATE TABLE IF NOT EXISTS timetable_teacher_mappings (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    timetable_id INTEGER NOT NULL,
    xml_teacher_id VARCHAR(100) NOT NULL,
    xml_teacher_name VARCHAR(255) NOT NULL,
    teacher_id INTEGER,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    UNIQUE KEY unique_teacher_mapping (timetable_id, xml_teacher_id),
    INDEX idx_mapping_timetable (timetable_id),
    INDEX idx_mapping_teacher (teacher_id)
);

-- 5. Create timetable_schedules table (Individual schedule entries)
CREATE TABLE IF NOT EXISTS timetable_schedules (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    timetable_id INTEGER NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    class_xml_id VARCHAR(100) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    subject_xml_id VARCHAR(100) NOT NULL,
    teacher_xml_id VARCHAR(100),
    classroom_name VARCHAR(100),
    day_xml_id VARCHAR(50) NOT NULL,
    period_xml_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    INDEX idx_schedule_timetable (timetable_id),
    INDEX idx_schedule_class (class_xml_id),
    INDEX idx_schedule_teacher (teacher_xml_id),
    INDEX idx_schedule_day_period (day_xml_id, period_xml_id)
);

-- Verify tables were created
SELECT 
    'timetables' as table_name, 
    COUNT(*) as record_count 
FROM timetables
UNION ALL
SELECT 
    'timetable_days' as table_name, 
    COUNT(*) as record_count 
FROM timetable_days
UNION ALL
SELECT 
    'timetable_periods' as table_name, 
    COUNT(*) as record_count 
FROM timetable_periods
UNION ALL
SELECT 
    'timetable_teacher_mappings' as table_name, 
    COUNT(*) as record_count 
FROM timetable_teacher_mappings
UNION ALL
SELECT 
    'timetable_schedules' as table_name, 
    COUNT(*) as record_count 
FROM timetable_schedules;

-- Notes:
-- 1. All tables use InnoDB engine (default) for foreign key support
-- 2. Foreign keys use CASCADE for timetables and SET NULL for teacher_id (to preserve data if teacher is deleted)
-- 3. Indexes are added for performance optimization on frequently queried columns
-- 4. The unique constraint on timetable_teacher_mappings ensures one mapping per teacher per timetable
-- 5. All timestamps use CURRENT_TIMESTAMP for automatic date/time tracking
