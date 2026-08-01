-- Migration v7: Public company profile page
alter table public.profiles
  add column if not exists public_slug        text unique,
  add column if not exists public_enabled     boolean default false,
  add column if not exists public_bio         text,
  add column if not exists public_services    text[],
  add column if not exists public_website     text,
  add column if not exists public_show_phone  boolean default true,
  add column if not exists public_show_email  boolean default false;

-- Index for fast slug lookups
create index if not exists profiles_public_slug_idx on public.profiles (public_slug)
  where public_slug is not null;
