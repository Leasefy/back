-- Add onboarding_data JSON column to users table
-- Stores role-specific onboarding fields (employment, budget, property preferences, etc.)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboarding_data" JSONB;

-- Add business profile fields to agencies table
ALTER TABLE "agencies"
  ADD COLUMN IF NOT EXISTS "portfolio_size" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "years_in_business" INTEGER,
  ADD COLUMN IF NOT EXISTS "services" JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "website" TEXT;
