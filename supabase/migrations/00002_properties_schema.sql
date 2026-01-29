-- Migration: Add Property and PropertyImage tables
-- Run this in Supabase SQL Editor if prisma db push fails
-- Date: 2026-01-29

-- Create PropertyType enum
DO $$ BEGIN
    CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'ROOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PropertyStatus enum
DO $$ BEGIN
    CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RENTED', 'PENDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ListingPlan enum
DO $$ BEGIN
    CREATE TYPE "ListingPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create properties table
CREATE TABLE IF NOT EXISTS "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlord_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL DEFAULT 'APARTMENT',
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "city" VARCHAR(50) NOT NULL,
    "neighborhood" VARCHAR(100) NOT NULL,
    "address" VARCHAR(200) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "monthly_rent" INTEGER NOT NULL,
    "admin_fee" INTEGER NOT NULL DEFAULT 0,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "bedrooms" INTEGER NOT NULL DEFAULT 1,
    "bathrooms" INTEGER NOT NULL DEFAULT 1,
    "area" INTEGER NOT NULL,
    "floor" INTEGER,
    "parking_spaces" INTEGER,
    "stratum" INTEGER,
    "year_built" INTEGER,
    "amenities" TEXT[] NOT NULL DEFAULT '{}',
    "listing_plan" "ListingPlan" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "properties_landlord_id_fkey" FOREIGN KEY ("landlord_id")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create property_images table
CREATE TABLE IF NOT EXISTS "property_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "property_images_property_id_order_key" UNIQUE ("property_id", "order"),
    CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id")
        REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for properties
CREATE INDEX IF NOT EXISTS "properties_landlord_id_idx" ON "properties"("landlord_id");
CREATE INDEX IF NOT EXISTS "properties_city_idx" ON "properties"("city");
CREATE INDEX IF NOT EXISTS "properties_status_idx" ON "properties"("status");
CREATE INDEX IF NOT EXISTS "properties_monthly_rent_idx" ON "properties"("monthly_rent");
CREATE INDEX IF NOT EXISTS "properties_bedrooms_idx" ON "properties"("bedrooms");
CREATE INDEX IF NOT EXISTS "properties_type_idx" ON "properties"("type");

-- Create index for property_images
CREATE INDEX IF NOT EXISTS "property_images_property_id_idx" ON "property_images"("property_id");

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for properties updated_at
DROP TRIGGER IF EXISTS update_properties_updated_at ON "properties";
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON "properties"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
