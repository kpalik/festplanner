-- Function to link a user to their email invites upon login
-- This needs to be SECURITY DEFINER to verify the email against auth.users and update trip_members bypassing RLS
CREATE OR REPLACE FUNCTION public.link_user_invitations()
RETURNS void AS $$
DECLARE
  current_user_email text;
BEGIN
  -- Get the email of the currently authenticated user from the auth.jwt() or auth.users
  -- auth.jwt() -> 'email' claim is usually present and safer/faster than querying auth.users table directly if relying on session
  -- However, querying auth.users is robust in a SECURITY DEFINER function.
  
  SELECT email INTO current_user_email FROM auth.users WHERE id = auth.uid();

  IF current_user_email IS NOT NULL THEN
    UPDATE public.trip_members
    SET user_id = auth.uid()
    WHERE invitation_email = current_user_email
    AND user_id IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
