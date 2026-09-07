-- POST-LAUNCH 22 — Real User Testing, Conversion QA & Live Behavior Feedback Loop
-- Objective: validate real user behavior beyond smoke tests: friction, conversion, abandonment, feedback, mobile and checkout reality.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS real_user_test_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  run_key TEXT NOT NULL,
  cohort TEXT DEFAULT 'real_users',
  status TEXT DEFAULT 'running',
  total_users INTEGER DEFAULT 0,
  completed_users INTEGER DEFAULT 0,
  conversion_rate NUMERIC(6,2) DEFAULT 0,
  friction_score NUMERIC(6,2) DEFAULT 0,
  findings JSONB DEFAULT '[]'::jsonb,
  recommendation TEXT,
  started_by UUID,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, run_key)
);

CREATE TABLE IF NOT EXISTS real_user_feedback_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  feedback_key TEXT NOT NULL,
  channel TEXT DEFAULT 'manual',
  user_type TEXT DEFAULT 'customer',
  journey_step TEXT DEFAULT 'general',
  sentiment TEXT DEFAULT 'neutral',
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  score NUMERIC(6,2) DEFAULT 0,
  comment TEXT,
  recommendation TEXT,
  captured_by UUID,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, feedback_key)
);

CREATE TABLE IF NOT EXISTS conversion_qa_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  check_key TEXT NOT NULL,
  funnel_step TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  observed_issue TEXT,
  impact TEXT DEFAULT 'medium',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS live_behavior_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  journey_step TEXT DEFAULT 'general',
  device_type TEXT DEFAULT 'unknown',
  session_id TEXT,
  customer_email TEXT,
  status TEXT DEFAULT 'observed',
  value NUMERIC(12,2) DEFAULT 0,
  friction_detected BOOLEAN DEFAULT FALSE,
  details JSONB DEFAULT '{}'::jsonb,
  captured_by UUID,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_key)
);

CREATE TABLE IF NOT EXISTS abandonment_analysis_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  snapshot_key TEXT NOT NULL,
  funnel_step TEXT NOT NULL,
  abandoned_count INTEGER DEFAULT 0,
  recovered_count INTEGER DEFAULT 0,
  abandonment_rate NUMERIC(6,2) DEFAULT 0,
  top_reason TEXT,
  impact TEXT DEFAULT 'medium',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS mobile_real_device_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  validation_key TEXT NOT NULL,
  device_type TEXT DEFAULT 'mobile',
  viewport TEXT,
  browser TEXT,
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  validated_by UUID,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, validation_key)
);

CREATE TABLE IF NOT EXISTS checkout_real_flow_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  validation_key TEXT NOT NULL,
  checkout_step TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  friction TEXT,
  evidence TEXT,
  recommendation TEXT,
  validated_by UUID,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, validation_key)
);

CREATE TABLE IF NOT EXISTS friction_prioritization_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  priority_key TEXT NOT NULL,
  area TEXT NOT NULL,
  impact TEXT DEFAULT 'medium',
  effort TEXT DEFAULT 'medium',
  priority_score NUMERIC(6,2) DEFAULT 0,
  status TEXT DEFAULT 'open',
  issue TEXT,
  recommendation TEXT,
  owner TEXT,
  due_at TIMESTAMPTZ,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, priority_key)
);

CREATE TABLE IF NOT EXISTS user_session_replay_markers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  marker_key TEXT NOT NULL,
  session_id TEXT,
  journey_step TEXT DEFAULT 'general',
  marker_type TEXT DEFAULT 'friction',
  severity TEXT DEFAULT 'medium',
  description TEXT,
  recommendation TEXT,
  captured_by UUID,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, marker_key)
);

CREATE TABLE IF NOT EXISTS behavior_feedback_loop_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  action_key TEXT NOT NULL,
  source TEXT DEFAULT 'real_user_testing',
  area TEXT NOT NULL,
  status TEXT DEFAULT 'planned',
  priority TEXT DEFAULT 'medium',
  expected_impact TEXT,
  action TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, action_key)
);

CREATE INDEX IF NOT EXISTS idx_real_user_test_runs_store_created ON real_user_test_runs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_real_user_feedback_store_status ON real_user_feedback_items(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_qa_store_step ON conversion_qa_checks(store_id, funnel_step, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_behavior_store_step ON live_behavior_events(store_id, journey_step, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandonment_store_step ON abandonment_analysis_snapshots(store_id, funnel_step, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_real_device_store_status ON mobile_real_device_validations(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_real_flow_store_status ON checkout_real_flow_validations(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friction_prioritization_store_priority ON friction_prioritization_items(store_id, priority_score DESC, status);
CREATE INDEX IF NOT EXISTS idx_user_session_replay_markers_store_severity ON user_session_replay_markers(store_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_feedback_loop_store_priority ON behavior_feedback_loop_actions(store_id, priority, status, created_at DESC);

NOTIFY pgrst, 'reload schema';
