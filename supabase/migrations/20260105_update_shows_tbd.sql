-- Add TBD flags and make timestamps nullable
ALTER TABLE shows ADD COLUMN IF NOT EXISTS date_tbd BOOLEAN DEFAULT TRUE;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS time_tbd BOOLEAN DEFAULT TRUE;

ALTER TABLE shows ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE shows ALTER COLUMN end_time DROP NOT NULL;

-- Backfill existing data
UPDATE shows 
SET 
  date_tbd = FALSE, 
  time_tbd = FALSE 
WHERE start_time IS NOT NULL;
