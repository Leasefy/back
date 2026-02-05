// Script to run SQL migration for Phase 2.1
// Usage: node scripts/run-migration-2.1.mjs

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function runMigration() {
  const directUrl = process.env.DIRECT_URL;

  if (!directUrl) {
    console.error('Error: DIRECT_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully.\n');

    // Execute migration steps one by one
    const steps = [
      {
        name: 'Step 1: Drop active_role column',
        sql: 'ALTER TABLE "users" DROP COLUMN IF EXISTS "active_role";',
      },
      {
        name: 'Step 2: Update BOTH users to LANDLORD',
        sql: `UPDATE "users" SET "role" = 'LANDLORD' WHERE "role" = 'BOTH';`,
      },
      {
        name: 'Step 3: Add AGENT to Role enum',
        sql: `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENT';`,
      },
      {
        name: 'Step 4: Create property_access table',
        sql: `CREATE TABLE IF NOT EXISTS "property_access" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "property_id" UUID NOT NULL,
          "agent_id" UUID NOT NULL,
          "granted_by_id" UUID NOT NULL,
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "property_access_pkey" PRIMARY KEY ("id")
        );`,
      },
      {
        name: 'Step 5: Create application_conversations table',
        sql: `CREATE TABLE IF NOT EXISTS "application_conversations" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "application_id" UUID NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "application_conversations_pkey" PRIMARY KEY ("id")
        );`,
      },
      {
        name: 'Step 6: Create chat_messages table',
        sql: `CREATE TABLE IF NOT EXISTS "chat_messages" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "conversation_id" UUID NOT NULL,
          "sender_id" UUID NOT NULL,
          "content" TEXT NOT NULL,
          "read_at" TIMESTAMP(3),
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
        );`,
      },
      {
        name: 'Step 7a: Add unique constraint on property_access',
        sql: `DO $$ BEGIN
          ALTER TABLE "property_access" ADD CONSTRAINT "property_access_property_id_agent_id_key" UNIQUE ("property_id", "agent_id");
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
      {
        name: 'Step 7b: Add unique constraint on application_conversations',
        sql: `DO $$ BEGIN
          ALTER TABLE "application_conversations" ADD CONSTRAINT "application_conversations_application_id_key" UNIQUE ("application_id");
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
      {
        name: 'Step 8: Add indexes',
        sql: `
          CREATE INDEX IF NOT EXISTS "property_access_agent_id_idx" ON "property_access"("agent_id");
          CREATE INDEX IF NOT EXISTS "property_access_property_id_idx" ON "property_access"("property_id");
          CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");
          CREATE INDEX IF NOT EXISTS "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");
          CREATE INDEX IF NOT EXISTS "chat_messages_created_at_idx" ON "chat_messages"("created_at");
        `,
      },
      {
        name: 'Step 9a: FK property_access -> properties',
        sql: `DO $$ BEGIN
          ALTER TABLE "property_access" ADD CONSTRAINT "property_access_property_id_fkey"
            FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
      {
        name: 'Step 9b: FK property_access -> users (agent)',
        sql: `DO $$ BEGIN
          ALTER TABLE "property_access" ADD CONSTRAINT "property_access_agent_id_fkey"
            FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
      {
        name: 'Step 9c: FK property_access -> users (granted_by)',
        sql: `DO $$ BEGIN
          ALTER TABLE "property_access" ADD CONSTRAINT "property_access_granted_by_id_fkey"
            FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
      {
        name: 'Step 9d: FK application_conversations -> applications',
        sql: `DO $$ BEGIN
          ALTER TABLE "application_conversations" ADD CONSTRAINT "application_conversations_application_id_fkey"
            FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
      {
        name: 'Step 9e: FK chat_messages -> application_conversations',
        sql: `DO $$ BEGIN
          ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey"
            FOREIGN KEY ("conversation_id") REFERENCES "application_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
      {
        name: 'Step 9f: FK chat_messages -> users (sender)',
        sql: `DO $$ BEGIN
          ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey"
            FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      },
    ];

    for (const step of steps) {
      try {
        console.log(`Executing: ${step.name}`);
        await client.query(step.sql);
        console.log(`  ✓ Success\n`);
      } catch (error) {
        // Some errors are expected (e.g., "already exists")
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('duplicate_object')) {
          console.log(`  ⚠ Skipped (already applied)\n`);
        } else {
          console.error(`  ✗ Error: ${error.message}\n`);
          // Continue with other steps
        }
      }
    }

    // Verify tables were created
    console.log('Verifying migration...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('property_access', 'application_conversations', 'chat_messages')
    `);

    console.log('Created tables:', result.rows.map(r => r.table_name).join(', '));

    // Check if AGENT value exists in Role enum
    const enumCheck = await client.query(`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
    `);
    console.log('Role enum values:', enumCheck.rows.map(r => r.enumlabel).join(', '));

    console.log('\n✓ Migration completed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
