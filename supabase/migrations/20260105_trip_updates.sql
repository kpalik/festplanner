-- 1. Reset Primary Key to ensure it relies only on 'id', not 'user_id'
-- This allows user_id to be nullable.

-- Drop existing PK (whatever it is)
ALTER TABLE public.trip_members DROP CONSTRAINT IF EXISTS trip_members_pkey;

-- Ensure 'id' column exists
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Set 'id' as the new Primary Key
ALTER TABLE public.trip_members ADD PRIMARY KEY (id);

-- 2. Now modify user_id to be nullable and add invitation email
ALTER TABLE public.trip_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS invitation_email TEXT;

-- 3. Update Unique Constraints logic
DROP INDEX IF EXISTS idx_trip_members_unique_user;
DROP INDEX IF EXISTS idx_trip_members_unique_email;

CREATE UNIQUE INDEX idx_trip_members_unique_user ON public.trip_members (trip_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_trip_members_unique_email ON public.trip_members (trip_id, invitation_email) WHERE invitation_email IS NOT NULL;

-- 4. Fix Status Check Constraint (allow 'accepted')
ALTER TABLE public.trip_members DROP CONSTRAINT IF EXISTS trip_members_status_check;
ALTER TABLE public.trip_members ADD CONSTRAINT trip_members_status_check CHECK (status IN ('pending', 'accepted', 'declined'));
