-- Add per-agency notification preferences
-- All enabled by default so existing agencies keep receiving emails
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS notif_morning_briefing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_report    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_hot_leads        boolean NOT NULL DEFAULT true;
