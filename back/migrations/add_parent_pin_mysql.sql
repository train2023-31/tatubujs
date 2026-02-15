-- Add 6-digit parent PIN (hashed) and lock fields for parent login
-- Run on MySQL if you use raw SQL migrations
-- If parent_pin_hash already exists, run only the last two ALTERs.

ALTER TABLE students ADD COLUMN parent_pin_hash VARCHAR(255) NULL;
ALTER TABLE students ADD COLUMN parent_failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN parent_locked_until DATETIME NULL;
