-- ═══════════════════════════════════════════════════════════
-- СтройКалк — Database Schema
-- Paste this into Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ────────────────────────
create table if not exists public.profiles (
  id              uuid references auth.users on delete cascade primary key,
  email           text,
  full_name       text,
  phone           text,
  -- Company
  company_name    text,
  company_type    text default 'individual',  -- individual | company
  eik             text,
  vat_number      text,
  address         text,
  city            text,
  logo_url        text,
  -- Offer defaults
  offer_footer    text default 'Офертата е валидна 30 дни от датата на издаване.',
  default_vat     boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Clients ───────────────────────────────────────────────
create table if not exists public.clients (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  name       text not null,
  phone      text,
  email      text,
  address    text,
  city       text,
  eik        text,
  vat_number text,
  notes      text,
  created_at timestamptz default now()
);

-- ── Projects ──────────────────────────────────────────────
create table if not exists public.projects (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  client_id    uuid references public.clients on delete set null,
  name         text not null,
  address      text,
  status       text default 'draft',
  -- draft | sent | accepted | in_progress | completed | cancelled
  items        jsonb default '[]'::jsonb,
  vat          boolean default false,
  notes        text,
  subtotal     numeric(10,2) default 0,
  vat_amount   numeric(10,2) default 0,
  total        numeric(10,2) default 0,
  offer_number text,
  offer_date   date default current_date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Payments ──────────────────────────────────────────────
create table if not exists public.payments (
  id         uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  amount     numeric(10,2) not null,
  type       text default 'payment',  -- advance | payment | final
  method     text default 'cash',     -- cash | bank | card
  notes      text,
  paid_at    date default current_date,
  created_at timestamptz default now()
);

-- ── Photos ────────────────────────────────────────────────
create table if not exists public.photos (
  id         uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  url        text not null,
  caption    text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security — всеки вижда само своите данни
-- ═══════════════════════════════════════════════════════════
alter table public.profiles  enable row level security;
alter table public.clients   enable row level security;
alter table public.projects  enable row level security;
alter table public.payments  enable row level security;
alter table public.photos    enable row level security;

-- Profiles
create policy "Own profile" on public.profiles
  for all using (auth.uid() = id);

-- Clients
create policy "Own clients" on public.clients
  for all using (auth.uid() = user_id);

-- Projects
create policy "Own projects" on public.projects
  for all using (auth.uid() = user_id);

-- Payments
create policy "Own payments" on public.payments
  for all using (auth.uid() = user_id);

-- Photos
create policy "Own photos" on public.photos
  for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- Auto-create profile when user registers
-- ═══════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- Storage bucket за снимки
-- ═══════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', true)
on conflict do nothing;

create policy "Auth users can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'project-photos' and auth.role() = 'authenticated');

create policy "Public photos readable"
  on storage.objects for select
  using (bucket_id = 'project-photos');

create policy "Own photos deletable"
  on storage.objects for delete
  using (bucket_id = 'project-photos' and auth.uid()::text = (storage.foldername(name))[1]);
