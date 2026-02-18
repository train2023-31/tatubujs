-- Evolution API (WhatsApp) configuration for schools
-- Run this once on your MySQL database.
-- Change 'tatubu' below if your database name is different.

USE tatubu;

ALTER TABLE schools
  ADD COLUMN evolution_whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN evolution_api_url VARCHAR(255) NULL,
  ADD COLUMN evolution_api_key VARCHAR(255) NULL,
  ADD COLUMN evolution_instance_name VARCHAR(100) NULL,
  ADD COLUMN evolution_instance_token VARCHAR(255) NULL,
  ADD COLUMN evolution_phone_number VARCHAR(20) NULL,
  ADD COLUMN evolution_instance_status VARCHAR(50) NULL DEFAULT 'disconnected';
