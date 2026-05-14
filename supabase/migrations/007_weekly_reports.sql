-- Weekly reports table — stores one record per agency per week
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id          UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  week_start         DATE        NOT NULL,
  week_end           DATE        NOT NULL,
  new_leads          INTEGER     NOT NULL DEFAULT 0,
  total_leads        INTEGER     NOT NULL DEFAULT 0,
  won_leads          INTEGER     NOT NULL DEFAULT 0,
  conv_rate          INTEGER     NOT NULL DEFAULT 0,
  appointments_count INTEGER     NOT NULL DEFAULT 0,
  email_sent         BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, week_start)
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read their weekly reports"
  ON public.weekly_reports FOR SELECT
  USING (agency_id = get_my_agency_id());
