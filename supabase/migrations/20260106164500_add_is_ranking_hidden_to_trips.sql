-- Add is_ranking_hidden column to trips table
ALTER TABLE trips ADD COLUMN is_ranking_hidden BOOLEAN DEFAULT FALSE;
