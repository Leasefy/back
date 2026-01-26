# Supabase Migrations

This directory contains SQL migrations that must be run manually in Supabase SQL Editor.

## Why Manual Execution?

Prisma manages the `public` schema, but cannot access the `auth` schema which is managed by Supabase. Migrations in this directory typically involve:

- Triggers on `auth.users` table
- Functions that need `SECURITY DEFINER` privileges
- Cross-schema operations between `auth` and `public`

## How to Apply Migrations

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of the migration file
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. Verify the output shows success

## Migration Files

| File | Description | Status |
|------|-------------|--------|
| `00001_user_sync_trigger.sql` | Sync auth.users to public.users | Manual |

## Verification

After running a migration, verify it worked:

```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check function exists
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

## Rollback

Each migration file includes `DROP IF EXISTS` statements at the top, making them idempotent. To rollback, you can:

1. Run only the `DROP` statements from the migration
2. Or re-run the entire migration (it will drop and recreate)

## Notes

- Migrations are numbered with a 5-digit prefix (00001, 00002, etc.)
- Always run migrations in order
- Each migration should be idempotent (safe to run multiple times)
- Test in a development project before running in production
