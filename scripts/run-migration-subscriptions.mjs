// Script to run Phase 12 subscriptions migration
// Usage: node scripts/run-migration-subscriptions.mjs
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No database connection string found (DIRECT_URL or DATABASE_URL)');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '00005_subscriptions_schema.sql'),
    'utf8'
  );

  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    console.log('Running subscriptions migration...');
    await client.query(sql);
    console.log('Migration completed successfully!\n');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'subscription_plan_configs', 'subscriptions',
        'subscription_payments', 'scoring_usage'
      )
      ORDER BY table_name
    `);

    console.log('Created tables:', result.rows.map(r => r.table_name).join(', '));
    console.log(`Total: ${result.rows.length} tables`);

    // Verify seed data
    const plans = await client.query('SELECT "plan_type", "tier", "name" FROM "subscription_plan_configs" ORDER BY "plan_type", "tier"');
    console.log('\nSeeded plans:');
    plans.rows.forEach(p => console.log(`  - ${p.plan_type} ${p.tier}: ${p.name}`));

    console.log('\n✓ Subscriptions migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    console.error('Details:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
