-- Migration: Create user sync trigger
-- Purpose: Automatically sync new auth.users to public.users table
--
-- IMPORTANT: This migration must be run manually in Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query > Paste & Run)
--
-- Prisma cannot access the auth schema, so this trigger must be created
-- via Supabase's SQL Editor which has the necessary permissions.
--
-- Created: 2026-01-25
-- Phase: 02-auth-users, Plan: 01

-- ============================================
-- Drop existing trigger and function if they exist (idempotent)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================
-- Create function to handle new user creation
-- ============================================
-- This function is called when a new user is created in auth.users
-- It inserts a corresponding record into public.users with:
--   - id: Same UUID as auth.users.id
--   - email: User's email from auth.users
--   - role: From raw_user_meta_data if provided, defaults to 'TENANT'
--   - first_name: From raw_user_meta_data if provided
--   - last_name: From raw_user_meta_data if provided
--
-- SECURITY DEFINER allows this function to write to public.users
-- even when called from auth schema context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      -- Try to get role from user metadata, validate it's a valid enum value
      CASE
        WHEN NEW.raw_user_meta_data ->> 'role' IN ('TENANT', 'LANDLORD', 'BOTH')
        THEN (NEW.raw_user_meta_data ->> 'role')::"Role"
        ELSE NULL
      END,
      'TENANT'::"Role"  -- Default to TENANT if not specified or invalid
    ),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- ============================================
-- Create trigger on auth.users
-- ============================================
-- This trigger fires AFTER each INSERT on auth.users
-- and calls handle_new_user() to sync to public.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Verification (optional - uncomment to test)
-- ============================================
-- After running this migration, you can verify by:
-- 1. Creating a new user via Supabase Auth
-- 2. Checking public.users table for the new record
--
-- SELECT * FROM public.users ORDER BY created_at DESC LIMIT 1;
