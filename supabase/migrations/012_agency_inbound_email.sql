-- Add inbound_email to agencies — the custom address an agent configures to receive lead emails
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS inbound_email text UNIQUE;
