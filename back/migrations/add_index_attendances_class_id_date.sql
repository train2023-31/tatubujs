-- Run once on your MySQL database to speed up dashboard statistics (school + class stats).
-- Without this index, attendances is scanned fully and the endpoint can take 30+ seconds.

-- Critical: allows fast lookup by class_id and date (used by stats queries)
CREATE INDEX ix_attendances_class_id_date ON attendances (class_id, date);

-- Optional: speed up school/class count subqueries (if not already indexed)
-- CREATE INDEX ix_users_school_id_is_active ON users (school_id, is_active);
-- CREATE INDEX ix_classes_school_id_is_active ON classes (school_id, is_active);
