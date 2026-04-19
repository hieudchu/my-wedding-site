-- ============================================================
-- Create admin user
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- Change the email and password below to your own!
-- ============================================================

-- Option 1: Create via SQL (change email/password!)
-- Note: This creates a confirmed user directly in the auth schema

-- IMPORTANT: After creating, you should change the password via the
-- Supabase Dashboard → Authentication → Users → click the user → change password

-- The easiest way: Go to Supabase Dashboard → Authentication → Users → "Add user"
-- Enter your email and a strong password. That's it.

-- ============================================================
-- LOCK DOWN: Disable public signups so nobody else can register
-- Go to: Supabase Dashboard → Authentication → Providers → Email
-- Turn OFF "Enable Sign Up" (keep "Enable Email" ON)
-- This ensures only YOUR manually-created account can log in.
-- ============================================================
