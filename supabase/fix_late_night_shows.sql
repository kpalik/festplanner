-- Fix late night shows that were saved with incorrect start_time (1 day too early).
--
-- Root cause: old save logic used `new Date(dateStr)` which parsed YYYY-MM-DD as UTC midnight,
-- then for late night shows did NOT add +1 day before setting hours, resulting in the show
-- being stored on the previous calendar day (e.g. intended 2026-06-10 00:30 local =
-- 2026-06-09 22:30 UTC, but was stored as 2026-06-09 22:30 UTC which is correct —
-- HOWEVER the selectedDate was set to the UTC date of start_time after subtracting 1 day,
-- causing a mismatch when the form re-saved it, shifting it back one more day).
--
-- Safe fix: shift start_time and end_time forward by 1 day for late night shows
-- where the stored date is clearly 1 day before the intended festival day.
-- We identify them by: is_late_night = true AND the date component of start_time (in UTC)
-- falls on a day BEFORE a festival day (i.e. the day before the festival starts or
-- any day that is 1 day before a valid festival day).
--
-- REVIEW BEFORE RUNNING: check the SELECT first, then run the UPDATE.

-- Step 1: Preview which shows will be affected
SELECT
    s.id,
    b.name AS band_name,
    s.start_time,
    s.end_time,
    s.is_late_night,
    f.name AS festival_name,
    f.start_date,
    f.end_date,
    -- What the corrected times would be
    s.start_time + interval '1 day' AS corrected_start,
    s.end_time + interval '1 day' AS corrected_end
FROM shows s
JOIN festivals f ON s.festival_id = f.id
JOIN bands b ON s.band_id = b.id
WHERE s.is_late_night = true
  AND (s.start_time::date) < f.start_date::date
  AND s.date_tbd = false
ORDER BY f.name, s.start_time;

-- Step 2: Apply the fix (uncomment and run after reviewing Step 1)
/*
UPDATE shows
SET
    start_time = start_time + interval '1 day',
    end_time = CASE WHEN end_time IS NOT NULL THEN end_time + interval '1 day' ELSE NULL END
WHERE is_late_night = true
  AND date_tbd = false
  AND (start_time::date) < (
      SELECT start_date::date FROM festivals WHERE id = festival_id
  );
*/
