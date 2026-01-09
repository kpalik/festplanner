-- Secure Profiles Table with stricter RLS
-- Mitigates issue where users could bulk-download all profiles via API.

-- 1. Helper Function: Check if user is superadmin
-- Security Definer to safely lookup role without recursion or RLS blocking
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function: Check if target user is a colleague in any shared trip
-- Security Definer to allowing checking trip_members even if we tighten that later
CREATE OR REPLACE FUNCTION public.is_trip_colleague(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.trip_members my_trips
    JOIN public.trip_members target_trips ON my_trips.trip_id = target_trips.trip_id
    WHERE my_trips.user_id = auth.uid()
    AND target_trips.user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper Function: Lookup ID by Email (for Invite feature)
-- Allows finding a user ID to invite them, without exposing full profile data to the public/non-colleagues.
CREATE OR REPLACE FUNCTION public.get_profile_id_by_email(email_input text)
RETURNS TABLE (id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id FROM public.profiles p WHERE p.email = email_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Enable RLS (Ensure it is on)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to start fresh and clean
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them" ON public.profiles; 
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view trip colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 6. Define New Policies

-- A. View Own Profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- B. Superadmins can view ALL profiles
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin());

-- C. Users can view profiles of people they are on a trip with
-- This is critical for the "Trip Members" list to show emails/avatars of others.
-- Without this, users would only see themselves and "Unknown" for others.
CREATE POLICY "Users can view trip colleagues"
ON public.profiles
FOR SELECT
USING (public.is_trip_colleague(id));

-- D. Update Own Profile (Self-service updates)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- E. Insert Own Profile (Rare, usually handled by trigger, but good for completeness if auto-creation via client logic exists)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
