alter table public.shows 
add column if not exists is_late_night boolean default false;
