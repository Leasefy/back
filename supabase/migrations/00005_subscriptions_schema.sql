-- Migration 00005: Subscriptions, Plans, Payments & Scoring Usage
-- Creates tables for the subscription/plan system (Phase 12)
-- Idempotent: safe to run multiple times

-- ============================================================
-- 1. Create enums (if not exist)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('TENANT', 'LANDLORD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. subscription_plan_configs table
-- ============================================================

CREATE TABLE IF NOT EXISTS "subscription_plan_configs" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "plan_type"           "PlanType"   NOT NULL,
  "tier"                "SubscriptionPlan" NOT NULL,
  "name"                VARCHAR(100) NOT NULL,
  "description"         TEXT,

  -- Pricing (COP - 0 for free plan)
  "monthly_price"       INT          NOT NULL DEFAULT 0,
  "annual_price"        INT          NOT NULL DEFAULT 0,

  -- Limits
  "max_properties"      INT          NOT NULL DEFAULT 1,
  "max_scoring_views"   INT          NOT NULL DEFAULT 1,
  "has_premium_scoring" BOOLEAN      NOT NULL DEFAULT false,
  "has_api_access"      BOOLEAN      NOT NULL DEFAULT false,

  -- Micropayment price
  "scoring_view_price"  INT          NOT NULL DEFAULT 0,

  "is_active"           BOOLEAN      NOT NULL DEFAULT true,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_plan_configs_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one config per planType+tier combo
DO $$ BEGIN
  ALTER TABLE "subscription_plan_configs"
    ADD CONSTRAINT "subscription_plan_configs_plan_type_tier_key" UNIQUE ("plan_type", "tier");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "subscription_plan_configs_plan_type_idx"
  ON "subscription_plan_configs"("plan_type");
CREATE INDEX IF NOT EXISTS "subscription_plan_configs_is_active_idx"
  ON "subscription_plan_configs"("is_active");

-- ============================================================
-- 3. subscriptions table
-- ============================================================

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"            UUID                 NOT NULL DEFAULT gen_random_uuid(),
  "user_id"       UUID                 NOT NULL,
  "plan_id"       UUID                 NOT NULL,
  "status"        "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "cycle"         "BillingCycle"       NOT NULL DEFAULT 'MONTHLY',

  -- Period
  "start_date"    TIMESTAMP(3)         NOT NULL,
  "end_date"      TIMESTAMP(3)         NOT NULL,
  "trial_ends_at" TIMESTAMP(3),

  -- Cancellation
  "cancelled_at"  TIMESTAMP(3),
  "cancel_reason" VARCHAR(500),

  -- Auto-renew
  "auto_renew"    BOOLEAN              NOT NULL DEFAULT true,

  "created_at"    TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_end_date_idx" ON "subscriptions"("end_date");

-- FK: subscriptions -> subscription_plan_configs
DO $$ BEGIN
  ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plan_configs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. subscription_payments table
-- ============================================================

CREATE TABLE IF NOT EXISTS "subscription_payments" (
  "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
  "subscription_id"    UUID         NOT NULL,
  "amount"             INT          NOT NULL,
  "cycle"              "BillingCycle" NOT NULL,

  -- PSE mock reference
  "pse_transaction_id" VARCHAR(100),
  "status"             VARCHAR(20)  NOT NULL DEFAULT 'PENDING',

  -- Period covered
  "period_start"       TIMESTAMP(3) NOT NULL,
  "period_end"         TIMESTAMP(3) NOT NULL,

  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscription_payments_subscription_id_idx"
  ON "subscription_payments"("subscription_id");
CREATE INDEX IF NOT EXISTS "subscription_payments_status_idx"
  ON "subscription_payments"("status");

-- FK: subscription_payments -> subscriptions
DO $$ BEGIN
  ALTER TABLE "subscription_payments"
    ADD CONSTRAINT "subscription_payments_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. scoring_usage table
-- ============================================================

CREATE TABLE IF NOT EXISTS "scoring_usage" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"         UUID         NOT NULL,
  "month"           INT          NOT NULL,
  "year"            INT          NOT NULL,
  "view_count"      INT          NOT NULL DEFAULT 0,
  "paid_view_count" INT          NOT NULL DEFAULT 0,

  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "scoring_usage_pkey" PRIMARY KEY ("id")
);

-- Unique: one row per user+month+year
DO $$ BEGIN
  ALTER TABLE "scoring_usage"
    ADD CONSTRAINT "scoring_usage_user_id_month_year_key" UNIQUE ("user_id", "month", "year");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "scoring_usage_user_id_idx" ON "scoring_usage"("user_id");

-- ============================================================
-- 6. Add subscription columns to users table (if not exist)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "subscription_ends_at" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 7. Seed default plan configs
-- ============================================================

INSERT INTO "subscription_plan_configs" ("plan_type", "tier", "name", "description", "monthly_price", "annual_price", "max_properties", "max_scoring_views", "has_premium_scoring", "has_api_access", "scoring_view_price")
VALUES
  ('LANDLORD', 'FREE',     'Propietario Gratis',    'Plan gratuito para propietarios',        0,       0,   3,  5, false, false, 0),
  ('LANDLORD', 'PRO',      'Propietario Pro',       'Plan profesional para propietarios',  49900,  479000, 15, 30, true,  false, 0),
  ('LANDLORD', 'BUSINESS', 'Propietario Business',  'Plan empresarial para propietarios', 99900,  959000, -1, -1, true,  true,  0),
  ('TENANT',   'FREE',     'Inquilino Gratis',      'Plan gratuito para inquilinos',          0,       0,  0,  3, false, false, 2900),
  ('TENANT',   'PRO',      'Inquilino Pro',         'Plan profesional para inquilinos',   29900,  287000,  0, 15, true,  false, 1900),
  ('TENANT',   'BUSINESS', 'Inquilino Business',    'Plan empresarial para inquilinos',   59900,  575000,  0, -1, true,  true,  0)
ON CONFLICT ("plan_type", "tier") DO NOTHING;
