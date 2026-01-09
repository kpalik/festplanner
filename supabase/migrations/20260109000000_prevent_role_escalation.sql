-- Secure role updates on profiles table
-- This migration adds a trigger to prevent unauthorized role escalation.

CREATE OR REPLACE FUNCTION public.check_role_update()
RETURNS TRIGGER AS $$
DECLARE
  requesting_user_role text;
BEGIN
  -- 1. Allow updates from service_role (migrations, server-side admin scripts, auth hooks)
  IF (auth.jwt() ->> 'role' = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- 2. Check if the 'role' column is being set/modified
  IF (TG_OP = 'INSERT') THEN
    -- On INSERT, if role is provided and is not 'user', treat it as escalation attempt
    -- (Assuming 'user' is the default safe role)
    IF (NEW.role IS NOT NULL AND NEW.role <> 'user') THEN
       -- Check if the requester is a superadmin
       SELECT role INTO requesting_user_role FROM public.profiles WHERE id = auth.uid();
       
       IF (requesting_user_role IS DISTINCT FROM 'superadmin') THEN
          RAISE EXCEPTION 'Unauthorized: Users cannot set their own role to %', NEW.role;
       END IF;
    END IF;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- On UPDATE, if role is changing
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
       SELECT role INTO requesting_user_role FROM public.profiles WHERE id = auth.uid();
       
       IF (requesting_user_role IS DISTINCT FROM 'superadmin') THEN
          RAISE EXCEPTION 'Unauthorized: Only superadmins can change user roles.';
       END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow clean recreate
DROP TRIGGER IF EXISTS check_role_update_trigger ON public.profiles;

-- Create the trigger for both INSERT and UPDATE
CREATE TRIGGER check_role_update_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_role_update();
