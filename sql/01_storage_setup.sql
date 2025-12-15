-- Enable the storage extension if not already enabled (usually enabled by default)
-- create extension if not exists "storage";

-- Create the 'music' bucket
insert into storage.buckets (id, name, public)
values ('music', 'music', true)
on conflict (id) do nothing;

-- Create the 'photos' bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Policy to allow public read access to 'music' bucket
create policy "Public Access Music"
on storage.objects for select
using ( bucket_id = 'music' );

-- Policy to allow public insert access to 'music' bucket
create policy "Public Insert Music"
on storage.objects for insert
with check ( bucket_id = 'music' );

-- Policy to allow public update access to 'music' bucket
create policy "Public Update Music"
on storage.objects for update
using ( bucket_id = 'music' );

-- Policy to allow public delete access to 'music' bucket
create policy "Public Delete Music"
on storage.objects for delete
using ( bucket_id = 'music' );

-- Policy to allow public read access to 'photos' bucket
create policy "Public Access Photos"
on storage.objects for select
using ( bucket_id = 'photos' );

-- Policy to allow public insert access to 'photos' bucket
create policy "Public Insert Photos"
on storage.objects for insert
with check ( bucket_id = 'photos' );

-- Policy to allow public update access to 'photos' bucket
create policy "Public Update Photos"
on storage.objects for update
using ( bucket_id = 'photos' );

-- Policy to allow public delete access to 'photos' bucket
create policy "Public Delete Photos"
on storage.objects for delete
using ( bucket_id = 'photos' );
