-- Bus Tracking System Database Migration
-- Run this SQL to create the necessary tables

-- 1. Create buses table
CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    bus_number VARCHAR(50) NOT NULL,
    bus_name VARCHAR(100) NOT NULL,
    school_id INTEGER NOT NULL,
    driver_id INTEGER NULL,
    capacity INTEGER NOT NULL DEFAULT 50,
    plate_number VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_school (school_id),
    INDEX idx_driver (driver_id)
);

-- 2. Create bus_students association table
CREATE TABLE IF NOT EXISTS bus_students (
    student_id INTEGER NOT NULL,
    bus_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, bus_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
    INDEX idx_bus (bus_id),
    INDEX idx_student (student_id)
);

-- 3. Create bus_scans table for tracking
CREATE TABLE IF NOT EXISTS bus_scans (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    student_id INTEGER NOT NULL,
    bus_id INTEGER NOT NULL,
    scan_type VARCHAR(20) NOT NULL CHECK (scan_type IN ('board', 'exit')),
    scan_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255) NULL,
    scanned_by INTEGER NULL,
    notes TEXT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
    FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_scan_time (scan_time),
    INDEX idx_student_bus_date (student_id, bus_id, scan_time),
    INDEX idx_bus_date (bus_id, scan_time)
);

-- Verify tables were created
SELECT 
    'buses' as table_name, 
    COUNT(*) as record_count 
FROM buses
UNION ALL
SELECT 
    'bus_students' as table_name, 
    COUNT(*) as record_count 
FROM bus_students
UNION ALL
SELECT 
    'bus_scans' as table_name, 
    COUNT(*) as record_count 
FROM bus_scans;


