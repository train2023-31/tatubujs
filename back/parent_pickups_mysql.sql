-- =====================================================
-- MySQL: ParentPickup table (parent_pickups)
-- For parent student pickup feature
-- =====================================================

-- Create table (run this first)
CREATE TABLE IF NOT EXISTS parent_pickups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    school_id INT NOT NULL,
    parent_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, confirmed, completed',
    request_time DATETIME NOT NULL,
    confirmation_time DATETIME NULL,
    completed_time DATETIME NULL,
    pickup_date DATE NOT NULL,
    CONSTRAINT fk_parent_pickups_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_pickups_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_parent_pickups_student (student_id),
    INDEX idx_parent_pickups_school (school_id),
    INDEX idx_parent_pickups_date_status (pickup_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Example INSERT (optional - replace values with real IDs)
-- =====================================================
-- INSERT INTO parent_pickups (
--     student_id,
--     school_id,
--     parent_phone,
--     status,
--     request_time,
--     pickup_date
-- ) VALUES (
--     1,                    -- student_id (from students.id)
--     1,                    -- school_id (from schools.id)
--     '96891234567',        -- parent_phone
--     'pending',            -- status: pending | confirmed | completed
--     NOW(),                -- request_time
--     CURDATE()             -- pickup_date
-- );

-- =====================================================
-- Example INSERT with all fields (confirmed pickup)
-- =====================================================
-- INSERT INTO parent_pickups (
--     student_id,
--     school_id,
--     parent_phone,
--     status,
--     request_time,
--     confirmation_time,
--     completed_time,
--     pickup_date
-- ) VALUES (
--     1,
--     1,
--     '96891234567',
--     'confirmed',
--     NOW() - INTERVAL 10 MINUTE,
--     NOW(),
--     NULL,
--     CURDATE()
-- );
