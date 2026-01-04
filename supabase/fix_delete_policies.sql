-- Allow authenticated users to delete festivals (Subject to change with roles later)
create policy "Allow delete for all authenticated users" on public.festivals
for delete using (auth.role() = 'authenticated');

-- Allow authenticated users to delete bands
create policy "Allow delete for all authenticated users" on public.bands
for delete using (auth.role() = 'authenticated');

-- Allow authenticated users to delete stages (Cascade handle triggers, but direct delete needs policy)
create policy "Allow delete for all authenticated users" on public.stages
for delete using (auth.role() = 'authenticated');

-- Allow authenticated users to delete shows
create policy "Allow delete for all authenticated users" on public.shows
for delete using (auth.role() = 'authenticated');

-- Trip deletion already handled in fix_trips_permissions.sql? Double check
-- It had: create policy "Users can delete their own trips" on trips for delete using (auth.uid() = created_by);
-- Just in case we want to be sure:
drop policy if exists "Users can delete their own trips" on public.trips;
create policy "Users can delete their own trips" on public.trips
for delete using (auth.uid() = created_by);
