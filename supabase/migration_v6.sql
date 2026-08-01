-- ═══════════════════════════════════════════════════════════
-- Maistorix — Migration v6 — Push Subscriptions
-- Paste in Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  endpoint   text not null unique,
  p256dh     text,
  auth       text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subs"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id);
