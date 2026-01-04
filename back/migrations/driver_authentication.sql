-- Driver Authentication System Database Migration
-- Run this SQL to add driver functionality

-- 1. Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY,
    license_number VARCHAR(100) NULL,
    license_expiry DATE NULL,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_license (license_number)
);

-- 2. Update buses table to reference drivers table
-- Note: This will drop the foreign key constraint and recreate it
-- The correct syntax to drop a foreign key in MySQL is:
ALTER TABLE buses DROP FOREIGN KEY buses_ibfk_2;
DROP FOREIGN KEY IF EXISTS buses_ibfk_2;

ALTER TABLE buses
MODIFY COLUMN driver_id INTEGER NULL,
ADD UNIQUE KEY unique_driver (driver_id),
ADD CONSTRAINT fk_buses_driver
FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;

-- Verify tables were updated
SELECT 
    'drivers' as table_name, 
    COUNT(*) as record_count 
FROM drivers
UNION ALL
SELECT 
    'buses_with_drivers' as table_name, 
    COUNT(*) as record_count 
FROM buses WHERE driver_id IS NOT NULL;


