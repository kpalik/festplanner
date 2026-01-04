-- Create a public bucket for images if it doesn't exist
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Allow public access to view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'images' );

-- Allow authenticated users to upload images
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Allow authenticated users to update their own images (or all for now since simple admin)
create policy "Authenticated users can update images"
  on storage.objects for update
  using ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete images
create policy "Authenticated users can delete images"
  on storage.objects for delete
  using ( bucket_id = 'images' and auth.role() = 'authenticated' );
