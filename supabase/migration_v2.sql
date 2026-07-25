-- ═══════════════════════════════════════════════════════════
-- СтройКалк — Migration v2
-- Paste in Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════

-- ── Add share_token to projects ────────────────────────────
alter table public.projects
  add column if not exists share_token uuid;

-- Public read policy for share links (anon access by token)
drop policy if exists "Share link read" on public.projects;
create policy "Share link read" on public.projects
  for select to anon
  using (share_token is not null);

-- Allow anon to read clients (needed for share page)
drop policy if exists "Share client read" on public.clients;
create policy "Share client read" on public.clients
  for select to anon
  using (true);

-- Allow anon to read profiles (company data for share page)
drop policy if exists "Share profile read" on public.profiles;
create policy "Share profile read" on public.profiles
  for select to anon
  using (true);

-- ── Expenses table ─────────────────────────────────────────
create table if not exists public.expenses (
  id           uuid default gen_random_uuid() primary key,
  project_id   uuid references public.projects on delete cascade not null,
  user_id      uuid references auth.users on delete cascade not null,
  description  text not null,
  amount       numeric(10,2) not null,
  category     text default 'materials',
  -- materials | equipment | subcontractor | other
  notes        text,
  expense_date date default current_date,
  created_at   timestamptz default now()
);

alter table public.expenses enable row level security;

drop policy if exists "Own expenses" on public.expenses;
create policy "Own expenses" on public.expenses
  for all using (auth.uid() = user_id);
