// Script to run Phase 2.2 inmobiliaria migration
// This bypasses Prisma schema engine which has issues on OneDrive/Windows
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
  console.error('No database connection string found');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '00004_inmobiliaria_schema.sql'),
    'utf8'
  );

  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    console.log('Running Phase 2.2 inmobiliaria migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'agencies', 'agency_members', 'propietarios', 'consignaciones',
        'pipeline_items', 'cobros', 'dispersiones', 'dispersion_items',
        'solicitudes_mantenimiento', 'mantenimiento_quotes',
        'renovaciones', 'renovacion_history', 'actas_entrega',
        'agency_document_templates', 'agency_documents',
        'agency_integrations', 'activity_logs'
      )
      ORDER BY table_name
    `);

    console.log('Created tables:', result.rows.map(r => r.table_name).join(', '));
    console.log(`Total: ${result.rows.length} tables`);
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
