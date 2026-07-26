-- Support tickets table
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text,
  email       text,
  subject     text not null,
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'pending', 'resolved')),
  admin_note  text,
  created_at  timestamptz default now()
);

-- RLS
alter table public.support_tickets enable row level security;

-- Users can see only their own tickets
create policy "Users see own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

-- Users can insert their own tickets
create policy "Users insert own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Admin (service role) can see all tickets — handled via service key in edge function
-- For admin page we'll use a separate RLS bypass via admin check
create policy "Admin sees all tickets"
  on public.support_tickets for select
  using (
    auth.jwt() ->> 'email' = 'wellecfx@gmail.com'
  );

create policy "Admin updates tickets"
  on public.support_tickets for update
  using (
    auth.jwt() ->> 'email' = 'wellecfx@gmail.com'
  );

-- Index
create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);
