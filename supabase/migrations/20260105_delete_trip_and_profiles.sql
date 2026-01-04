-- 1. Allow authenticated users to view profiles (Fixes 'Unknown' user issue)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
-- Allow any authenticated user to read basic profile info (email, etc)
CREATE POLICY "Public profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');


-- 2. Ensure deleting a Trip cascades to delete its Members automatically
ALTER TABLE public.trip_members
DROP CONSTRAINT IF EXISTS trip_members_trip_id_fkey;

ALTER TABLE public.trip_members
ADD CONSTRAINT trip_members_trip_id_fkey
FOREIGN KEY (trip_id)
REFERENCES public.trips(id)
ON DELETE CASCADE;
