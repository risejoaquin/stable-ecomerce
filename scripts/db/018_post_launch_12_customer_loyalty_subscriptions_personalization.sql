-- POST-LAUNCH 12 — Customer Account, Loyalty, Subscriptions & Personalization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  lifecycle_stage TEXT DEFAULT 'lead',
  status TEXT DEFAULT 'active',
  first_order_at TIMESTAMP WITH TIME ZONE,
  last_order_at TIMESTAMP WITH TIME ZONE,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  average_order_value NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  skin_type TEXT,
  skincare_goals JSONB DEFAULT '[]'::jsonb,
  product_preferences JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  privacy_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_profile_id)
);

CREATE TABLE IF NOT EXISTS customer_loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  points_balance INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'starter',
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_profile_id)
);

CREATE TABLE IF NOT EXISTS customer_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_wallet_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'coupon',
  title TEXT NOT NULL,
  code TEXT,
  value JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_rebuy_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  source_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  cadence_days INTEGER DEFAULT 30,
  next_reminder_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type TEXT DEFAULT 'personalized',
  score NUMERIC(6,2) DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  subscription_type TEXT DEFAULT 'rebuy_reminder',
  cadence_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active',
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_personalization_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_notification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  email TEXT,
  channel TEXT DEFAULT 'email',
  event_type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  status TEXT DEFAULT 'queued',
  sent_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_stage ON customer_profiles(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_email ON customer_loyalty_accounts(email);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_tx_profile_created ON customer_loyalty_transactions(customer_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_wallet_profile_status ON customer_wallet_items(customer_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_rebuy_profile_status ON customer_rebuy_lists(customer_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_recommendations_profile_score ON customer_recommendations(customer_profile_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_profile_status ON customer_subscriptions(customer_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_personalization_events_created ON customer_personalization_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notification_events_status_created ON customer_notification_events(status, created_at DESC);

INSERT INTO operational_events(store_id, event_type, severity, message, metadata)
SELECT id, 'post_launch_12_migration_applied', 'info', 'POST-LAUNCH 12 customer loyalty subscriptions personalization migration applied.', '{}'::jsonb
FROM stores WHERE slug = 'selfcare-sinners'
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
