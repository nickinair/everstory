-- Migration: Add prompt_id to stories table to track fulfillment of prompts
ALTER TABLE stories ADD COLUMN prompt_id UUID REFERENCES prompts(id);
