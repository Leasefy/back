// Script to add missing columns to users table
// Compares Prisma schema with actual DB and adds missing columns
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No DATABASE_URL found');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function fixUserColumns() {
  const client = await pool.connect();

  try {
    // 1. Get existing columns in users table
    const { rows: existingCols } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);

    const colNames = existingCols.map(c => c.column_name);
    console.log('Existing columns in users table:', colNames.join(', '));

    // 2. Define expected columns from Prisma schema
    const expectedColumns = [
      { name: 'subscription_plan', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'FREE'` },
      { name: 'subscription_ends_at', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz` },
      { name: 'email_notifications_enabled', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true` },
      { name: 'push_notifications_enabled', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true` },
      { name: 'fcm_token', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_token text` },
      { name: 'notification_settings', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notification_settings jsonb` },
      { name: 'is_active', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true` },
      { name: 'deleted_at', sql: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at timestamptz` },
    ];

    // 3. Add missing columns
    let added = 0;
    for (const col of expectedColumns) {
      if (!colNames.includes(col.name)) {
        console.log(`Adding missing column: ${col.name}`);
        await client.query(col.sql);
        added++;
      } else {
        console.log(`Column exists: ${col.name}`);
      }
    }

    if (added === 0) {
      console.log('\nAll expected columns already exist.');
    } else {
      console.log(`\nAdded ${added} missing column(s).`);
    }

    // 4. Verify final state
    const { rows: finalCols } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\nFinal users table columns:');
    finalCols.forEach(c => {
      console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable}, default: ${c.column_default || 'none'})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixUserColumns();
