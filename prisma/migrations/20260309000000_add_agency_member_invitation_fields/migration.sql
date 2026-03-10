-- Migration: Add invitation fields to AgencyMember
-- Plan: 23-01 (Inmobiliaria Registration & Onboarding Flow)
-- Date: 2026-03-09

ALTER TABLE "agency_members"
  ADD COLUMN "invitation_token" TEXT UNIQUE,
  ADD COLUMN "invitation_expires_at" TIMESTAMP(3),
  ADD COLUMN "invited_email" TEXT;
