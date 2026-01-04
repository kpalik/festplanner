-- Backfill profiles for existing users who don't have one
insert into public.profiles (id, email)
select id, email
from auth.users
where id not in (select id from public.profiles);

-- Verify the profile exists
select * from public.profiles;
