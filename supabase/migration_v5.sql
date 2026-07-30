-- ═══════════════════════════════════════════════════════════
-- Maistorix — Migration v5
-- Paste in Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists stripe_trial_end timestamptz;  -- trial end date from Stripe

alter table public.profiles
  add column if not exists stripe_sub_status text;  -- active | trialing | past_due | canceled
