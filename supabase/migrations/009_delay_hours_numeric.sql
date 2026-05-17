-- Allow fractional delay_hours (e.g. 0.0833 for 5 min, 0.5 for 30 min)
ALTER TABLE sequence_steps
  ALTER COLUMN delay_hours TYPE numeric(10, 4) USING delay_hours::numeric(10, 4);
