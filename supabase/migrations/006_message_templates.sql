CREATE TABLE public.message_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  channel    TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  subject    TEXT,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage their templates"
ON public.message_templates
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

CREATE INDEX message_templates_agency_id_idx ON public.message_templates(agency_id);
