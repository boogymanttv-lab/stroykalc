-- ═══════════════════════════════════════════════════════════
-- СтройКалк — Migration v3
-- Paste in Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════

-- ── Tasks table ────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid default gen_random_uuid() primary key,
  project_id  uuid references public.projects on delete cascade not null,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  due_date    date,
  status      text default 'todo',  -- todo | in_progress | done
  created_at  timestamptz default now()
);

alter table public.tasks enable row level security;

drop policy if exists "Own tasks" on public.tasks;
create policy "Own tasks" on public.tasks
  for all using (auth.uid() = user_id);

-- ── reminder_days setting in profiles ──────────────────────
alter table public.profiles
  add column if not exists reminder_days integer default 7;
