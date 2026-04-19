-- ============================================================
-- Supabase migration for Wedding App
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- =====================
-- 1. RSVP Table
-- =====================
create table if not exists rsvps (
  id bigint generated always as identity primary key,
  created_at timestamptz default now() not null,
  name text not null,
  phone text default '',
  email text default '',
  attending boolean not null default true,
  guest_count integer not null default 1,
  side text not null default 'bride' check (side in ('bride', 'groom', 'both')),
  dietary text default '',
  message text default ''
);

-- Enable Row Level Security
alter table rsvps enable row level security;

-- Allow anyone to insert (guests submitting RSVP)
create policy "Allow public insert" on rsvps
  for insert
  with check (true);

-- Allow anyone to read (for duplicate name checking)
create policy "Allow public read" on rsvps
  for select
  using (true);

-- Fast name lookups for duplicate checking
create index if not exists idx_rsvps_name_lower on rsvps (lower(name));

-- =====================
-- 2. Storage Bucket
-- =====================
-- Create a PUBLIC bucket called "media"
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Allow anyone to read files (public website)
create policy "Allow public read media" on storage.objects
  for select
  using (bucket_id = 'media');

-- Allow authenticated users to upload/update/delete (you, via dashboard)
create policy "Allow auth upload media" on storage.objects
  for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');

create policy "Allow auth update media" on storage.objects
  for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');

create policy "Allow auth delete media" on storage.objects
  for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');
