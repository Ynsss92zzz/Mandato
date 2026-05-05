-- Ajout du type et des notes aux rendez-vous
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS type     TEXT NOT NULL DEFAULT 'client'
    CHECK (type IN ('client', 'personal')),
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IN ('reunion_interne', 'visite_terrain', 'formation', 'autre')),
  ADD COLUMN IF NOT EXISTS notes    TEXT;

-- lead_id devient nullable (les RDV personnels n'ont pas de lead associé)
ALTER TABLE public.appointments
  ALTER COLUMN lead_id DROP NOT NULL;

-- Index utile pour filtrer par type
CREATE INDEX IF NOT EXISTS appointments_type_idx ON public.appointments(agency_id, type);
