-- 1. Ensure the table exists (idempotent)
create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  artist text,
  url text not null,
  uploader text,
  created_at timestamptz default now()
);

-- 2. Ensure permissions are granted to the 'anon' role (used by the client)
alter table public.songs enable row level security;

-- Drop existing policy to ensure we have a clean slate
drop policy if exists "Public songs access" on public.songs;

-- Create a permissive policy for public access
create policy "Public songs access" 
on public.songs 
for all 
using (true) 
with check (true);

-- Explicitly grant privileges to the roles
grant all on table public.songs to anon;
grant all on table public.songs to authenticated;
grant all on table public.songs to service_role;

-- 3. Enable Realtime
alter publication supabase_realtime add table public.songs;

-- 4. CRITICAL: Force PostgREST to reload the schema cache
-- This fixes the "Could not find the table ... in the schema cache" error
NOTIFY pgrst, 'reload schema';
