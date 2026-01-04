-- TRIPS: Authenticated users can create trips
create policy "Enable insert trips for authenticated" on public.trips for insert to authenticated with check (true);

-- TRIPS: Users can view trips they created OR are members of
-- Note: 'created_by' is on trips. 'trip_members' links users to trips.
-- For simplicity in this step, let's allow viewing all trips created by self.
create policy "Enable select trips for creator" on public.trips for select to authenticated using (auth.uid() = created_by);

-- TRIP MEMBERS: Authenticated users can insert themselves (or others if admin logic handled)
create policy "Enable insert trip_members for authenticated" on public.trip_members for insert to authenticated with check (true);
create policy "Enable select trip_members for authenticated" on public.trip_members for select to authenticated using (true);

-- Fix for viewing trips via join (if needed, simplified for now)
-- Better policy for viewing trips: (auth.uid() = created_by) OR (exists (select 1 from trip_members where trip_id = trips.id and user_id = auth.uid()))
drop policy "Enable select trips for creator" on public.trips;
create policy "Enable select trips for members" on public.trips for select to authenticated 
using (
    auth.uid() = created_by 
    OR 
    exists (select 1 from trip_members where trip_id = id and user_id = auth.uid())
);
