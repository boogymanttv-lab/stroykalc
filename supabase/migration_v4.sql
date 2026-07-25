-- ═══════════════════════════════════════════════════════════
-- СтройКалк — Migration v4
-- Paste in Supabase SQL Editor and click Run
-- ═══════════════════════════════════════════════════════════

-- ── Plan field on profiles ──────────────────────────────────
alter table public.profiles
  add column if not exists plan text default 'free';   -- 'free' | 'pro'

alter table public.profiles
  add column if not exists plan_expires_at timestamptz; -- null = lifetime / monthly renewal

alter table public.profiles
  add column if not exists stripe_customer_id text;    -- for Stripe billing portal
