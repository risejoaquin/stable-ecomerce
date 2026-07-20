-- Run this in your Supabase SQL Editor if you get errors when saving products with variants
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
