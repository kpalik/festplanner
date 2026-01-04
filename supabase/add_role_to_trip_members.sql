-- Check if role column exists, if not add it
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'trip_members' and column_name = 'role') then
        alter table public.trip_members add column role text not null default 'member';
    end if;
end $$;

-- Update RLS policies to check role if needed, or ensuring insertion is allowed
-- (We already fixed policies in fix_trips_permissions.sql but adding a column might require refresh if using * select)
