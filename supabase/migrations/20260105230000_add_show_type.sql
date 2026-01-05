-- Create show_type enum
CREATE TYPE public.show_type AS ENUM ('normal', 'headliner');

-- Add type column to shows table
ALTER TABLE public.shows 
ADD COLUMN type public.show_type NOT NULL DEFAULT 'normal';
