-- Fix Critical Security Hole: Drop permissive policies that override strict ones

-- 1. Secure Profiles
-- This policy currently allows any authenticated user to view ALL profiles.
DROP POLICY IF EXISTS "Public profiles" ON "public"."profiles";

-- 2. Secure Trip Members
-- This policy currently allows any authenticated user to view ALL trip members.
DROP POLICY IF EXISTS "Enable select trip_members for authenticated" ON "public"."trip_members";
