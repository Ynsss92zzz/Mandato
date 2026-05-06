CREATE POLICY "Agency members can delete appointments"
ON public.appointments FOR DELETE
USING (
  agency_id IN (
    SELECT agency_id FROM public.agency_members WHERE profile_id = auth.uid()
  )
);
