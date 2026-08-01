-- ═══════════════════════════════════════════════════════════
-- Maistorix — Migration v5
-- Paste in Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists stripe_trial_end timestamptz;

alter table public.profiles
  add column if not exists stripe_sub_status text;

alter table public.profiles
  add column if not exists stripe_current_period_end timestamptz;

alter table public.profiles
  add column if not exists stripe_billing_interval text default 'month';

alter table public.profiles
  add column if not exists trial_used boolean default false;
