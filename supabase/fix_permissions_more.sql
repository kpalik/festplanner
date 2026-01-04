-- BANDS: Allow authenticated users (admins) to create/update
create policy "Enable insert bands for authenticated" on public.bands for insert to authenticated with check (true);
create policy "Enable update bands for authenticated" on public.bands for update to authenticated using (true);
create policy "Enable select bands for everyone" on public.bands for select using (true);

-- STAGES: Allow authenticated users to create/update
create policy "Enable insert stages for authenticated" on public.stages for insert to authenticated with check (true);
create policy "Enable update stages for authenticated" on public.stages for update to authenticated using (true);
create policy "Enable select stages for everyone" on public.stages for select using (true);

-- SHOWS: Allow authenticated users to create/update
create policy "Enable insert shows for authenticated" on public.shows for insert to authenticated with check (true);
create policy "Enable update shows for authenticated" on public.shows for update to authenticated using (true);
create policy "Enable select shows for everyone" on public.shows for select using (true);
