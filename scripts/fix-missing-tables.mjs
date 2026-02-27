// Script to create all missing tables in the database
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('No DATABASE_URL'); process.exit(1); }

const pool = new Pool({ connectionString });

async function run() {
  const client = await pool.connect();
  try {
    // Check which enums exist
    const { rows: enums } = await client.query(`SELECT typname FROM pg_type WHERE typtype = 'e'`);
    const enumNames = enums.map(e => e.typname);
    console.log('Existing enums:', enumNames.join(', '));

    // Create missing enums
    if (!enumNames.includes('LeaseDocumentType')) {
      console.log('Creating enum LeaseDocumentType...');
      await client.query(`CREATE TYPE "LeaseDocumentType" AS ENUM ('CONTRACT_SIGNED', 'PAYMENT_RECEIPT', 'DELIVERY_INVENTORY', 'RETURN_INVENTORY', 'ADDENDUM', 'PHOTO', 'OTHER')`);
    }

    if (!enumNames.includes('CouponType')) {
      console.log('Creating enum CouponType...');
      await client.query(`CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_MONTHS', 'FULL_ACCESS')`);
    }

    // Check which tables exist
    const { rows: tables } = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    const tableNames = tables.map(t => t.table_name);

    // 1. team_members
    if (!tableNames.includes('team_members')) {
      console.log('Creating table: team_members');
      await client.query(`
        CREATE TABLE public.team_members (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          owner_id uuid NOT NULL,
          name varchar(100),
          email varchar(255) NOT NULL,
          role varchar(20) NOT NULL DEFAULT 'viewer',
          status varchar(20) NOT NULL DEFAULT 'pending',
          invited_at timestamptz NOT NULL DEFAULT now(),
          accepted_at timestamptz,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT team_members_pkey PRIMARY KEY (id),
          CONSTRAINT team_members_owner_id_email_key UNIQUE (owner_id, email),
          CONSTRAINT team_members_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE
        )
      `);
      await client.query(`CREATE INDEX idx_team_members_owner_id ON public.team_members(owner_id)`);
    }

    // 2. lease_documents
    if (!tableNames.includes('lease_documents')) {
      console.log('Creating table: lease_documents');
      await client.query(`
        CREATE TABLE public.lease_documents (
          id text NOT NULL DEFAULT gen_random_uuid()::text,
          lease_id uuid NOT NULL,
          uploaded_by uuid NOT NULL,
          type "LeaseDocumentType" NOT NULL,
          file_name varchar(255) NOT NULL,
          file_path varchar(500) NOT NULL,
          file_size int NOT NULL,
          mime_type varchar(100) NOT NULL,
          created_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT lease_documents_pkey PRIMARY KEY (id),
          CONSTRAINT lease_documents_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE,
          CONSTRAINT lease_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
        )
      `);
      await client.query(`CREATE INDEX idx_lease_documents_lease_id ON public.lease_documents(lease_id)`);
      await client.query(`CREATE INDEX idx_lease_documents_uploaded_by ON public.lease_documents(uploaded_by)`);
    }

    // 3. wishlist_items
    if (!tableNames.includes('wishlist_items')) {
      console.log('Creating table: wishlist_items');
      await client.query(`
        CREATE TABLE public.wishlist_items (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          property_id uuid NOT NULL,
          created_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT wishlist_items_pkey PRIMARY KEY (id),
          CONSTRAINT wishlist_items_user_id_property_id_key UNIQUE (user_id, property_id),
          CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
          CONSTRAINT wishlist_items_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
        )
      `);
      await client.query(`CREATE INDEX idx_wishlist_items_user_id ON public.wishlist_items(user_id)`);
      await client.query(`CREATE INDEX idx_wishlist_items_property_id ON public.wishlist_items(property_id)`);
    }

    // 4. tenant_preferences
    if (!tableNames.includes('tenant_preferences')) {
      console.log('Creating table: tenant_preferences');
      await client.query(`
        CREATE TABLE public.tenant_preferences (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          preferred_cities text[] NOT NULL DEFAULT '{}',
          preferred_bedrooms int,
          preferred_property_types text[] NOT NULL DEFAULT '{}',
          min_budget int,
          max_budget int,
          pet_friendly boolean NOT NULL DEFAULT false,
          move_in_date date,
          updated_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT tenant_preferences_pkey PRIMARY KEY (id),
          CONSTRAINT tenant_preferences_user_id_key UNIQUE (user_id),
          CONSTRAINT tenant_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
        )
      `);
    }

    // 5. coupons
    if (!tableNames.includes('coupons')) {
      console.log('Creating table: coupons');
      await client.query(`
        CREATE TABLE public.coupons (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          code varchar(50) NOT NULL,
          type "CouponType" NOT NULL,
          percentage_off int,
          amount_off int,
          free_months int,
          valid_from timestamptz NOT NULL,
          valid_until timestamptz NOT NULL,
          max_uses int,
          current_uses int NOT NULL DEFAULT 0,
          applicable_plans text[] NOT NULL DEFAULT '{}',
          description text,
          is_active boolean NOT NULL DEFAULT true,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          CONSTRAINT coupons_pkey PRIMARY KEY (id),
          CONSTRAINT coupons_code_key UNIQUE (code)
        )
      `);
      await client.query(`CREATE INDEX idx_coupons_code ON public.coupons(code)`);
      await client.query(`CREATE INDEX idx_coupons_is_active ON public.coupons(is_active)`);
      await client.query(`CREATE INDEX idx_coupons_valid_until ON public.coupons(valid_until)`);
    }

    // 6. coupon_usages
    if (!tableNames.includes('coupon_usages')) {
      console.log('Creating table: coupon_usages');
      await client.query(`
        CREATE TABLE public.coupon_usages (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          coupon_id uuid NOT NULL,
          user_id uuid NOT NULL,
          subscription_id uuid,
          used_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT coupon_usages_pkey PRIMARY KEY (id),
          CONSTRAINT coupon_usages_coupon_id_user_id_key UNIQUE (coupon_id, user_id),
          CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE,
          CONSTRAINT coupon_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
        )
      `);
      await client.query(`CREATE INDEX idx_coupon_usages_user_id ON public.coupon_usages(user_id)`);
    }

    console.log('\nAll missing tables created successfully!');

    // Final verification
    const { rows: finalTables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('team_members', 'lease_documents', 'wishlist_items', 'tenant_preferences', 'coupons', 'coupon_usages')
      ORDER BY table_name
    `);
    console.log('Verified tables:', finalTables.map(t => t.table_name).join(', '));

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
