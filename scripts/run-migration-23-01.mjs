/**
 * Migration script: 23-01 — Add invitation fields to AgencyMember
 *
 * This script adds 3 new columns to the agency_members table to support
 * token-based member invitations (Plan 23-02).
 *
 * USAGE:
 *   1. Run in Supabase SQL Editor (dashboard.supabase.com > SQL Editor), OR
 *   2. Run via psql: psql $DATABASE_URL -f prisma/migrations/20260309000000_add_agency_member_invitation_fields/migration.sql
 *
 * SAFE TO RUN: Uses IF NOT EXISTS pattern. Idempotent.
 */

const SQL = `
-- Migration: 23-01 — Add invitation fields to AgencyMember
-- Safe to run multiple times (checks column existence first)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_members' AND column_name = 'invitation_token'
  ) THEN
    ALTER TABLE "agency_members" ADD COLUMN "invitation_token" TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_members' AND column_name = 'invitation_expires_at'
  ) THEN
    ALTER TABLE "agency_members" ADD COLUMN "invitation_expires_at" TIMESTAMP(3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agency_members' AND column_name = 'invited_email'
  ) THEN
    ALTER TABLE "agency_members" ADD COLUMN "invited_email" TEXT;
  END IF;
END $$;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agency_members'
  AND column_name IN ('invitation_token', 'invitation_expires_at', 'invited_email')
ORDER BY column_name;
`;

console.log('=== Migration 23-01: Add Agency Member Invitation Fields ===\n');
console.log('Run this SQL in Supabase SQL Editor:\n');
console.log(SQL);
console.log('\nOr apply the migration file directly:');
console.log('  prisma/migrations/20260309000000_add_agency_member_invitation_fields/migration.sql');
