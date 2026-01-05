-- Change interaction_type from enum to integer, mapping old values to new scale
-- 'meh' -> 1 (Thumbs Down)
-- 'like' -> 6 (Thumbs Up)
-- 'must_see' -> 10 (Heart)

ALTER TABLE public.show_interactions 
ALTER COLUMN interaction_type TYPE integer 
USING (
  CASE interaction_type 
    WHEN 'meh'::public.interaction_type THEN 1 
    WHEN 'like'::public.interaction_type THEN 6 
    WHEN 'must_see'::public.interaction_type THEN 10 
    ELSE 0 
  END
);

-- Drop the old enum type as it is no longer used
DROP TYPE public.interaction_type;
