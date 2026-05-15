-- Add project_type column to leads (Achat / Vente / Location)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_type TEXT
  CHECK (project_type IN ('achat', 'vente', 'location'));
