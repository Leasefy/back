-- Migration: Replace BOTH role with AGENT, remove activeRole, add PropertyAccess and Chat models
-- Phase: 2.1-01
-- Date: 2026-02-05
--
-- IMPORTANT: This migration requires careful execution order due to enum dependency.
-- Run in Supabase SQL Editor.

-- Step 1: Drop the active_role column first (it depends on Role enum)
ALTER TABLE "users" DROP COLUMN IF EXISTS "active_role";

-- Step 2: Update any users with BOTH role to LANDLORD (data migration)
-- You may want to review this before running
UPDATE "users" SET "role" = 'LANDLORD' WHERE "role" = 'BOTH';

-- Step 3: Alter the Role enum - add AGENT, remove BOTH
-- PostgreSQL doesn't allow dropping enum values directly, so we need to recreate
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENT';

-- Note: BOTH cannot be easily removed from PostgreSQL enum without recreating it.
-- Since no rows use BOTH anymore (Step 2), it's safe to leave the value in the enum
-- but it won't be used by the application code.

-- Step 4: Create PropertyAccess table
CREATE TABLE IF NOT EXISTS "property_access" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "property_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_access_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create ApplicationConversation table
CREATE TABLE IF NOT EXISTS "application_conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "application_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_conversations_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create ChatMessage table
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- Step 7: Add unique constraints
ALTER TABLE "property_access" ADD CONSTRAINT IF NOT EXISTS "property_access_property_id_agent_id_key" UNIQUE ("property_id", "agent_id");
ALTER TABLE "application_conversations" ADD CONSTRAINT IF NOT EXISTS "application_conversations_application_id_key" UNIQUE ("application_id");

-- Step 8: Add indexes
CREATE INDEX IF NOT EXISTS "property_access_agent_id_idx" ON "property_access"("agent_id");
CREATE INDEX IF NOT EXISTS "property_access_property_id_idx" ON "property_access"("property_id");
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");
CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages"("created_at");

-- Step 9: Add foreign key constraints
ALTER TABLE "property_access" ADD CONSTRAINT "property_access_property_id_fkey"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_access" ADD CONSTRAINT "property_access_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "property_access" ADD CONSTRAINT "property_access_granted_by_id_fkey"
    FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "application_conversations" ADD CONSTRAINT "application_conversations_application_id_fkey"
    FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "application_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
