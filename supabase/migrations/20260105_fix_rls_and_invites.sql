-- Fix Infinite Recursion by using SECURITY DEFINER functions for BOTH directions

-- 1. Helper Functions (SECURITY DEFINER to bypass RLS)

-- Check if user is a member of the trip (used by 'trips' policy)
CREATE OR REPLACE FUNCTION public.is_trip_member(target_trip_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = target_trip_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is an admin member (used by 'trip_members' policy)
CREATE OR REPLACE FUNCTION public.is_trip_admin(target_trip_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = target_trip_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check trip creator (used by 'trip_members' policy to avoid querying 'trips' directly and triggering recursion)
CREATE OR REPLACE FUNCTION public.get_trip_creator(target_trip_id UUID)
RETURNS UUID AS $$
DECLARE
  creator UUID;
BEGIN
  SELECT created_by INTO creator FROM public.trips WHERE id = target_trip_id;
  RETURN creator;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Policies for 'trips'
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view allowed trips" ON public.trips;
DROP POLICY IF EXISTS "Creators can update trips" ON public.trips;
DROP POLICY IF EXISTS "Creators can delete trips" ON public.trips;
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
-- Cleanup old potentially conflicting policies
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they are invited to" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they are members of" ON public.trips;

-- View: Creator OR Member
CREATE POLICY "Users can view allowed trips"
ON public.trips
FOR SELECT
USING (
  created_by = auth.uid()
  OR
  is_trip_member(id)
);

-- Update/Delete: Creator Only
CREATE POLICY "Creators can update trips"
ON public.trips
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete trips"
ON public.trips
FOR DELETE
USING (created_by = auth.uid());

-- Insert: Anyone authenticated
CREATE POLICY "Users can create trips"
ON public.trips
FOR INSERT
WITH CHECK (auth.uid() = created_by);


-- 3. Policies for 'trip_members'
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view trip members" ON public.trip_members;
DROP POLICY IF EXISTS "Organizers can manage members" ON public.trip_members;
-- Cleanup old policies
DROP POLICY IF EXISTS "Members can view other members" ON public.trip_members;
DROP POLICY IF EXISTS "Organizers can insert members" ON public.trip_members;
DROP POLICY IF EXISTS "Organizers can update members" ON public.trip_members;
DROP POLICY IF EXISTS "Organizers can delete members" ON public.trip_members;


-- View: If you are the Trip Creator OR you are a Member of that trip
CREATE POLICY "Users can view trip members"
ON public.trip_members
FOR SELECT
USING (
  get_trip_creator(trip_id) = auth.uid()
  OR
  is_trip_member(trip_id)
);

-- Manage (Insert/Update/Delete): If you are Trip Creator OR Trip Admin
-- Use helper functions to avoid touching 'trips' table directly in a way that triggers RLS
CREATE POLICY "Organizers can manage members"
ON public.trip_members
FOR ALL
USING (
   get_trip_creator(trip_id) = auth.uid()
   OR
   is_trip_admin(trip_id)
);
