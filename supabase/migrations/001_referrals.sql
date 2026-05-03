-- =============================================================================
-- MIGRATION 001 — Onboarding + Referral System
-- Run this in Supabase SQL Editor AFTER schema.sql
-- Idempotent: safe to run multiple times
-- =============================================================================

-- 1. Add onboarding_completed to profiles
-- DEFAULT TRUE so existing users bypass onboarding; trigger sets FALSE for new users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add referral_code to agencies (auto-generated 8-char uppercase code)
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Backfill existing agencies
UPDATE public.agencies
SET referral_code = upper(substring(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- 3. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  referee_agency_id  UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  used_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_applied_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referee_agency_id)  -- each agency can only be referred once
);

-- 4. Replace handle_new_user to:
--    a) set onboarding_completed = FALSE for new users
--    b) generate referral_code for new agencies
--    All original fields (slug, owner_id, avatar_url, trial_ends_at, widget_configs) preserved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id    UUID;
  v_slug         TEXT;
  v_referral_code TEXT;
BEGIN
  -- 1. Créer le profil (onboarding_completed = FALSE pour les nouveaux)
  INSERT INTO public.profiles (id, email, full_name, avatar_url, onboarding_completed)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    FALSE
  );

  -- 2. Générer un slug unique pour l'agence
  v_slug := lower(regexp_replace(
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  )) || '-' || substr(new.id::text, 1, 8);

  -- 3. Créer l'agence avec son code de parrainage
  v_referral_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.agencies (name, slug, owner_id, referral_code)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_slug,
    new.id,
    v_referral_code
  )
  RETURNING id INTO v_agency_id;

  -- 4. Créer le membre (owner)
  INSERT INTO public.agency_members (agency_id, profile_id, role)
  VALUES (v_agency_id, new.id, 'owner');

  -- 5. Créer l'abonnement (trial 14 jours)
  INSERT INTO public.subscriptions (agency_id, plan, status, trial_ends_at)
  VALUES (v_agency_id, 'starter', 'trialing', now() + interval '14 days');

  -- 6. Créer la config widget par défaut
  INSERT INTO public.widget_configs (agency_id)
  VALUES (v_agency_id);

  RETURN new;
END;
$$;

-- 5. RLS for referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referrers can see their own referrals" ON public.referrals;
CREATE POLICY "Referrers can see their own referrals"
  ON public.referrals FOR SELECT
  USING (referrer_agency_id = get_my_agency_id());

DROP POLICY IF EXISTS "Authenticated users can insert a referral for themselves" ON public.referrals;
CREATE POLICY "Authenticated users can insert a referral for themselves"
  ON public.referrals FOR INSERT
  WITH CHECK (referee_agency_id = get_my_agency_id());
