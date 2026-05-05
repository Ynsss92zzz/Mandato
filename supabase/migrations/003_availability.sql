-- Disponibilités natives Mandato (remplace Cal.com)
CREATE TABLE IF NOT EXISTS public.availability_settings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID        NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  days            INTEGER[]   NOT NULL DEFAULT ARRAY[1,2,3,4,5],  -- 0=dim 1=lun … 6=sam
  start_hour      INTEGER     NOT NULL DEFAULT 9,
  end_hour        INTEGER     NOT NULL DEFAULT 18,
  slot_duration   INTEGER     NOT NULL DEFAULT 60,  -- minutes
  advance_days    INTEGER     NOT NULL DEFAULT 30,
  timezone        TEXT        NOT NULL DEFAULT 'Europe/Paris',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.availability_settings ENABLE ROW LEVEL SECURITY;

-- Membres de l'agence peuvent lire/modifier
CREATE POLICY "Agency members manage availability"
  ON public.availability_settings
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_members WHERE profile_id = auth.uid()
    )
  );

-- Lecture publique pour la page de réservation
CREATE POLICY "Public read availability"
  ON public.availability_settings FOR SELECT
  TO anon
  USING (true);

-- Lecture publique des agences pour la page de réservation
CREATE POLICY "Public read agency name for booking"
  ON public.agencies FOR SELECT
  TO anon
  USING (true);
