-- Add new columns to bands table
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS origin_country text;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS spotify_url text;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS apple_music_url text;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS image_url text; -- ensuring it exists

-- Add unique constraint on name + origin_country (if country is null, this constraint allows duplicates of name? 
-- Postgres treats NULLs as distinct for unique constraints usually.
-- User said: "Key should be name and country of origin".
-- If I add a unique index, it helps upsert.
CREATE UNIQUE INDEX IF NOT EXISTS bands_name_country_idx ON public.bands (lower(name), origin_country);
