-- Performance indexes for tatubu (MySQL).
-- Run once: mysql -u root -p tatubu < migrations/add_performance_indexes.sql
-- If an index already exists, that line will fail; comment it out and re-run the rest.

-- Attendances: stats and filters by class+date (critical for dashboard speed)
CREATE INDEX ix_attendances_class_id_date ON tatubu.attendances (class_id, date);

-- Attendances: per-student lookups (attendance by student + date)
CREATE INDEX ix_attendances_student_id_date ON tatubu.attendances (student_id, date);

-- Users: school + active filter (Student/Teacher counts, lists by school)
CREATE INDEX ix_users_school_id_is_active ON tatubu.users (school_id, is_active);

-- Classes: school + active (dashboard, reports, class lists)
CREATE INDEX ix_classes_school_id_is_active ON tatubu.classes (school_id, is_active);

-- Optional: classes by teacher (attendance routes)
CREATE INDEX ix_classes_teacher_id ON tatubu.classes (teacher_id);

-- News: by school, type, active (news listing)
CREATE INDEX ix_news_school_id_type_is_active ON tatubu.news (school_id, type, is_active);

-- Subjects: school + active (counts, lists)
CREATE INDEX ix_subjects_school_id_is_active ON tatubu.subjects (school_id, is_active);

-- Timetables: school + active (counts, lists)
CREATE INDEX ix_timetables_school_id_is_active ON tatubu.timetables (school_id, is_active);

-- Teacher substitutions: by school
CREATE INDEX ix_teacher_substitutions_school_id ON tatubu.teacher_substitutions (school_id);

-- Buses: school + active (lists, counts)
CREATE INDEX ix_buses_school_id_is_active ON tatubu.buses (school_id, is_active);

-- Bus scans: by bus and time (lists, time range)
CREATE INDEX ix_bus_scans_bus_id_scan_time ON tatubu.bus_scans (bus_id, scan_time);

-- Parent pickups: by school and date (filtering)
CREATE INDEX ix_parent_pickups_school_id_pickup_date ON tatubu.parent_pickups (school_id, pickup_date);

-- Notifications: by school and active (listing)
CREATE INDEX ix_notifications_school_id_is_active ON tatubu.notifications (school_id, is_active);

-- Association table: lookup students by class (stats, class rosters)
CREATE INDEX ix_student_classes_class_id ON tatubu.student_classes (class_id);
