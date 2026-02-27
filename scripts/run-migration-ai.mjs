// Script to run Phase 20 AI document analysis migration
// Usage: node scripts/run-migration-ai.mjs
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
    path.join(__dirname, '..', 'supabase', 'migrations', '00006_document_analysis.sql'),
    'utf8'
  );

  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    console.log('Running AI document analysis migration...');
    await client.query(sql);
    console.log('Migration completed successfully!\n');

    // Verify table exists
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'document_analysis_results'
    `);

    if (result.rows.length > 0) {
      console.log('Created table: document_analysis_results');
    } else {
      console.error('Table was not created!');
      process.exit(1);
    }

    // Verify indexes
    const indexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'document_analysis_results'
    `);

    console.log('Indexes:', indexes.rows.map(r => r.indexname).join(', '));
    console.log('\n✓ AI document analysis migration completed successfully!');
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
