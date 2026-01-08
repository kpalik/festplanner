-- 1. Create a function to sync role from profiles to auth.users JWT metadata
CREATE OR REPLACE FUNCTION public.sync_user_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the auth.users table with the new role in app_metadata
  -- This makes the role available in the JWT token (session.user.app_metadata.role)
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on public.profiles
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;

CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_jwt();

-- 3. Backfill existing users
-- This ensures all current users get their role synced to their metadata immediately
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id, role FROM public.profiles
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;
