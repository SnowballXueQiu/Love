-- Create tables
create table settings (
  id int primary key generated always as identity,
  name1 text,
  avatar1 text,
  password1_hash text, -- Storing plain text for now based on current app logic, but should be hashed
  name2 text,
  avatar2 text,
  password2_hash text,
  start_date text
);

create table messages (
  id bigint primary key generated always as identity,
  text text,
  date text,
  sender text
);

create table photos (
  id bigint primary key generated always as identity,
  image_urls text[],
  description text,
  date text
);

-- Insert default settings
insert into settings (name1, name2, start_date, password1_hash, password2_hash)
values ('Name1', 'Name2', '2024-01-01', '123', '456');

-- Storage buckets
-- You need to create 'avatars' and 'photos' buckets in Supabase Storage and set public access policies.
