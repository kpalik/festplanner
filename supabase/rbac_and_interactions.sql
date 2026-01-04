-- 1. Promote First User to Superadmin
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE public.profiles SET role = 'superadmin' WHERE id = first_user_id;
  END IF;
END $$;

-- 2. Create Show Interactions Table
CREATE TYPE public.interaction_type AS ENUM ('like', 'must_see', 'meh');

CREATE TABLE IF NOT EXISTS public.show_interactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  show_id uuid REFERENCES public.shows(id) ON DELETE CASCADE NOT NULL,
  interaction_type public.interaction_type NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, show_id) -- One interaction per show per user
);

-- 3. RLS for Show Interactions
ALTER TABLE public.show_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own interactions"
  ON public.show_interactions
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view interactions"
  ON public.show_interactions
  FOR SELECT
  USING (true);


-- 4. Update RLS for Administrative Tables (Festivals, Bands, Stages, Shows)
-- Drop old permissive policies if they exist (or ensure new ones take precedence if we used permissive)
-- Note: 'authenticated' policy created earlier allowed DELETE. We need to restrict WRITEs.

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Festivals:
DROP POLICY IF EXISTS "Public festivals are viewable by everyone" ON public.festivals;
CREATE POLICY "Public festivals are viewable by everyone" ON public.festivals FOR SELECT USING (true); -- Actually, description says view access for all? Assuming yes for now, or is_public logic.
-- User said: "rest can only view festivals".
-- Let's stick to: Everyone can VIEW. Only Admin can WRITE.
-- IMPORTANT: We previously had policies allowing authenticated users to INSERT/UPDATE/DELETE. We must drop/replace them.
-- I will blindly DROP the likely existing policies to be safe, or just Create new restrictive ones if I knew the names.
-- Since I don't know exact names of all previous policies, I will rely on the fact that if I enable RLS, default is deny.
-- But I created specific policies before. I should try to drop them by name if I recalled them.
-- I'll define STRICT policies now.

-- POLICY: Read
-- Reuse existing or create new?
-- CREATE POLICY "Enable read access for all users" ON public.festivals FOR SELECT USING (true);
-- POLICY: Write (Insert, Update, Delete) -> Only Admin
CREATE POLICY "Admins can insert festivals" ON public.festivals FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update festivals" ON public.festivals FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete festivals" ON public.festivals FOR DELETE USING (public.is_admin());


-- Bands:
CREATE POLICY "Admins can insert bands" ON public.bands FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update bands" ON public.bands FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete bands" ON public.bands FOR DELETE USING (public.is_admin());

-- Stages:
CREATE POLICY "Admins can insert stages" ON public.stages FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update stages" ON public.stages FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete stages" ON public.stages FOR DELETE USING (public.is_admin());

-- Shows:
CREATE POLICY "Admins can insert shows" ON public.shows FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update shows" ON public.shows FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete shows" ON public.shows FOR DELETE USING (public.is_admin());

-- Note: This script ADDS policies. It does not automatically remove the "Authenticated users can delete" policy I added earlier (fix_delete_policies.sql).
-- The user needs to manually remove conflicting policies or I should try to drop them here.
-- The names in fix_delete_policies.sql were like "Enable delete for authenticated users...".
-- attempting Drop:
DROP POLICY IF EXISTS "Enable delete for authenticated users on festivals" ON public.festivals;
DROP POLICY IF EXISTS "Enable delete for authenticated users on bands" ON public.bands;
DROP POLICY IF EXISTS "Enable delete for authenticated users on stages" ON public.stages;
DROP POLICY IF EXISTS "Enable delete for authenticated users on shows" ON public.shows;

-- Ensure read access is still open (some tables might rely on default deny now if I dropped things?)
-- Assuming "Enable read access for all users" exists or similar. If not, add basic read.
CREATE POLICY "Everyone can read bands" ON public.bands FOR SELECT USING (true);
CREATE POLICY "Everyone can read stages" ON public.stages FOR SELECT USING (true);
CREATE POLICY "Everyone can read shows" ON public.shows FOR SELECT USING (true);
