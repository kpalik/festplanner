-- Allow authenticated users to create festivals
create policy "Enable insert for authenticated users"
on public.festivals
for insert
to authenticated
with check (true);

-- Allow users to update their own festivals
create policy "Enable update for own festivals"
on public.festivals
for update
to authenticated
using (auth.uid() = created_by);

-- Allow users to view all festivals (even drafts if they are owners, public for everyone)
-- Note: We already have a public policy. We need one for viewing drafts.
create policy "Enable read access for own drafts"
on public.festivals
for select
to authenticated
using (auth.uid() = created_by);
