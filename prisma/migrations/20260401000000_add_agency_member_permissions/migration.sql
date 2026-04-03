-- AlterTable: Add granular permissions field to AgencyMember
-- Null = use role defaults (AGENCY_ROLE_DEFAULTS)
-- Only populated when admin customizes permissions for a specific member

ALTER TABLE "agency_members" ADD COLUMN "permissions" JSONB;
