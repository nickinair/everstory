-- Add category column to prompts table
-- Used to display a category tag on each prompt in the UI.
-- Defaults to '自定义' for manually-entered prompts.

ALTER TABLE prompts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '自定义';
