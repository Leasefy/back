-- Rename SubscriptionPlan enum values:
-- FREE -> STARTER (replaces "free" tier with named "starter" tier)
-- BUSINESS -> FLEX (replaces enterprise tier with pay-per-use "flex" tier)
-- PRO stays the same

-- PostgreSQL ALTER TYPE ... RENAME VALUE is available since PostgreSQL 10
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'FREE' TO 'STARTER';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'BUSINESS' TO 'FLEX';

-- Update default value on users table column
-- PostgreSQL column defaults are stored as expressions, so we need to reset it
ALTER TABLE "users" ALTER COLUMN "subscription_plan" SET DEFAULT 'STARTER';
