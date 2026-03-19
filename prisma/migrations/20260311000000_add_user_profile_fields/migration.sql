-- Migration: Add extended profile fields to users
-- Date: 2026-03-11

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "rut" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "address" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "emergency_contact" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
