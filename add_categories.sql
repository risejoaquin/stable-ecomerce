ALTER TABLE products ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
