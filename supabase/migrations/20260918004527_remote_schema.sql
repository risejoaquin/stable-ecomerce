SET local check_function_bodies = off;

CREATE EXTENSION "unaccent" SCHEMA "public";

CREATE SEQUENCE "public"."_dummy_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE "public"."_dummy" (
  "id" integer NOT NULL DEFAULT nextval('public._dummy_id_seq'::regclass),
  CONSTRAINT "_dummy_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."_dummy"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ab_experiment_definitions" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "experiment_key"  text                     NOT NULL,
  "experiment_name" text                     NOT NULL,
  "hypothesis"      text,
  "area"            text                     DEFAULT 'conversion'::text,
  "target_metric"   text                     DEFAULT 'conversion_rate'::text,
  "status"          text                     DEFAULT 'draft'::text,
  "priority"        integer                  DEFAULT 0,
  "start_at"        timestamp with time zone,
  "end_at"          timestamp with time zone,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "ab_experiment_definitions_pkey" PRIMARY KEY (id),
  CONSTRAINT "ab_experiment_definitions_store_id_experiment_key_key" UNIQUE (store_id, experiment_key)
);

ALTER TABLE "public"."ab_experiment_definitions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ab_experiment_variants" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "experiment_key"     text                     NOT NULL,
  "variant_key"        text                     NOT NULL,
  "variant_name"       text                     NOT NULL,
  "allocation_percent" numeric(5,2)             DEFAULT 50,
  "traffic_count"      integer                  DEFAULT 0,
  "conversion_count"   integer                  DEFAULT 0,
  "revenue_cents"      bigint                   DEFAULT 0,
  "status"             text                     DEFAULT 'active'::text,
  "recommendation"     text,
  "executed_by"        uuid,
  "executed_at"        timestamp with time zone DEFAULT now(),
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "ab_experiment_variants_pkey" PRIMARY KEY (id),
  CONSTRAINT "ab_experiment_variants_store_id_experiment_key_variant_key_key" UNIQUE (store_id, experiment_key, variant_key)
);

ALTER TABLE "public"."ab_experiment_variants"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ab_test_prioritization_items" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "priority_key"    text                     NOT NULL,
  "experiment_area" text                     NOT NULL,
  "effort_score"    integer                  NOT NULL DEFAULT 1,
  "impact_score"    integer                  NOT NULL DEFAULT 1,
  "priority_score"  integer                  NOT NULL DEFAULT 0,
  "status"          text                     NOT NULL DEFAULT 'prioritized'::text,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ab_test_prioritization_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "ab_test_prioritization_items_store_id_priority_key_key" UNIQUE (store_id, priority_key)
);

ALTER TABLE "public"."ab_test_prioritization_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ab_test_variants" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "test_id"     uuid                     NOT NULL,
  "variant_key" text                     NOT NULL,
  "name"        text                     NOT NULL,
  "weight"      numeric(5,2)             DEFAULT 50,
  "config"      jsonb                    DEFAULT '{}'::jsonb,
  "sort_order"  integer                  DEFAULT 100,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "ab_test_variants_pkey" PRIMARY KEY (id),
  CONSTRAINT "ab_test_variants_test_id_variant_key_key" UNIQUE (test_id, variant_key)
);

ALTER TABLE "public"."ab_test_variants"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ab_tests" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid                     NOT NULL,
  "experiment_key" text                     NOT NULL,
  "name"           text                     NOT NULL,
  "hypothesis"     text,
  "status"         text                     NOT NULL DEFAULT 'draft'::text,
  "target_path"    text                     DEFAULT '/'::text,
  "primary_metric" text                     DEFAULT 'checkout_started'::text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "starts_at"      timestamp with time zone,
  "ends_at"        timestamp with time zone,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "ab_tests_pkey" PRIMARY KEY (id),
  CONSTRAINT "ab_tests_store_id_experiment_key_key" UNIQUE (store_id, experiment_key)
);

ALTER TABLE "public"."ab_tests"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."abandoned_cart_recovery_events" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "abandoned_cart_id" uuid,
  "email"             text,
  "event_type"        text                     NOT NULL,
  "status"            text                     DEFAULT 'recorded'::text,
  "cart_total"        numeric(10,2),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "abandoned_cart_recovery_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "abandoned_cart_recovery_events_status_check"
    CHECK ((status = ANY (ARRAY['recorded'::text, 'queued'::text, 'sent'::text, 'recovered'::text, 'failed'::text, 'skipped'::text])))
);

ALTER TABLE "public"."abandoned_cart_recovery_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."abandoned_carts" (
  "id"                       uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"                  uuid,
  "email"                    text,
  "items"                    jsonb                    NOT NULL,
  "reminder_sent"            boolean                  DEFAULT false,
  "created_at"               timestamp with time zone DEFAULT now(),
  "updated_at"               timestamp with time zone DEFAULT now(),
  "reminder_sent_at"         timestamp with time zone,
  "recovery_lock_id"         text,
  "recovery_locked_until"    timestamp with time zone,
  "recovery_attempts"        integer                  NOT NULL DEFAULT 0,
  "recovery_last_attempt_at" timestamp with time zone,
  "recovery_last_error"      text,
  CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."abandoned_carts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."abandonment_analysis_snapshots" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "snapshot_key"     text                     NOT NULL,
  "funnel_step"      text                     NOT NULL,
  "abandoned_count"  integer                  DEFAULT 0,
  "recovered_count"  integer                  DEFAULT 0,
  "abandonment_rate" numeric(6,2)             DEFAULT 0,
  "top_reason"       text,
  "impact"           text                     DEFAULT 'medium'::text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "abandonment_analysis_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "abandonment_analysis_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."abandonment_analysis_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."abuse_detection_events" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "event_key"      text                     NOT NULL,
  "event_type"     text                     NOT NULL,
  "source"         text                     DEFAULT 'system'::text,
  "ip_address"     text,
  "user_id"        uuid,
  "customer_email" text,
  "risk_score"     integer                  DEFAULT 0,
  "severity"       text                     NOT NULL DEFAULT 'medium'::text,
  "status"         text                     NOT NULL DEFAULT 'open'::text,
  "detected_at"    timestamp with time zone DEFAULT now(),
  "resolved_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "abuse_detection_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."abuse_detection_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."accessibility_validation_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "validation_key" text                     NOT NULL,
  "category"       text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "accessibility_validation_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "accessibility_validation_items_store_id_validation_key_key" UNIQUE (store_id, validation_key)
);

ALTER TABLE "public"."accessibility_validation_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."accounting_adjustments" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "order_id"        uuid,
  "adjustment_type" text                     NOT NULL,
  "amount"          numeric(12,2)            NOT NULL DEFAULT 0,
  "reason"          text,
  "status"          text                     DEFAULT 'approved'::text,
  "created_by"      uuid,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "accounting_adjustments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."accounting_adjustments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ad_platform_events" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid                     NOT NULL,
  "session_id"   text,
  "platform"     text                     NOT NULL DEFAULT 'internal'::text,
  "event_name"   text                     NOT NULL,
  "event_id"     text                     NOT NULL,
  "order_id"     uuid,
  "product_id"   uuid,
  "value"        numeric(12,2)            DEFAULT 0,
  "currency"     text                     DEFAULT 'MXN'::text,
  "utm_source"   text,
  "utm_medium"   text,
  "utm_campaign" text,
  "status"       text                     DEFAULT 'captured'::text,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "ad_platform_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "ad_platform_events_store_id_event_id_key" UNIQUE (store_id, event_id)
);

ALTER TABLE "public"."ad_platform_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_action_trails" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "admin_user_id"     uuid,
  "action_key"        text                     NOT NULL,
  "action_name"       text                     NOT NULL,
  "module"            text                     NOT NULL DEFAULT 'admin'::text,
  "entity_type"       text,
  "entity_id"         text,
  "before_state"      jsonb                    DEFAULT '{}'::jsonb,
  "after_state"       jsonb                    DEFAULT '{}'::jsonb,
  "approval_required" boolean                  DEFAULT false,
  "approval_id"       uuid,
  "status"            text                     NOT NULL DEFAULT 'completed'::text,
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_action_trails_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_action_trails"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_assignments" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "assigned_to"  uuid,
  "assigned_by"  uuid,
  "entity_type"  text                     NOT NULL,
  "entity_id"    uuid,
  "task_type"    text                     NOT NULL DEFAULT 'follow_up'::text,
  "title"        text                     NOT NULL,
  "status"       text                     DEFAULT 'open'::text,
  "priority"     text                     DEFAULT 'normal'::text,
  "due_at"       timestamp with time zone,
  "completed_at" timestamp with time zone,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_assignments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_assignments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_bulk_action_runs" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "action_type"   text                     NOT NULL,
  "requested_by"  uuid,
  "status"        text                     DEFAULT 'queued'::text,
  "target_count"  integer                  DEFAULT 0,
  "success_count" integer                  DEFAULT 0,
  "failure_count" integer                  DEFAULT 0,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "started_at"    timestamp with time zone DEFAULT now(),
  "completed_at"  timestamp with time zone,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_bulk_action_runs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_bulk_action_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_dashboard_views" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"   uuid,
  "view_key"   text                     NOT NULL,
  "name"       text                     NOT NULL,
  "team"       text                     DEFAULT 'operations'::text,
  "layout"     jsonb                    DEFAULT '{}'::jsonb,
  "filters"    jsonb                    DEFAULT '{}'::jsonb,
  "is_default" boolean                  DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_dashboard_views_pkey" PRIMARY KEY (id),
  CONSTRAINT "admin_dashboard_views_store_id_view_key_key" UNIQUE (store_id, view_key)
);

ALTER TABLE "public"."admin_dashboard_views"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_endpoint_optimization_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "endpoint"       text                     NOT NULL,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_endpoint_optimization_checks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_endpoint_optimization_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_notifications" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "recipient_user_id" uuid,
  "notification_type" text                     NOT NULL DEFAULT 'internal'::text,
  "title"             text                     NOT NULL,
  "message"           text                     NOT NULL,
  "priority"          text                     DEFAULT 'normal'::text,
  "read_at"           timestamp with time zone,
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_notifications_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_permissions" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "permission_key" text                     NOT NULL,
  "module"         text                     NOT NULL,
  "action"         text                     NOT NULL,
  "description"    text,
  "is_active"      boolean                  DEFAULT true,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_permissions_permission_key_key" UNIQUE (permission_key),
  CONSTRAINT "admin_permissions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_role_permissions" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "role_id"       uuid,
  "permission_id" uuid,
  "granted_at"    timestamp with time zone DEFAULT now(),
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "admin_role_permissions_role_id_permission_id_key" UNIQUE (role_id, permission_id)
);

ALTER TABLE "public"."admin_role_permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_roles" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "role_key"    text                     NOT NULL,
  "name"        text                     NOT NULL,
  "description" text,
  "is_system"   boolean                  DEFAULT false,
  "is_active"   boolean                  DEFAULT true,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "admin_roles_store_id_role_key_key" UNIQUE (store_id, role_key)
);

ALTER TABLE "public"."admin_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_team_members" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "user_id"           uuid,
  "role_id"           uuid,
  "display_name"      text,
  "status"            text                     DEFAULT 'active'::text,
  "workload_capacity" integer                  DEFAULT 25,
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_team_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "admin_team_members_store_id_user_id_key" UNIQUE (store_id, user_id)
);

ALTER TABLE "public"."admin_team_members"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_ux_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "module"         text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_ux_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "admin_ux_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."admin_ux_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_work_queue_items" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "queue_id"    uuid,
  "entity_type" text                     NOT NULL,
  "entity_id"   uuid,
  "title"       text                     NOT NULL,
  "status"      text                     DEFAULT 'open'::text,
  "priority"    text                     DEFAULT 'normal'::text,
  "assigned_to" uuid,
  "due_at"      timestamp with time zone,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_work_queue_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_work_queue_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admin_work_queues" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "name"          text                     NOT NULL,
  "queue_type"    text                     NOT NULL DEFAULT 'operations'::text,
  "status"        text                     DEFAULT 'active'::text,
  "priority"      text                     DEFAULT 'normal'::text,
  "owner_role_id" uuid,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "admin_work_queues_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."admin_work_queues"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ads_api_sync_events" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "sync_key"      text                     NOT NULL,
  "platform"      text                     DEFAULT 'meta_ads'::text,
  "campaign_name" text,
  "status"        text                     DEFAULT 'queued'::text,
  "spend_cents"   bigint                   DEFAULT 0,
  "clicks"        integer                  DEFAULT 0,
  "conversions"   integer                  DEFAULT 0,
  "synced_at"     timestamp with time zone DEFAULT now(),
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "ads_api_sync_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "ads_api_sync_events_store_id_sync_key_key" UNIQUE (store_id, sync_key)
);

ALTER TABLE "public"."ads_api_sync_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."advanced_admin_audit_entries" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "actor_user_id" uuid,
  "action"        text                     NOT NULL,
  "entity_type"   text,
  "entity_id"     uuid,
  "ip_address"    text,
  "user_agent"    text,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "advanced_admin_audit_entries_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."advanced_admin_audit_entries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_assistant_messages" (
  "id"                      uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "session_id"              uuid,
  "store_id"                uuid,
  "role"                    text                     NOT NULL DEFAULT 'user'::text,
  "message"                 text                     NOT NULL,
  "response"                text,
  "detected_intent"         text                     DEFAULT 'unknown'::text,
  "intent_score"            numeric(10,4)            DEFAULT 0,
  "recommended_product_ids" uuid[]                   DEFAULT ARRAY[]::uuid[],
  "metadata"                jsonb                    DEFAULT '{}'::jsonb,
  "created_at"              timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_assistant_messages_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_assistant_messages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_assistant_sessions" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "user_id"          uuid,
  "customer_email"   text,
  "session_id"       text,
  "status"           text                     DEFAULT 'active'::text,
  "channel"          text                     DEFAULT 'web'::text,
  "intent"           text                     DEFAULT 'shopping_assistance'::text,
  "conversion_score" numeric(10,4)            DEFAULT 0,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "started_at"       timestamp with time zone DEFAULT now(),
  "last_message_at"  timestamp with time zone DEFAULT now(),
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_assistant_sessions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_assistant_sessions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_faq_entries" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"   uuid,
  "question"   text                     NOT NULL,
  "answer"     text                     NOT NULL,
  "topic"      text                     DEFAULT 'general'::text,
  "keywords"   text[]                   DEFAULT ARRAY[]::text[],
  "is_active"  boolean                  DEFAULT true,
  "sort_order" integer                  DEFAULT 0,
  "metadata"   jsonb                    DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_faq_entries_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_faq_entries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_faq_interactions" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "faq_entry_id" uuid,
  "query"        text,
  "matched"      boolean                  DEFAULT false,
  "helpful"      boolean,
  "source"       text                     DEFAULT 'web'::text,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_faq_interactions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_faq_interactions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_intent_scores" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"   uuid,
  "query"      text                     NOT NULL,
  "intent"     text                     NOT NULL DEFAULT 'unknown'::text,
  "score"      numeric(10,4)            DEFAULT 0,
  "signals"    jsonb                    DEFAULT '{}'::jsonb,
  "source"     text                     DEFAULT 'api'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_intent_scores_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_intent_scores"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_product_discovery_events" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "user_id"        uuid,
  "customer_email" text,
  "query"          text,
  "discovery_type" text                     DEFAULT 'guided'::text,
  "product_id"     uuid,
  "score"          numeric(10,4)            DEFAULT 0,
  "reason"         text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_product_discovery_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_product_discovery_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_recommendation_events" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "user_id"             uuid,
  "customer_email"      text,
  "query"               text,
  "product_id"          uuid,
  "recommendation_type" text                     DEFAULT 'smart_search'::text,
  "score"               numeric(10,4)            DEFAULT 0,
  "clicked"             boolean                  DEFAULT false,
  "converted"           boolean                  DEFAULT false,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_recommendation_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_recommendation_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_recommendation_rules" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "rule_key"           text                     NOT NULL,
  "name"               text                     NOT NULL,
  "description"        text,
  "trigger_terms"      text[]                   DEFAULT ARRAY[]::text[],
  "target_product_ids" uuid[]                   DEFAULT ARRAY[]::uuid[],
  "priority"           integer                  DEFAULT 0,
  "is_active"          boolean                  DEFAULT true,
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_recommendation_rules_pkey" PRIMARY KEY (id),
  CONSTRAINT "ai_recommendation_rules_store_id_rule_key_key" UNIQUE (store_id, rule_key)
);

ALTER TABLE "public"."ai_recommendation_rules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_search_insight_snapshots" (
  "id"                        uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                  uuid,
  "period"                    text                     DEFAULT to_char(now(), 'YYYY-MM'::text),
  "total_queries"             integer                  DEFAULT 0,
  "zero_result_queries"       integer                  DEFAULT 0,
  "assisted_sessions"         integer                  DEFAULT 0,
  "conversion_intent_queries" integer                  DEFAULT 0,
  "top_queries"               jsonb                    DEFAULT '[]'::jsonb,
  "top_intents"               jsonb                    DEFAULT '[]'::jsonb,
  "recommendations"           jsonb                    DEFAULT '[]'::jsonb,
  "generated_at"              timestamp with time zone DEFAULT now(),
  "created_at"                timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_search_insight_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "ai_search_insight_snapshots_store_id_period_key" UNIQUE (store_id, period)
);

ALTER TABLE "public"."ai_search_insight_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ai_search_queries" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "user_id"            uuid,
  "customer_email"     text,
  "session_id"         text,
  "query"              text                     NOT NULL,
  "normalized_query"   text,
  "intent"             text                     DEFAULT 'unknown'::text,
  "intent_score"       numeric(10,4)            DEFAULT 0,
  "result_count"       integer                  DEFAULT 0,
  "clicked_product_id" uuid,
  "converted"          boolean                  DEFAULT false,
  "source"             text                     DEFAULT 'web'::text,
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "ai_search_queries_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."ai_search_queries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."analytics_destination_events" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "event_key"       text                     NOT NULL,
  "destination"     text                     DEFAULT 'analytics'::text,
  "event_name"      text                     NOT NULL,
  "delivery_status" text                     DEFAULT 'sent'::text,
  "payload"         jsonb                    DEFAULT '{}'::jsonb,
  "delivered_at"    timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "analytics_destination_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "analytics_destination_events_store_id_event_key_key" UNIQUE (store_id, event_key)
);

ALTER TABLE "public"."analytics_destination_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."audit_logs" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "actor_user_id" uuid,
  "action"        text                     NOT NULL,
  "entity_type"   text                     NOT NULL,
  "entity_id"     text,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."audit_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."automation_executions" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "trigger_id"      uuid,
  "trigger_key"     text,
  "contact_id"      uuid,
  "journey_id"      uuid,
  "execution_type"  text                     NOT NULL DEFAULT 'manual_run'::text,
  "status"          text                     NOT NULL DEFAULT 'pending'::text,
  "target_count"    integer                  DEFAULT 0,
  "processed_count" integer                  DEFAULT 0,
  "success_count"   integer                  DEFAULT 0,
  "failed_count"    integer                  DEFAULT 0,
  "started_at"      timestamp with time zone DEFAULT now(),
  "finished_at"     timestamp with time zone,
  "executed_by"     uuid,
  "error_message"   text,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "automation_executions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."automation_executions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."automation_jobs" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "job_type"    text                     NOT NULL,
  "name"        text                     NOT NULL,
  "status"      text                     NOT NULL DEFAULT 'active'::text,
  "cadence"     text,
  "enabled"     boolean                  DEFAULT true,
  "config"      jsonb                    DEFAULT '{}'::jsonb,
  "last_run_at" timestamp with time zone,
  "next_run_at" timestamp with time zone,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "automation_jobs_pkey" PRIMARY KEY (id),
  CONSTRAINT "automation_jobs_store_id_job_type_key" UNIQUE (store_id, job_type)
);

ALTER TABLE "public"."automation_jobs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."automation_runs" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "job_id"        uuid,
  "job_type"      text                     NOT NULL,
  "status"        text                     NOT NULL DEFAULT 'completed'::text,
  "started_at"    timestamp with time zone DEFAULT now(),
  "completed_at"  timestamp with time zone,
  "result"        jsonb                    DEFAULT '{}'::jsonb,
  "error_message" text,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "automation_runs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."automation_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."automation_triggers" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "trigger_key"      text                     NOT NULL,
  "name"             text                     NOT NULL,
  "trigger_type"     text                     NOT NULL DEFAULT 'behavioral'::text,
  "event_name"       text                     NOT NULL,
  "status"           text                     NOT NULL DEFAULT 'draft'::text,
  "is_active"        boolean                  DEFAULT true,
  "conditions"       jsonb                    DEFAULT '{}'::jsonb,
  "actions"          jsonb                    DEFAULT '[]'::jsonb,
  "throttle_minutes" integer                  DEFAULT 0,
  "created_by"       uuid,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "automation_triggers_pkey" PRIMARY KEY (id),
  CONSTRAINT "automation_triggers_store_id_trigger_key_key" UNIQUE (store_id, trigger_key)
);

ALTER TABLE "public"."automation_triggers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."banner_card_button_form_standards" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "standard_key"   text                     NOT NULL,
  "element_type"   text                     DEFAULT 'component'::text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "standard"       text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "banner_card_button_form_standards_pkey" PRIMARY KEY (id),
  CONSTRAINT "banner_card_button_form_standards_store_id_standard_key_key" UNIQUE (store_id, standard_key)
);

ALTER TABLE "public"."banner_card_button_form_standards"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."behavior_feedback_loop_actions" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "action_key"      text                     NOT NULL,
  "source"          text                     DEFAULT 'real_user_testing'::text,
  "area"            text                     NOT NULL,
  "status"          text                     DEFAULT 'planned'::text,
  "priority"        text                     DEFAULT 'medium'::text,
  "expected_impact" text,
  "action"          text,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "behavior_feedback_loop_actions_pkey" PRIMARY KEY (id),
  CONSTRAINT "behavior_feedback_loop_actions_store_id_action_key_key" UNIQUE (store_id, action_key)
);

ALTER TABLE "public"."behavior_feedback_loop_actions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."board_investor_reporting_packets" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "packet_key"     text                     NOT NULL,
  "period"         text                     NOT NULL DEFAULT 'monthly'::text,
  "revenue_cents"  integer                  NOT NULL DEFAULT 0,
  "growth_rate"    numeric(10,4)            NOT NULL DEFAULT 0,
  "retention_rate" numeric(10,4)            NOT NULL DEFAULT 0,
  "summary"        text,
  "status"         text                     NOT NULL DEFAULT 'draft'::text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "board_investor_reporting_packets_pkey" PRIMARY KEY (id),
  CONSTRAINT "board_investor_reporting_packets_store_id_packet_key_key" UNIQUE (store_id, packet_key)
);

ALTER TABLE "public"."board_investor_reporting_packets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."brand_microcopy_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "microcopy_key"  text                     NOT NULL,
  "surface"        text                     DEFAULT 'storefront'::text,
  "tone"           text                     DEFAULT 'clear'::text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "copy"           text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "brand_microcopy_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "brand_microcopy_items_store_id_microcopy_key_key" UNIQUE (store_id, microcopy_key)
);

ALTER TABLE "public"."brand_microcopy_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."brand_readiness_reports" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "report_key"        text                     NOT NULL,
  "status"            text                     DEFAULT 'draft'::text,
  "score"             numeric(6,2)             DEFAULT 0,
  "executive_summary" text,
  "decision"          text,
  "risks"             jsonb                    DEFAULT '[]'::jsonb,
  "next_actions"      jsonb                    DEFAULT '[]'::jsonb,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "brand_readiness_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "brand_readiness_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."brand_readiness_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."business_command_center_reports" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "report_key"       text                     NOT NULL,
  "report_type"      text                     NOT NULL DEFAULT 'executive_command_center'::text,
  "revenue_cents"    integer                  NOT NULL DEFAULT 0,
  "orders_count"     integer                  NOT NULL DEFAULT 0,
  "conversion_rate"  numeric(10,4)            NOT NULL DEFAULT 0,
  "active_campaigns" integer                  NOT NULL DEFAULT 0,
  "alerts_count"     integer                  NOT NULL DEFAULT 0,
  "status"           text                     NOT NULL DEFAULT 'active'::text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "business_command_center_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "business_command_center_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."business_command_center_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."business_intelligence_insights" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "insight_key"      text                     NOT NULL,
  "insight_type"     text                     NOT NULL DEFAULT 'growth'::text,
  "severity"         text                     NOT NULL DEFAULT 'medium'::text,
  "confidence_score" integer                  NOT NULL DEFAULT 0,
  "status"           text                     NOT NULL DEFAULT 'active'::text,
  "insight"          text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "business_intelligence_insights_pkey" PRIMARY KEY (id),
  CONSTRAINT "business_intelligence_insights_store_id_insight_key_key" UNIQUE (store_id, insight_key)
);

ALTER TABLE "public"."business_intelligence_insights"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cac_roas_measurements" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "measurement_key"    text                     NOT NULL,
  "channel"            text                     NOT NULL DEFAULT 'paid_social'::text,
  "spend_cents"        integer                  NOT NULL DEFAULT 0,
  "acquired_customers" integer                  NOT NULL DEFAULT 0,
  "revenue_cents"      integer                  NOT NULL DEFAULT 0,
  "cac_cents"          integer                  DEFAULT 0,
  "roas"               numeric(10,2)            DEFAULT 0,
  "status"             text                     NOT NULL DEFAULT 'measured'::text,
  "recommendation"     text,
  "executed_by"        uuid,
  "executed_at"        timestamp with time zone DEFAULT now(),
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "cac_roas_measurements_pkey" PRIMARY KEY (id),
  CONSTRAINT "cac_roas_measurements_store_id_measurement_key_key" UNIQUE (store_id, measurement_key)
);

ALTER TABLE "public"."cac_roas_measurements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cache_metrics" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "metric_key"     text                     NOT NULL,
  "cache_area"     text                     NOT NULL,
  "hit_count"      integer                  DEFAULT 0,
  "miss_count"     integer                  DEFAULT 0,
  "hit_rate"       numeric(10,4)            DEFAULT 0,
  "ttl_seconds"    integer                  DEFAULT 0,
  "cache_status"   text                     DEFAULT 'unknown'::text,
  "recommendation" text,
  "analyzed_by"    uuid,
  "analyzed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "cache_metrics_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cache_metrics"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_adjustment_items" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "adjustment_key"  text                     NOT NULL,
  "campaign_area"   text                     NOT NULL DEFAULT 'creative'::text,
  "priority"        text                     NOT NULL DEFAULT 'medium'::text,
  "status"          text                     NOT NULL DEFAULT 'open'::text,
  "issue"           text                     NOT NULL DEFAULT 'Campaign optimization item'::text,
  "action"          text                     NOT NULL DEFAULT 'Review and optimize'::text,
  "expected_impact" text                     DEFAULT 'Improve conversion efficiency'::text,
  "score"           integer                  DEFAULT 0,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "campaign_adjustment_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "campaign_adjustment_items_store_id_adjustment_key_key" UNIQUE (store_id, adjustment_key)
);

ALTER TABLE "public"."campaign_adjustment_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_asset_readiness" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "asset_key"        text                     NOT NULL,
  "campaign_channel" text                     DEFAULT 'general'::text,
  "asset_type"       text                     DEFAULT 'asset'::text,
  "status"           text                     DEFAULT 'draft'::text,
  "score"            numeric(6,2)             DEFAULT 0,
  "requirement"      text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "campaign_asset_readiness_pkey" PRIMARY KEY (id),
  CONSTRAINT "campaign_asset_readiness_store_id_asset_key_key" UNIQUE (store_id, asset_key)
);

ALTER TABLE "public"."campaign_asset_readiness"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_attribution" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "campaign_id"        uuid,
  "order_id"           uuid,
  "session_id"         text,
  "email"              text,
  "utm_source"         text,
  "utm_medium"         text,
  "utm_campaign"       text,
  "attributed_revenue" numeric(12,2)            DEFAULT 0,
  "attribution_model"  text                     DEFAULT 'last_touch'::text,
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "campaign_attribution_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."campaign_attribution"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_followup_automations" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "automation_key"  text                     NOT NULL,
  "campaign_name"   text                     NOT NULL DEFAULT 'baseline_campaign'::text,
  "channel"         text                     NOT NULL DEFAULT 'paid_social'::text,
  "trigger_type"    text                     NOT NULL DEFAULT 'performance_threshold'::text,
  "status"          text                     NOT NULL DEFAULT 'active'::text,
  "last_checked_at" timestamp with time zone,
  "action_count"    integer                  NOT NULL DEFAULT 0,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_followup_automations_pkey" PRIMARY KEY (id),
  CONSTRAINT "campaign_followup_automations_store_id_automation_key_key" UNIQUE (store_id, automation_key)
);

ALTER TABLE "public"."campaign_followup_automations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_iteration_records" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "iteration_key"     text                     NOT NULL,
  "campaign_name"     text                     NOT NULL,
  "channel"           text                     NOT NULL DEFAULT 'mixed'::text,
  "action"            text                     NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'planned'::text,
  "spend_delta_cents" integer                  NOT NULL DEFAULT 0,
  "expected_impact"   text,
  "recommendation"    text,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_iteration_records_pkey" PRIMARY KEY (id),
  CONSTRAINT "campaign_iteration_records_store_id_iteration_key_key" UNIQUE (store_id, iteration_key)
);

ALTER TABLE "public"."campaign_iteration_records"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_landing_pages" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid                     NOT NULL,
  "campaign_id"       uuid,
  "slug"              text                     NOT NULL,
  "title"             text                     NOT NULL DEFAULT 'Campaign landing page'::text,
  "subtitle"          text,
  "hero_image_url"    text,
  "primary_cta"       text                     DEFAULT 'Comprar ahora'::text,
  "secondary_cta"     text,
  "status"            text                     NOT NULL DEFAULT 'draft'::text,
  "content"           jsonb                    DEFAULT '{}'::jsonb,
  "seo_title"         text,
  "seo_description"   text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  "landing_key"       text,
  "campaign_type"     text                     DEFAULT 'general'::text,
  "score"             numeric(6,2)             DEFAULT 0,
  "headline"          text,
  "value_proposition" text,
  "recommendation"    text,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT "campaign_landing_pages_pkey" PRIMARY KEY (id),
  CONSTRAINT "campaign_landing_pages_store_id_slug_key" UNIQUE (store_id, slug)
);

ALTER TABLE "public"."campaign_landing_pages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_orchestration_events" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "campaign_key"       text                     NOT NULL,
  "name"               text                     NOT NULL,
  "campaign_type"      text                     NOT NULL DEFAULT 'lifecycle_marketing'::text,
  "segment_key"        text,
  "channels"           jsonb                    DEFAULT '[]'::jsonb,
  "status"             text                     NOT NULL DEFAULT 'draft'::text,
  "scheduled_at"       timestamp with time zone,
  "started_at"         timestamp with time zone,
  "finished_at"        timestamp with time zone,
  "target_count"       integer                  DEFAULT 0,
  "sent_count"         integer                  DEFAULT 0,
  "opened_count"       integer                  DEFAULT 0,
  "clicked_count"      integer                  DEFAULT 0,
  "conversion_count"   integer                  DEFAULT 0,
  "revenue_attributed" numeric(12,2)            DEFAULT 0,
  "created_by"         uuid,
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "campaign_orchestration_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "campaign_orchestration_events_store_id_campaign_key_key" UNIQUE (store_id, campaign_key)
);

ALTER TABLE "public"."campaign_orchestration_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."campaign_page_readiness" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "readiness_key"  text                     NOT NULL,
  "channel"        text                     DEFAULT 'campaign'::text,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "requirement"    text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "campaign_page_readiness_pkey" PRIMARY KEY (id),
  CONSTRAINT "campaign_page_readiness_store_id_readiness_key_key" UNIQUE (store_id, readiness_key)
);

ALTER TABLE "public"."campaign_page_readiness"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."catalog_import_batches" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid                     NOT NULL,
  "file_name"    text,
  "status"       text                     NOT NULL DEFAULT 'uploaded'::text,
  "total_rows"   integer                  DEFAULT 0,
  "valid_rows"   integer                  DEFAULT 0,
  "invalid_rows" integer                  DEFAULT 0,
  "created_by"   uuid,
  "published_at" timestamp with time zone,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "catalog_import_batches_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."catalog_import_batches"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."catalog_import_rows" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "batch_id"          uuid                     NOT NULL,
  "row_number"        integer                  NOT NULL,
  "payload"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "validation_status" text                     NOT NULL DEFAULT 'pending'::text,
  "errors"            jsonb                    DEFAULT '[]'::jsonb,
  "product_id"        uuid,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "catalog_import_rows_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."catalog_import_rows"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."categories" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "name"        text                     NOT NULL,
  "slug"        text                     NOT NULL,
  "description" text,
  "image_url"   text,
  "sort_order"  integer                  DEFAULT 0,
  "is_active"   boolean                  DEFAULT true,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id),
  CONSTRAINT "categories_store_id_slug_key" UNIQUE (store_id, slug)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."category_collections" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid                     NOT NULL,
  "name"          text                     NOT NULL,
  "slug"          text                     NOT NULL,
  "description"   text,
  "image_url"     text,
  "sort_order"    integer                  DEFAULT 100,
  "is_visible"    boolean                  DEFAULT true,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  "hero_title"    text,
  "hero_subtitle" text,
  "cta_label"     text                     DEFAULT 'Comprar colección'::text,
  "cta_url"       text,
  CONSTRAINT "category_collections_pkey" PRIMARY KEY (id),
  CONSTRAINT "category_collections_store_id_slug_key" UNIQUE (store_id, slug)
);

ALTER TABLE "public"."category_collections"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cdp_segment_memberships" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "membership_key"  text                     NOT NULL,
  "cdp_profile_key" text,
  "segment_key"     text                     DEFAULT 'baseline_segment'::text,
  "segment_name"    text                     DEFAULT 'Baseline Segment'::text,
  "status"          text                     DEFAULT 'active'::text,
  "assigned_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "cdp_segment_memberships_pkey" PRIMARY KEY (id),
  CONSTRAINT "cdp_segment_memberships_store_id_membership_key_key" UNIQUE (store_id, membership_key)
);

ALTER TABLE "public"."cdp_segment_memberships"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."channel_behavior_analytics" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "analytics_key"    text                     NOT NULL,
  "channel"          text                     NOT NULL DEFAULT 'unknown'::text,
  "sessions"         integer                  NOT NULL DEFAULT 0,
  "engaged_sessions" integer                  NOT NULL DEFAULT 0,
  "conversion_rate"  numeric(10,4)            NOT NULL DEFAULT 0,
  "bounce_rate"      numeric(10,4)            NOT NULL DEFAULT 0,
  "revenue_cents"    integer                  NOT NULL DEFAULT 0,
  "status"           text                     NOT NULL DEFAULT 'observed'::text,
  "score"            integer                  NOT NULL DEFAULT 0,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "channel_behavior_analytics_pkey" PRIMARY KEY (id),
  CONSTRAINT "channel_behavior_analytics_store_id_analytics_key_key" UNIQUE (store_id, analytics_key)
);

ALTER TABLE "public"."channel_behavior_analytics"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."channel_campaign_comparison_reports" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "report_key"      text                     NOT NULL,
  "channel"         text                     NOT NULL DEFAULT 'direct'::text,
  "campaign_name"   text                     NOT NULL DEFAULT 'baseline'::text,
  "spend_cents"     integer                  NOT NULL DEFAULT 0,
  "revenue_cents"   integer                  NOT NULL DEFAULT 0,
  "roas"            numeric(10,4)            NOT NULL DEFAULT 0,
  "conversion_rate" numeric(10,4)            NOT NULL DEFAULT 0,
  "status"          text                     NOT NULL DEFAULT 'compared'::text,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "channel_campaign_comparison_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "channel_campaign_comparison_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."channel_campaign_comparison_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."channel_inventory_snapshots" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "channel_id"      uuid,
  "channel_key"     text                     NOT NULL,
  "product_id"      uuid,
  "sku"             text,
  "available_stock" integer                  DEFAULT 0,
  "reserved_stock"  integer                  DEFAULT 0,
  "external_stock"  integer                  DEFAULT 0,
  "sync_status"     text                     DEFAULT 'pending'::text,
  "synced_at"       timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "channel_inventory_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "channel_inventory_snapshots_store_id_channel_key_product_id_key" UNIQUE (store_id, channel_key, product_id)
);

ALTER TABLE "public"."channel_inventory_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."channel_performance_snapshots" (
  "id"                   uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"             uuid,
  "channel_id"           uuid,
  "channel_key"          text                     NOT NULL,
  "period"               text                     NOT NULL DEFAULT to_char(now(), 'YYYY-MM'::text),
  "gross_revenue"        numeric(10,2)            DEFAULT 0,
  "orders_count"         integer                  DEFAULT 0,
  "conversion_count"     integer                  DEFAULT 0,
  "feed_product_count"   integer                  DEFAULT 0,
  "synced_product_count" integer                  DEFAULT 0,
  "average_order_value"  numeric(10,2)            DEFAULT 0,
  "generated_at"         timestamp with time zone DEFAULT now(),
  "metadata"             jsonb                    DEFAULT '{}'::jsonb,
  "created_at"           timestamp with time zone DEFAULT now(),
  CONSTRAINT "channel_performance_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "channel_performance_snapshots_store_id_channel_key_period_key" UNIQUE (store_id, channel_key, period)
);

ALTER TABLE "public"."channel_performance_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."channel_pricing_rules" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "channel_id"       uuid,
  "channel_key"      text                     NOT NULL,
  "rule_key"         text                     NOT NULL,
  "name"             text                     NOT NULL,
  "adjustment_type"  text                     DEFAULT 'none'::text,
  "adjustment_value" numeric(10,2)            DEFAULT 0,
  "is_active"        boolean                  DEFAULT true,
  "starts_at"        timestamp with time zone,
  "ends_at"          timestamp with time zone,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "channel_pricing_rules_pkey" PRIMARY KEY (id),
  CONSTRAINT "channel_pricing_rules_store_id_channel_key_rule_key_key" UNIQUE (store_id, channel_key, rule_key)
);

ALTER TABLE "public"."channel_pricing_rules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."channel_product_feeds" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "channel_id"    uuid,
  "channel_key"   text                     NOT NULL,
  "feed_type"     text                     NOT NULL DEFAULT 'product_catalog'::text,
  "feed_url"      text,
  "status"        text                     NOT NULL DEFAULT 'pending'::text,
  "product_count" integer                  DEFAULT 0,
  "generated_at"  timestamp with time zone DEFAULT now(),
  "generated_by"  uuid,
  "payload"       jsonb                    DEFAULT '[]'::jsonb,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "channel_product_feeds_pkey" PRIMARY KEY (id),
  CONSTRAINT "channel_product_feeds_store_id_channel_key_feed_type_key" UNIQUE (store_id, channel_key, feed_type)
);

ALTER TABLE "public"."channel_product_feeds"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."channel_sync_events" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "channel_id"        uuid,
  "channel_key"       text                     NOT NULL,
  "sync_type"         text                     NOT NULL DEFAULT 'manual'::text,
  "status"            text                     NOT NULL DEFAULT 'completed'::text,
  "started_at"        timestamp with time zone DEFAULT now(),
  "finished_at"       timestamp with time zone,
  "records_processed" integer                  DEFAULT 0,
  "errors"            jsonb                    DEFAULT '[]'::jsonb,
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "channel_sync_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."channel_sync_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."checkout_live_monitoring_events" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "event_key"      text                     NOT NULL,
  "event_type"     text                     NOT NULL DEFAULT 'checkout_monitoring'::text,
  "checkout_step"  text                     NOT NULL DEFAULT 'payment'::text,
  "status"         text                     NOT NULL DEFAULT 'observed'::text,
  "severity"       text                     NOT NULL DEFAULT 'low'::text,
  "session_count"  integer                  DEFAULT 0,
  "failure_count"  integer                  DEFAULT 0,
  "impact_score"   integer                  DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "checkout_live_monitoring_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "checkout_live_monitoring_events_store_id_event_key_key" UNIQUE (store_id, event_key)
);

ALTER TABLE "public"."checkout_live_monitoring_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."checkout_optimization_events" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid                     NOT NULL,
  "session_id"      text,
  "event_type"      text                     NOT NULL,
  "friction_reason" text,
  "step"            text,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "checkout_optimization_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."checkout_optimization_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."checkout_real_flow_validations" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "validation_key" text                     NOT NULL,
  "checkout_step"  text                     NOT NULL,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "friction"       text,
  "evidence"       text,
  "recommendation" text,
  "validated_by"   uuid,
  "validated_at"   timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "checkout_real_flow_validations_pkey" PRIMARY KEY (id),
  CONSTRAINT "checkout_real_flow_validations_store_id_validation_key_key" UNIQUE (store_id, validation_key)
);

ALTER TABLE "public"."checkout_real_flow_validations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."checkout_ux_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "step"           text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "checkout_ux_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "checkout_ux_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."checkout_ux_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."commercial_bottleneck_reports" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "report_key"      text                     NOT NULL,
  "bottleneck_area" text                     NOT NULL,
  "severity"        text                     NOT NULL DEFAULT 'medium'::text,
  "impact_score"    integer                  NOT NULL DEFAULT 0,
  "root_cause"      text,
  "recommendation"  text,
  "status"          text                     NOT NULL DEFAULT 'open'::text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "commercial_bottleneck_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "commercial_bottleneck_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."commercial_bottleneck_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."commercial_campaigns" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid                     NOT NULL,
  "name"             text                     NOT NULL,
  "type"             text                     NOT NULL DEFAULT 'promotion'::text,
  "status"           text                     NOT NULL DEFAULT 'draft'::text,
  "starts_at"        timestamp with time zone,
  "ends_at"          timestamp with time zone,
  "budget"           numeric(10,2),
  "target_audience"  text,
  "channel"          text,
  "notes"            text,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  "lifecycle_stage"  text                     DEFAULT 'general'::text,
  "objective"        text,
  "audience_segment" text,
  "coupon_id"        uuid,
  "landing_url"      text,
  "email_subject"    text,
  "email_preview"    text,
  CONSTRAINT "commercial_campaigns_pkey" PRIMARY KEY (id),
  CONSTRAINT "commercial_campaigns_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text, 'archived'::text])))
);

ALTER TABLE "public"."commercial_campaigns"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."commercial_content_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "content_key"    text                     NOT NULL,
  "content_type"   text                     DEFAULT 'general'::text,
  "surface"        text                     DEFAULT 'storefront'::text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "title"          text,
  "copy"           text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "commercial_content_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "commercial_content_items_store_id_content_key_key" UNIQUE (store_id, content_key)
);

ALTER TABLE "public"."commercial_content_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."commercial_technical_alert_rules" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "rule_key"           text                     NOT NULL,
  "rule_name"          text                     NOT NULL DEFAULT 'Commercial technical alert rule'::text,
  "alert_category"     text                     NOT NULL DEFAULT 'commercial'::text,
  "metric_key"         text                     NOT NULL DEFAULT 'conversion_rate'::text,
  "threshold_operator" text                     NOT NULL DEFAULT 'below'::text,
  "threshold_value"    numeric(12,4)            NOT NULL DEFAULT 0,
  "severity"           text                     NOT NULL DEFAULT 'medium'::text,
  "enabled"            boolean                  NOT NULL DEFAULT true,
  "status"             text                     NOT NULL DEFAULT 'active'::text,
  "recommendation"     text,
  "executed_by"        uuid,
  "executed_at"        timestamp with time zone DEFAULT now(),
  "metadata"           jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "commercial_technical_alert_rules_pkey" PRIMARY KEY (id),
  CONSTRAINT "commercial_technical_alert_rules_store_id_rule_key_key" UNIQUE (store_id, rule_key)
);

ALTER TABLE "public"."commercial_technical_alert_rules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."complaints_returns_cases" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "case_key"       text                     NOT NULL,
  "customer_email" text,
  "order_id"       uuid,
  "case_type"      text                     NOT NULL DEFAULT 'complaint'::text,
  "severity"       text                     NOT NULL DEFAULT 'medium'::text,
  "status"         text                     NOT NULL DEFAULT 'open'::text,
  "resolution"     text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "complaints_returns_cases_pkey" PRIMARY KEY (id),
  CONSTRAINT "complaints_returns_cases_store_id_case_key_key" UNIQUE (store_id, case_key)
);

ALTER TABLE "public"."complaints_returns_cases"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."compliance_exports" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "export_key"   text                     NOT NULL,
  "export_type"  text                     NOT NULL DEFAULT 'audit'::text,
  "status"       text                     NOT NULL DEFAULT 'requested'::text,
  "requested_by" uuid,
  "file_url"     text,
  "date_from"    timestamp with time zone,
  "date_to"      timestamp with time zone,
  "filters"      jsonb                    DEFAULT '{}'::jsonb,
  "record_count" integer                  DEFAULT 0,
  "requested_at" timestamp with time zone DEFAULT now(),
  "completed_at" timestamp with time zone,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "compliance_exports_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."compliance_exports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."compliance_operations_snapshots" (
  "id"                         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                   uuid,
  "snapshot_key"               text                     NOT NULL,
  "status"                     text                     NOT NULL DEFAULT 'ready'::text,
  "audit_events_count"         integer                  DEFAULT 0,
  "admin_trails_count"         integer                  DEFAULT 0,
  "open_abuse_events"          integer                  DEFAULT 0,
  "pending_approvals"          integer                  DEFAULT 0,
  "pending_permission_reviews" integer                  DEFAULT 0,
  "pending_retention_jobs"     integer                  DEFAULT 0,
  "score"                      integer                  DEFAULT 0,
  "metadata"                   jsonb                    DEFAULT '{}'::jsonb,
  "generated_at"               timestamp with time zone DEFAULT now(),
  "created_at"                 timestamp with time zone DEFAULT now(),
  CONSTRAINT "compliance_operations_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "compliance_operations_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."compliance_operations_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."content_readiness_reports" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "report_key"        text                     NOT NULL,
  "status"            text                     DEFAULT 'draft'::text,
  "score"             numeric(6,2)             DEFAULT 0,
  "executive_summary" text,
  "decision"          text,
  "risks"             jsonb                    DEFAULT '[]'::jsonb,
  "next_actions"      jsonb                    DEFAULT '[]'::jsonb,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "content_readiness_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "content_readiness_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."content_readiness_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."continuous_improvement_reports" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "report_key"     text                     NOT NULL,
  "period"         text                     NOT NULL DEFAULT 'weekly'::text,
  "status"         text                     NOT NULL DEFAULT 'active'::text,
  "score"          integer                  NOT NULL DEFAULT 0,
  "summary"        text,
  "next_actions"   jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "continuous_improvement_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "continuous_improvement_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."continuous_improvement_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."controlled_marketing_launches" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "launch_key"         text                     NOT NULL,
  "name"               text                     NOT NULL DEFAULT 'Controlled marketing launch'::text,
  "channel"            text                     NOT NULL DEFAULT 'mixed'::text,
  "status"             text                     NOT NULL DEFAULT 'planned'::text,
  "budget_cents"       integer                  NOT NULL DEFAULT 0,
  "start_at"           timestamp with time zone,
  "end_at"             timestamp with time zone,
  "traffic_goal"       integer                  NOT NULL DEFAULT 0,
  "revenue_goal_cents" integer                  NOT NULL DEFAULT 0,
  "decision"           text                     DEFAULT 'pending'::text,
  "score"              integer                  DEFAULT 0,
  "recommendation"     text,
  "executed_by"        uuid,
  "executed_at"        timestamp with time zone DEFAULT now(),
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "controlled_marketing_launches_pkey" PRIMARY KEY (id),
  CONSTRAINT "controlled_marketing_launches_store_id_launch_key_key" UNIQUE (store_id, launch_key)
);

ALTER TABLE "public"."controlled_marketing_launches"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversion_events" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "session_id"   text,
  "user_id"      uuid,
  "email"        text,
  "event_type"   text                     NOT NULL,
  "product_id"   uuid,
  "order_id"     uuid,
  "campaign_id"  uuid,
  "value"        numeric(12,2)            DEFAULT 0,
  "currency"     text                     DEFAULT 'MXN'::text,
  "utm_source"   text,
  "utm_medium"   text,
  "utm_campaign" text,
  "source_path"  text,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "conversion_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."conversion_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversion_learning_results" (
  "id"                      uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                uuid,
  "learning_key"            text                     NOT NULL,
  "experiment_key"          text,
  "winning_variant"         text,
  "conversion_lift_percent" numeric(10,2)            DEFAULT 0,
  "confidence_score"        numeric(10,2)            DEFAULT 0,
  "revenue_impact_cents"    bigint                   DEFAULT 0,
  "status"                  text                     DEFAULT 'measured'::text,
  "insight"                 text,
  "recommendation"          text,
  "executed_by"             uuid,
  "executed_at"             timestamp with time zone DEFAULT now(),
  "metadata"                jsonb                    DEFAULT '{}'::jsonb,
  "created_at"              timestamp with time zone DEFAULT now(),
  "updated_at"              timestamp with time zone DEFAULT now(),
  CONSTRAINT "conversion_learning_results_pkey" PRIMARY KEY (id),
  CONSTRAINT "conversion_learning_results_store_id_learning_key_key" UNIQUE (store_id, learning_key)
);

ALTER TABLE "public"."conversion_learning_results"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversion_optimization_experiments" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "experiment_key"  text                     NOT NULL,
  "name"            text                     NOT NULL,
  "hypothesis"      text                     NOT NULL,
  "variant_a"       text,
  "variant_b"       text,
  "status"          text                     NOT NULL DEFAULT 'planned'::text,
  "priority"        text                     NOT NULL DEFAULT 'medium'::text,
  "expected_impact" text,
  "score"           integer                  NOT NULL DEFAULT 0,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "conversion_optimization_experiments_pkey" PRIMARY KEY (id),
  CONSTRAINT "conversion_optimization_experiments_store_id_experiment_key_key" UNIQUE (store_id, experiment_key)
);

ALTER TABLE "public"."conversion_optimization_experiments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversion_qa_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "funnel_step"    text                     NOT NULL,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "observed_issue" text,
  "impact"         text                     DEFAULT 'medium'::text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "conversion_qa_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "conversion_qa_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."conversion_qa_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversion_trust_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "area"           text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "conversion_trust_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "conversion_trust_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."conversion_trust_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cost_snapshots" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "snapshot_key"      text                     NOT NULL,
  "provider"          text                     NOT NULL DEFAULT 'railway_supabase'::text,
  "monthly_estimate"  numeric(10,2)            DEFAULT 0,
  "railway_estimate"  numeric(10,2)            DEFAULT 0,
  "supabase_estimate" numeric(10,2)            DEFAULT 0,
  "bandwidth_gb"      numeric(10,2)            DEFAULT 0,
  "storage_gb"        numeric(10,2)            DEFAULT 0,
  "request_count"     integer                  DEFAULT 0,
  "cost_status"       text                     DEFAULT 'unknown'::text,
  "recommendation"    text,
  "captured_by"       uuid,
  "captured_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "cost_snapshots_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cost_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."coupons" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "code"             text                     NOT NULL,
  "discount_type"    text                     NOT NULL,
  "discount_value"   numeric(10,2)            NOT NULL,
  "min_order_amount" numeric(10,2)            DEFAULT 0,
  "max_uses"         integer,
  "current_uses"     integer                  DEFAULT 0,
  "expires_at"       timestamp with time zone,
  "is_active"        boolean                  DEFAULT true,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "coupons_current_uses_check" CHECK ((current_uses >= 0)),
  CONSTRAINT "coupons_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))),
  CONSTRAINT "coupons_discount_value_check" CHECK ((discount_value >= (0)::numeric)),
  CONSTRAINT "coupons_max_uses_check" CHECK (((max_uses IS NULL) OR (max_uses > 0))),
  CONSTRAINT "coupons_min_order_amount_check" CHECK ((min_order_amount >= (0)::numeric)),
  CONSTRAINT "coupons_pkey" PRIMARY KEY (id),
  CONSTRAINT "coupons_store_id_code_key" UNIQUE (store_id, code)
);

ALTER TABLE "public"."coupons"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."crm_contacts" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "user_id"             uuid,
  "email"               text                     NOT NULL,
  "full_name"           text,
  "phone"               text,
  "lifecycle_stage"     text                     NOT NULL DEFAULT 'lead'::text,
  "marketing_status"    text                     NOT NULL DEFAULT 'subscribed'::text,
  "consent_email"       boolean                  DEFAULT true,
  "consent_sms"         boolean                  DEFAULT false,
  "consent_push"        boolean                  DEFAULT false,
  "total_orders"        integer                  DEFAULT 0,
  "lifetime_value"      numeric(12,2)            DEFAULT 0,
  "average_order_value" numeric(12,2)            DEFAULT 0,
  "last_order_at"       timestamp with time zone,
  "last_seen_at"        timestamp with time zone,
  "next_best_action"    text,
  "attributes"          jsonb                    DEFAULT '{}'::jsonb,
  "tags"                jsonb                    DEFAULT '[]'::jsonb,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "crm_contacts_pkey" PRIMARY KEY (id),
  CONSTRAINT "crm_contacts_store_id_email_key" UNIQUE (store_id, email)
);

ALTER TABLE "public"."crm_contacts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."crm_segments" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "segment_key"    text                     NOT NULL,
  "name"           text                     NOT NULL,
  "description"    text,
  "criteria"       jsonb                    DEFAULT '{}'::jsonb,
  "customer_count" integer                  DEFAULT 0,
  "is_active"      boolean                  DEFAULT true,
  "created_by"     uuid,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "crm_segments_pkey" PRIMARY KEY (id),
  CONSTRAINT "crm_segments_store_id_segment_key_key" UNIQUE (store_id, segment_key)
);

ALTER TABLE "public"."crm_segments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_data_platform_profiles" (
  "id"                   uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"             uuid,
  "cdp_profile_key"      text                     NOT NULL,
  "email"                text,
  "identity_status"      text                     DEFAULT 'anonymous_or_known'::text,
  "total_orders"         integer                  DEFAULT 0,
  "lifetime_value_cents" integer                  DEFAULT 0,
  "last_seen_at"         timestamp with time zone,
  "attributes"           jsonb                    DEFAULT '{}'::jsonb,
  "recommendation"       text,
  "executed_by"          uuid,
  "executed_at"          timestamp with time zone,
  "metadata"             jsonb                    DEFAULT '{}'::jsonb,
  "created_at"           timestamp with time zone DEFAULT now(),
  "updated_at"           timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_data_platform_profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "customer_data_platform_profiles_store_id_cdp_profile_key_key" UNIQUE (store_id, cdp_profile_key)
);

ALTER TABLE "public"."customer_data_platform_profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_journey_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "journey_key"    text                     NOT NULL,
  "step"           text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_journey_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "customer_journey_checks_store_id_journey_key_key" UNIQUE (store_id, journey_key)
);

ALTER TABLE "public"."customer_journey_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_loyalty_accounts" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_profile_id" uuid                     NOT NULL,
  "email"               text                     NOT NULL,
  "points_balance"      integer                  DEFAULT 0,
  "lifetime_points"     integer                  DEFAULT 0,
  "tier"                text                     DEFAULT 'starter'::text,
  "status"              text                     DEFAULT 'active'::text,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_loyalty_accounts_customer_profile_id_key" UNIQUE (customer_profile_id),
  CONSTRAINT "customer_loyalty_accounts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_loyalty_accounts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_loyalty_transactions" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_profile_id" uuid                     NOT NULL,
  "email"               text                     NOT NULL,
  "order_id"            uuid,
  "points_delta"        integer                  NOT NULL,
  "reason"              text                     NOT NULL,
  "source"              text                     DEFAULT 'system'::text,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_loyalty_transactions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_loyalty_transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_metrics" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "email"               text                     NOT NULL,
  "order_count"         integer                  DEFAULT 0,
  "paid_order_count"    integer                  DEFAULT 0,
  "total_spent"         numeric(12,2)            DEFAULT 0,
  "average_order_value" numeric(12,2)            DEFAULT 0,
  "first_order_at"      timestamp with time zone,
  "last_order_at"       timestamp with time zone,
  "repeat_purchase"     boolean                  DEFAULT false,
  "segment_slug"        text,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_metrics_pkey" PRIMARY KEY (id),
  CONSTRAINT "customer_metrics_store_id_email_key" UNIQUE (store_id, email)
);

ALTER TABLE "public"."customer_metrics"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_notification_events" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_profile_id" uuid,
  "email"               text,
  "channel"             text                     DEFAULT 'email'::text,
  "event_type"          text                     NOT NULL,
  "title"               text,
  "message"             text,
  "status"              text                     DEFAULT 'queued'::text,
  "sent_at"             timestamp with time zone,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_notification_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_notification_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_personalization_events" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_profile_id" uuid,
  "email"               text,
  "event_type"          text                     NOT NULL,
  "product_id"          uuid,
  "session_id"          text,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_personalization_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_personalization_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_preferences" (
  "id"                       uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "customer_profile_id"      uuid                     NOT NULL,
  "email"                    text                     NOT NULL,
  "skin_type"                text,
  "skincare_goals"           jsonb                    DEFAULT '[]'::jsonb,
  "product_preferences"      jsonb                    DEFAULT '{}'::jsonb,
  "notification_preferences" jsonb                    DEFAULT '{}'::jsonb,
  "privacy_preferences"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"               timestamp with time zone DEFAULT now(),
  "updated_at"               timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_preferences_customer_profile_id_key" UNIQUE (customer_profile_id),
  CONSTRAINT "customer_preferences_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_preferences"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_profiles" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "user_id"             uuid,
  "email"               text                     NOT NULL,
  "full_name"           text,
  "phone"               text,
  "lifecycle_stage"     text                     DEFAULT 'lead'::text,
  "status"              text                     DEFAULT 'active'::text,
  "first_order_at"      timestamp with time zone,
  "last_order_at"       timestamp with time zone,
  "total_orders"        integer                  DEFAULT 0,
  "total_spent"         numeric(12,2)            DEFAULT 0,
  "average_order_value" numeric(12,2)            DEFAULT 0,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_profiles_email_key" UNIQUE (email),
  CONSTRAINT "customer_profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_rebuy_lists" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_profile_id" uuid                     NOT NULL,
  "email"               text                     NOT NULL,
  "product_id"          uuid,
  "source_order_id"     uuid,
  "quantity"            integer                  DEFAULT 1,
  "cadence_days"        integer                  DEFAULT 30,
  "next_reminder_at"    timestamp with time zone,
  "status"              text                     DEFAULT 'active'::text,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_rebuy_lists_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_rebuy_lists"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_recommendations" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_profile_id" uuid                     NOT NULL,
  "email"               text                     NOT NULL,
  "product_id"          uuid,
  "recommendation_type" text                     DEFAULT 'personalized'::text,
  "score"               numeric(6,2)             DEFAULT 0,
  "reason"              text,
  "status"              text                     DEFAULT 'active'::text,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_recommendations_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_recommendations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_satisfaction_measurements" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "measurement_key" text                     NOT NULL,
  "channel"         text                     NOT NULL DEFAULT 'post_purchase'::text,
  "csat_score"      numeric(10,4)            NOT NULL DEFAULT 0,
  "nps_score"       integer                  NOT NULL DEFAULT 0,
  "response_count"  integer                  NOT NULL DEFAULT 0,
  "detractor_count" integer                  NOT NULL DEFAULT 0,
  "status"          text                     NOT NULL DEFAULT 'measured'::text,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "customer_satisfaction_measurements_pkey" PRIMARY KEY (id),
  CONSTRAINT "customer_satisfaction_measurements_store_id_measurement_key_key" UNIQUE (store_id, measurement_key)
);

ALTER TABLE "public"."customer_satisfaction_measurements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_segments" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "name"           text                     NOT NULL,
  "slug"           text                     NOT NULL,
  "description"    text,
  "criteria"       jsonb                    DEFAULT '{}'::jsonb,
  "status"         text                     NOT NULL DEFAULT 'active'::text,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  "segment_key"    text,
  "customer_count" integer                  DEFAULT 0,
  "is_active"      boolean                  DEFAULT true,
  "created_by"     uuid,
  CONSTRAINT "customer_segments_pkey" PRIMARY KEY (id),
  CONSTRAINT "customer_segments_store_id_slug_key" UNIQUE (store_id, slug)
);

ALTER TABLE "public"."customer_segments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_service_notes" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "customer_email" text,
  "order_id"       uuid,
  "actor_user_id"  uuid,
  "note"           text                     NOT NULL,
  "visibility"     text                     DEFAULT 'internal'::text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_service_notes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_service_notes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_subscriptions" (
  "id"                     uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"               uuid,
  "customer_profile_id"    uuid                     NOT NULL,
  "email"                  text                     NOT NULL,
  "product_id"             uuid,
  "subscription_type"      text                     DEFAULT 'rebuy_reminder'::text,
  "cadence_days"           integer                  DEFAULT 30,
  "status"                 text                     DEFAULT 'active'::text,
  "next_run_at"            timestamp with time zone,
  "last_run_at"            timestamp with time zone,
  "stripe_subscription_id" text,
  "metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "created_at"             timestamp with time zone DEFAULT now(),
  "updated_at"             timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_subscriptions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_subscriptions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_success_snapshots" (
  "id"                   uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"             uuid,
  "snapshot_key"         text                     NOT NULL,
  "status"               text                     NOT NULL DEFAULT 'monitoring'::text,
  "satisfaction_score"   integer                  NOT NULL DEFAULT 0,
  "open_support_cases"   integer                  NOT NULL DEFAULT 0,
  "repeat_purchase_rate" numeric(10,4)            NOT NULL DEFAULT 0,
  "retention_score"      integer                  NOT NULL DEFAULT 0,
  "recommendation"       text,
  "executed_by"          uuid,
  "executed_at"          timestamp with time zone DEFAULT now(),
  "metadata"             jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "customer_success_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "customer_success_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."customer_success_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_touchpoints" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "contact_id"       uuid,
  "customer_email"   text,
  "touchpoint_type"  text                     NOT NULL DEFAULT 'lifecycle'::text,
  "channel"          text                     NOT NULL DEFAULT 'email'::text,
  "direction"        text                     DEFAULT 'outbound'::text,
  "subject"          text,
  "message"          text,
  "status"           text                     DEFAULT 'logged'::text,
  "related_order_id" uuid,
  "journey_id"       uuid,
  "campaign_key"     text,
  "occurred_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_touchpoints_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_touchpoints"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."customer_wallet_items" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_profile_id" uuid                     NOT NULL,
  "email"               text                     NOT NULL,
  "item_type"           text                     NOT NULL DEFAULT 'coupon'::text,
  "title"               text                     NOT NULL,
  "code"                text,
  "value"               jsonb                    DEFAULT '{}'::jsonb,
  "status"              text                     DEFAULT 'active'::text,
  "expires_at"          timestamp with time zone,
  "redeemed_at"         timestamp with time zone,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "customer_wallet_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."customer_wallet_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."daily_commercial_health_checks" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "check_key"       text                     NOT NULL,
  "business_date"   date                     NOT NULL DEFAULT CURRENT_DATE,
  "revenue_cents"   integer                  NOT NULL DEFAULT 0,
  "orders_count"    integer                  NOT NULL DEFAULT 0,
  "conversion_rate" numeric(10,4)            NOT NULL DEFAULT 0,
  "cac_cents"       integer                  NOT NULL DEFAULT 0,
  "roas"            numeric(10,4)            NOT NULL DEFAULT 0,
  "score"           integer                  NOT NULL DEFAULT 0,
  "status"          text                     NOT NULL DEFAULT 'checked'::text,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "daily_commercial_health_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "daily_commercial_health_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."daily_commercial_health_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."daily_technical_health_checks" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "check_key"         text                     NOT NULL,
  "health_date"       date                     NOT NULL DEFAULT CURRENT_DATE,
  "uptime_score"      integer                  NOT NULL DEFAULT 0,
  "latency_p95_ms"    integer                  NOT NULL DEFAULT 0,
  "error_count"       integer                  NOT NULL DEFAULT 0,
  "diagnostics_score" integer                  NOT NULL DEFAULT 0,
  "score"             integer                  NOT NULL DEFAULT 0,
  "status"            text                     NOT NULL DEFAULT 'checked'::text,
  "recommendation"    text,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "daily_technical_health_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "daily_technical_health_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."daily_technical_health_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."data_retention_jobs" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "job_key"         text                     NOT NULL,
  "data_domain"     text                     NOT NULL,
  "retention_days"  integer                  NOT NULL DEFAULT 365,
  "status"          text                     NOT NULL DEFAULT 'pending'::text,
  "records_scanned" integer                  DEFAULT 0,
  "records_marked"  integer                  DEFAULT 0,
  "records_deleted" integer                  DEFAULT 0,
  "dry_run"         boolean                  DEFAULT true,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "data_retention_jobs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."data_retention_jobs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."design_system_tokens" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "token_key"      text                     NOT NULL,
  "token_type"     text                     DEFAULT 'generic'::text,
  "token_value"    text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "usage_guidance" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "design_system_tokens_pkey" PRIMARY KEY (id),
  CONSTRAINT "design_system_tokens_store_id_token_key_key" UNIQUE (store_id, token_key)
);

ALTER TABLE "public"."design_system_tokens"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."educational_content_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "education_key"  text                     NOT NULL,
  "topic"          text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "audience"       text                     DEFAULT 'customer'::text,
  "content_goal"   text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "educational_content_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "educational_content_items_store_id_education_key_key" UNIQUE (store_id, education_key)
);

ALTER TABLE "public"."educational_content_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_delivery_attempts" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "queue_id"            uuid,
  "request_id"          uuid,
  "dedupe_key"          text,
  "provider"            text                     NOT NULL DEFAULT 'resend'::text,
  "provider_message_id" text,
  "status"              text                     NOT NULL,
  "error_message"       text,
  "metadata"            jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "attempted_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "email_delivery_attempts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."email_delivery_attempts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_events" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "order_id"            uuid,
  "user_id"             uuid,
  "email"               text,
  "event_type"          text                     NOT NULL,
  "provider"            text                     DEFAULT 'resend'::text,
  "provider_message_id" text,
  "subject"             text,
  "status"              text                     DEFAULT 'sent'::text,
  "error_message"       text,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "dedupe_key"          text,
  "request_id"          text,
  "channel"             text                     NOT NULL DEFAULT 'email'::text,
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "email_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."email_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_provider_sync_events" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "sync_key"          text                     NOT NULL,
  "provider"          text                     DEFAULT 'resend'::text,
  "event_type"        text                     DEFAULT 'contact_sync'::text,
  "status"            text                     DEFAULT 'queued'::text,
  "records_processed" integer                  DEFAULT 0,
  "error_message"     text,
  "synced_at"         timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "email_provider_sync_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "email_provider_sync_events_store_id_sync_key_key" UNIQUE (store_id, sync_key)
);

ALTER TABLE "public"."email_provider_sync_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_queue" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "request_id"          uuid,
  "dedupe_key"          text                     NOT NULL,
  "status"              text                     NOT NULL DEFAULT 'queued'::text,
  "purpose"             text                     NOT NULL DEFAULT 'generic'::text,
  "recipient_email"     text                     NOT NULL,
  "subject"             text                     NOT NULL,
  "html_body"           text                     NOT NULL,
  "entity_type"         text,
  "entity_id"           text,
  "metadata"            jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "scheduled_for"       timestamp with time zone NOT NULL DEFAULT now(),
  "attempts"            integer                  NOT NULL DEFAULT 0,
  "max_attempts"        integer                  NOT NULL DEFAULT 3,
  "next_attempt_at"     timestamp with time zone DEFAULT now(),
  "locked_by"           text,
  "locked_until"        timestamp with time zone,
  "provider"            text                     NOT NULL DEFAULT 'resend'::text,
  "provider_message_id" text,
  "provider_status"     text,
  "sent_at"             timestamp with time zone,
  "last_error"          text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "email_queue_dedupe_key_key" UNIQUE (dedupe_key),
  CONSTRAINT "email_queue_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."email_queue"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_suppression_list" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "email"               text                     NOT NULL,
  "reason"              text                     NOT NULL,
  "provider"            text                     DEFAULT 'resend'::text,
  "provider_message_id" text,
  "metadata"            jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "suppressed_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "email_suppression_list_email_reason_key" UNIQUE (email, reason),
  CONSTRAINT "email_suppression_list_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."email_suppression_list"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_template_catalog" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "template_key"    text                     NOT NULL,
  "name"            text                     NOT NULL,
  "category"        text                     NOT NULL DEFAULT 'system'::text,
  "criticality"     text                     NOT NULL DEFAULT 'normal'::text,
  "default_subject" text                     NOT NULL,
  "description"     text,
  "is_active"       boolean                  NOT NULL DEFAULT true,
  "version"         integer                  NOT NULL DEFAULT 1,
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "email_template_catalog_pkey" PRIMARY KEY (id),
  CONSTRAINT "email_template_catalog_template_key_key" UNIQUE (template_key)
);

ALTER TABLE "public"."email_template_catalog"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."email_template_preview_events" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "template_key" text                     NOT NULL,
  "requested_by" uuid,
  "request_id"   text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "metadata"     jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "email_template_preview_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."email_template_preview_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."endpoint_performance_snapshots" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "endpoint"           text                     NOT NULL,
  "method"             text                     NOT NULL DEFAULT 'GET'::text,
  "p50_ms"             integer                  DEFAULT 0,
  "p95_ms"             integer                  DEFAULT 0,
  "p99_ms"             integer                  DEFAULT 0,
  "avg_ms"             integer                  DEFAULT 0,
  "request_count"      integer                  DEFAULT 0,
  "error_count"        integer                  DEFAULT 0,
  "error_rate"         numeric(10,4)            DEFAULT 0,
  "performance_status" text                     DEFAULT 'unknown'::text,
  "optimization_notes" text,
  "measured_at"        timestamp with time zone DEFAULT now(),
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "endpoint_performance_snapshots_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."endpoint_performance_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."enterprise_security_audit_events" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "actor_user_id" uuid,
  "event_type"    text                     NOT NULL,
  "severity"      text                     NOT NULL DEFAULT 'medium'::text,
  "area"          text                     NOT NULL DEFAULT 'enterprise_security'::text,
  "action"        text,
  "resource_type" text,
  "resource_id"   text,
  "ip_address"    text,
  "user_agent"    text,
  "status"        text                     NOT NULL DEFAULT 'recorded'::text,
  "risk_score"    integer                  DEFAULT 0,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "enterprise_security_audit_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."enterprise_security_audit_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."executive_decision_priorities" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "priority_key"     text                     NOT NULL,
  "area"             text                     NOT NULL DEFAULT 'growth'::text,
  "priority_level"   text                     NOT NULL DEFAULT 'medium'::text,
  "impact_score"     integer                  NOT NULL DEFAULT 0,
  "effort_score"     integer                  NOT NULL DEFAULT 0,
  "confidence_score" integer                  NOT NULL DEFAULT 0,
  "status"           text                     NOT NULL DEFAULT 'open'::text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "executive_decision_priorities_pkey" PRIMARY KEY (id),
  CONSTRAINT "executive_decision_priorities_store_id_priority_key_key" UNIQUE (store_id, priority_key)
);

ALTER TABLE "public"."executive_decision_priorities"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."executive_kpi_snapshots" (
  "id"                     uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"               uuid,
  "snapshot_key"           text                     NOT NULL,
  "period"                 text                     NOT NULL DEFAULT 'daily'::text,
  "revenue_cents"          integer                  NOT NULL DEFAULT 0,
  "conversion_rate"        numeric(10,4)            NOT NULL DEFAULT 0,
  "retention_rate"         numeric(10,4)            NOT NULL DEFAULT 0,
  "operations_score"       integer                  NOT NULL DEFAULT 0,
  "technical_health_score" integer                  NOT NULL DEFAULT 0,
  "status"                 text                     NOT NULL DEFAULT 'active'::text,
  "recommendation"         text,
  "executed_by"            uuid,
  "executed_at"            timestamp with time zone DEFAULT now(),
  "metadata"               jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "executive_kpi_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "executive_kpi_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."executive_kpi_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."executive_workflow_automations" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "workflow_key"      text                     NOT NULL,
  "workflow_name"     text                     NOT NULL DEFAULT 'Executive recurring workflow'::text,
  "cadence"           text                     NOT NULL DEFAULT 'weekly'::text,
  "owner_role"        text                     NOT NULL DEFAULT 'executive'::text,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "open_actions"      integer                  NOT NULL DEFAULT 0,
  "completed_actions" integer                  NOT NULL DEFAULT 0,
  "recommendation"    text,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "executive_workflow_automations_pkey" PRIMARY KEY (id),
  CONSTRAINT "executive_workflow_automations_store_id_workflow_key_key" UNIQUE (store_id, workflow_key)
);

ALTER TABLE "public"."executive_workflow_automations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."experiment_decision_records" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "decision_key"    text                     NOT NULL,
  "experiment_key"  text,
  "decision"        text                     DEFAULT 'continue'::text,
  "reason"          text,
  "expected_impact" text,
  "status"          text                     DEFAULT 'recorded'::text,
  "decided_by"      uuid,
  "decided_at"      timestamp with time zone DEFAULT now(),
  "recommendation"  text,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "experiment_decision_records_pkey" PRIMARY KEY (id),
  CONSTRAINT "experiment_decision_records_store_id_decision_key_key" UNIQUE (store_id, decision_key)
);

ALTER TABLE "public"."experiment_decision_records"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."external_integration_connections" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "connection_key" text                     NOT NULL,
  "provider"       text                     NOT NULL,
  "provider_type"  text                     NOT NULL,
  "status"         text                     DEFAULT 'configured'::text,
  "last_sync_at"   timestamp with time zone,
  "health_score"   numeric(10,2)            DEFAULT 100,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "external_integration_connections_pkey" PRIMARY KEY (id),
  CONSTRAINT "external_integration_connections_store_id_connection_key_key" UNIQUE (store_id, connection_key)
);

ALTER TABLE "public"."external_integration_connections"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."external_order_items" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "external_order_id"   uuid,
  "product_id"          uuid,
  "external_product_id" text,
  "sku"                 text,
  "name"                text                     NOT NULL DEFAULT 'External order item'::text,
  "quantity"            integer                  NOT NULL DEFAULT 1,
  "unit_price"          numeric(10,2)            DEFAULT 0,
  "total_price"         numeric(10,2)            DEFAULT 0,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "external_order_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."external_order_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."external_orders" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "channel_id"         uuid,
  "channel_key"        text                     NOT NULL,
  "external_order_id"  text                     NOT NULL,
  "order_number"       text,
  "status"             text                     DEFAULT 'imported'::text,
  "financial_status"   text                     DEFAULT 'pending'::text,
  "fulfillment_status" text                     DEFAULT 'unfulfilled'::text,
  "customer_email"     text,
  "total_amount"       numeric(10,2)            DEFAULT 0,
  "currency"           text                     DEFAULT 'MXN'::text,
  "ordered_at"         timestamp with time zone,
  "imported_at"        timestamp with time zone DEFAULT now(),
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "external_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "external_orders_store_id_channel_key_external_order_id_key" UNIQUE (store_id, channel_key, external_order_id)
);

ALTER TABLE "public"."external_orders"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."final_commercial_assessments" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "assessment_key" text                     NOT NULL,
  "area"           text                     NOT NULL DEFAULT 'commercial'::text,
  "status"         text                     NOT NULL DEFAULT 'pass'::text,
  "score"          integer                  DEFAULT 100,
  "finding"        text,
  "recommendation" text,
  "evidence"       jsonb                    DEFAULT '{}'::jsonb,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "final_commercial_assessments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."final_commercial_assessments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."final_scale_reports" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "report_key"        text                     NOT NULL,
  "title"             text                     NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'draft'::text,
  "executive_summary" text,
  "technical_score"   integer                  DEFAULT 0,
  "commercial_score"  integer                  DEFAULT 0,
  "scale_score"       integer                  DEFAULT 0,
  "readiness_level"   text                     DEFAULT 'in_progress'::text,
  "generated_by"      uuid,
  "generated_at"      timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "final_scale_reports_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."final_scale_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."final_technical_assessments" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "assessment_key" text                     NOT NULL,
  "area"           text                     NOT NULL DEFAULT 'technical'::text,
  "status"         text                     NOT NULL DEFAULT 'pass'::text,
  "score"          integer                  DEFAULT 100,
  "finding"        text,
  "recommendation" text,
  "evidence"       jsonb                    DEFAULT '{}'::jsonb,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "final_technical_assessments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."final_technical_assessments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."finance_daily_closes" (
  "id"                    uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"              uuid,
  "business_date"         date                     NOT NULL,
  "status"                text                     NOT NULL DEFAULT 'draft'::text,
  "order_count"           integer                  DEFAULT 0,
  "gross_sales"           numeric(12,2)            DEFAULT 0,
  "net_sales"             numeric(12,2)            DEFAULT 0,
  "refund_total"          numeric(12,2)            DEFAULT 0,
  "discount_total"        numeric(12,2)            DEFAULT 0,
  "tax_total"             numeric(12,2)            DEFAULT 0,
  "payment_fees_estimate" numeric(12,2)            DEFAULT 0,
  "cash_adjustments"      numeric(12,2)            DEFAULT 0,
  "exception_count"       integer                  DEFAULT 0,
  "closed_by"             uuid,
  "closed_at"             timestamp with time zone,
  "metadata"              jsonb                    DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone DEFAULT now(),
  "updated_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "finance_daily_closes_pkey" PRIMARY KEY (id),
  CONSTRAINT "finance_daily_closes_store_id_business_date_key" UNIQUE (store_id, business_date)
);

ALTER TABLE "public"."finance_daily_closes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."finance_exports" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "export_type"  text                     NOT NULL,
  "status"       text                     NOT NULL DEFAULT 'generated'::text,
  "file_name"    text,
  "row_count"    integer                  DEFAULT 0,
  "generated_by" uuid,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "finance_exports_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."finance_exports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."finance_reconciliation_items" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "run_id"          uuid,
  "store_id"        uuid,
  "order_id"        uuid,
  "stripe_event_id" text,
  "issue_type"      text                     NOT NULL,
  "severity"        text                     DEFAULT 'medium'::text,
  "status"          text                     DEFAULT 'open'::text,
  "message"         text,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "resolved_at"     timestamp with time zone,
  CONSTRAINT "finance_reconciliation_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."finance_reconciliation_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."finance_reconciliation_runs" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "status"          text                     NOT NULL DEFAULT 'running'::text,
  "checked_orders"  integer                  DEFAULT 0,
  "exception_count" integer                  DEFAULT 0,
  "started_at"      timestamp with time zone DEFAULT now(),
  "completed_at"    timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT "finance_reconciliation_runs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."finance_reconciliation_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."financial_forecast_snapshots" (
  "id"                      uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                uuid,
  "forecast_key"            text                     NOT NULL,
  "forecast_period"         text                     DEFAULT 'monthly'::text,
  "projected_revenue_cents" bigint                   DEFAULT 0,
  "projected_cost_cents"    bigint                   DEFAULT 0,
  "projected_margin_cents"  bigint                   DEFAULT 0,
  "confidence_score"        numeric(10,2)            DEFAULT 0,
  "status"                  text                     DEFAULT 'generated'::text,
  "recommendation"          text,
  "executed_by"             uuid,
  "executed_at"             timestamp with time zone DEFAULT now(),
  "metadata"                jsonb                    DEFAULT '{}'::jsonb,
  "created_at"              timestamp with time zone DEFAULT now(),
  "updated_at"              timestamp with time zone DEFAULT now(),
  CONSTRAINT "financial_forecast_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "financial_forecast_snapshots_store_id_forecast_key_key" UNIQUE (store_id, forecast_key)
);

ALTER TABLE "public"."financial_forecast_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."friction_prioritization_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "priority_key"   text                     NOT NULL,
  "area"           text                     NOT NULL,
  "impact"         text                     DEFAULT 'medium'::text,
  "effort"         text                     DEFAULT 'medium'::text,
  "priority_score" numeric(6,2)             DEFAULT 0,
  "status"         text                     DEFAULT 'open'::text,
  "issue"          text,
  "recommendation" text,
  "owner"          text,
  "due_at"         timestamp with time zone,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "friction_prioritization_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "friction_prioritization_items_store_id_priority_key_key" UNIQUE (store_id, priority_key)
);

ALTER TABLE "public"."friction_prioritization_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."frontend_polish_tasks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "task_key"       text                     NOT NULL,
  "area"           text                     NOT NULL,
  "priority"       text                     DEFAULT 'medium'::text,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "recommendation" text,
  "completed_by"   uuid,
  "completed_at"   timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "frontend_polish_tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "frontend_polish_tasks_store_id_task_key_key" UNIQUE (store_id, task_key)
);

ALTER TABLE "public"."frontend_polish_tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."fulfillment_batches" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "batch_number" text,
  "status"       text                     DEFAULT 'open'::text,
  "carrier"      text,
  "created_by"   uuid,
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "fulfillment_batches_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."fulfillment_batches"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."fulfillment_queue" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "order_id"    uuid,
  "batch_id"    uuid,
  "status"      text                     DEFAULT 'ready'::text,
  "priority"    integer                  DEFAULT 100,
  "due_at"      timestamp with time zone,
  "assigned_to" uuid,
  "notes"       text,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "fulfillment_queue_order_id_key" UNIQUE (order_id),
  CONSTRAINT "fulfillment_queue_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."fulfillment_queue"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."full_funnel_analytics_snapshots" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "snapshot_key"    text                     NOT NULL,
  "visitors"        integer                  NOT NULL DEFAULT 0,
  "product_views"   integer                  NOT NULL DEFAULT 0,
  "add_to_carts"    integer                  NOT NULL DEFAULT 0,
  "checkouts"       integer                  NOT NULL DEFAULT 0,
  "purchases"       integer                  NOT NULL DEFAULT 0,
  "conversion_rate" numeric(10,4)            NOT NULL DEFAULT 0,
  "status"          text                     NOT NULL DEFAULT 'measured'::text,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "full_funnel_analytics_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "full_funnel_analytics_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."full_funnel_analytics_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."growth_iteration_loop_actions" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "action_key"     text                     NOT NULL,
  "area"           text                     NOT NULL,
  "action"         text                     NOT NULL,
  "priority"       text                     NOT NULL DEFAULT 'medium'::text,
  "status"         text                     NOT NULL DEFAULT 'open'::text,
  "owner"          text,
  "due_at"         timestamp with time zone,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "growth_iteration_loop_actions_pkey" PRIMARY KEY (id),
  CONSTRAINT "growth_iteration_loop_actions_store_id_action_key_key" UNIQUE (store_id, action_key)
);

ALTER TABLE "public"."growth_iteration_loop_actions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."internationalization_locales" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "locale_key"      text                     NOT NULL,
  "locale_name"     text                     NOT NULL DEFAULT 'Spanish Mexico'::text,
  "language_code"   text                     NOT NULL DEFAULT 'es'::text,
  "region_code"     text                     NOT NULL DEFAULT 'MX'::text,
  "is_default"      boolean                  DEFAULT false,
  "is_active"       boolean                  DEFAULT true,
  "readiness_score" integer                  DEFAULT 0,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "internationalization_locales_pkey" PRIMARY KEY (id),
  CONSTRAINT "internationalization_locales_store_id_locale_key_key" UNIQUE (store_id, locale_key)
);

ALTER TABLE "public"."internationalization_locales"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inventory_demand_forecasts" (
  "id"                     uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"               uuid,
  "forecast_key"           text                     NOT NULL,
  "product_sku"            text,
  "demand_period"          text                     DEFAULT 'monthly'::text,
  "projected_units"        integer                  DEFAULT 0,
  "reorder_recommendation" text,
  "stockout_risk_score"    numeric(10,2)            DEFAULT 0,
  "status"                 text                     DEFAULT 'generated'::text,
  "recommendation"         text,
  "executed_by"            uuid,
  "executed_at"            timestamp with time zone DEFAULT now(),
  "metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "created_at"             timestamp with time zone DEFAULT now(),
  "updated_at"             timestamp with time zone DEFAULT now(),
  CONSTRAINT "inventory_demand_forecasts_pkey" PRIMARY KEY (id),
  CONSTRAINT "inventory_demand_forecasts_store_id_forecast_key_key" UNIQUE (store_id, forecast_key)
);

ALTER TABLE "public"."inventory_demand_forecasts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inventory_movements" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "product_id"     uuid,
  "order_id"       uuid,
  "quantity_delta" integer                  NOT NULL,
  "reason"         text                     NOT NULL,
  "notes"          text,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY (id),
  CONSTRAINT "inventory_movements_reason_check" CHECK ((reason = ANY (ARRAY['sale'::text, 'refund'::text, 'manual_adjustment'::text, 'restock'::text, 'correction'::text])))
);

ALTER TABLE "public"."inventory_movements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inventory_planning_snapshots" (
  "id"                      uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                uuid,
  "product_id"              uuid,
  "supplier_id"             uuid,
  "sku"                     text,
  "product_name"            text,
  "current_stock"           integer                  DEFAULT 0,
  "reorder_point"           integer                  DEFAULT 5,
  "reorder_quantity"        integer                  DEFAULT 10,
  "average_daily_sales"     numeric(12,4)            DEFAULT 0,
  "days_of_supply"          numeric(12,2),
  "lead_time_days"          integer                  DEFAULT 7,
  "projected_stockout_date" date,
  "planning_status"         text                     DEFAULT 'monitor'::text,
  "metadata"                jsonb                    DEFAULT '{}'::jsonb,
  "created_at"              timestamp with time zone DEFAULT now(),
  CONSTRAINT "inventory_planning_snapshots_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."inventory_planning_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."investment_scaling_decisions" (
  "id"                       uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                 uuid,
  "decision_key"             text                     NOT NULL,
  "decision"                 text                     NOT NULL DEFAULT 'hold'::text,
  "confidence"               text                     NOT NULL DEFAULT 'medium'::text,
  "reason"                   text                     NOT NULL DEFAULT 'Await controlled marketing validation'::text,
  "recommended_budget_cents" integer                  DEFAULT 0,
  "guardrails"               jsonb                    DEFAULT '[]'::jsonb,
  "status"                   text                     NOT NULL DEFAULT 'draft'::text,
  "score"                    integer                  DEFAULT 0,
  "executed_by"              uuid,
  "executed_at"              timestamp with time zone DEFAULT now(),
  "metadata"                 jsonb                    DEFAULT '{}'::jsonb,
  "created_at"               timestamp with time zone DEFAULT now(),
  "updated_at"               timestamp with time zone DEFAULT now(),
  CONSTRAINT "investment_scaling_decisions_pkey" PRIMARY KEY (id),
  CONSTRAINT "investment_scaling_decisions_store_id_decision_key_key" UNIQUE (store_id, decision_key)
);

ALTER TABLE "public"."investment_scaling_decisions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."investor_readiness_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "category"       text                     NOT NULL DEFAULT 'investor_readiness'::text,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "requirement"    text,
  "evidence"       text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "investor_readiness_checks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."investor_readiness_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."journey_steps" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "journey_id"    uuid                     NOT NULL,
  "step_key"      text                     NOT NULL,
  "step_order"    integer                  NOT NULL DEFAULT 0,
  "name"          text,
  "channel"       text                     NOT NULL DEFAULT 'email'::text,
  "action_type"   text                     NOT NULL DEFAULT 'send_message'::text,
  "delay_minutes" integer                  DEFAULT 0,
  "template_key"  text,
  "conditions"    jsonb                    DEFAULT '{}'::jsonb,
  "payload"       jsonb                    DEFAULT '{}'::jsonb,
  "is_active"     boolean                  DEFAULT true,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "journey_steps_journey_id_step_key_key" UNIQUE (journey_id, step_key),
  CONSTRAINT "journey_steps_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."journey_steps"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."landing_page_conversion_checks" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "check_key"       text                     NOT NULL,
  "landing_slug"    text                     NOT NULL DEFAULT 'homepage'::text,
  "source_channel"  text                     NOT NULL DEFAULT 'paid'::text,
  "visits"          integer                  NOT NULL DEFAULT 0,
  "add_to_carts"    integer                  NOT NULL DEFAULT 0,
  "checkouts"       integer                  NOT NULL DEFAULT 0,
  "purchases"       integer                  NOT NULL DEFAULT 0,
  "conversion_rate" numeric(10,2)            DEFAULT 0,
  "status"          text                     NOT NULL DEFAULT 'baseline'::text,
  "score"           integer                  DEFAULT 0,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone DEFAULT now(),
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "landing_page_conversion_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "landing_page_conversion_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."landing_page_conversion_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."landing_sections" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid                     NOT NULL,
  "section_key" text                     NOT NULL,
  "title"       text,
  "subtitle"    text,
  "body"        text,
  "image_url"   text,
  "cta_label"   text,
  "cta_url"     text,
  "sort_order"  integer                  DEFAULT 100,
  "is_visible"  boolean                  DEFAULT true,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "landing_sections_pkey" PRIMARY KEY (id),
  CONSTRAINT "landing_sections_store_id_section_key_key" UNIQUE (store_id, section_key)
);

ALTER TABLE "public"."landing_sections"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."lifecycle_events" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "user_id"         uuid,
  "order_id"        uuid,
  "email"           text,
  "event_type"      text                     NOT NULL,
  "lifecycle_stage" text                     DEFAULT 'general'::text,
  "channel"         text                     DEFAULT 'email'::text,
  "status"          text                     DEFAULT 'planned'::text,
  "scheduled_for"   timestamp with time zone,
  "completed_at"    timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "lifecycle_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "lifecycle_events_status_check" CHECK ((status = ANY (ARRAY['planned'::text, 'queued'::text, 'sent'::text, 'skipped'::text, 'failed'::text, 'completed'::text])))
);

ALTER TABLE "public"."lifecycle_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."lifecycle_journeys" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "journey_key"    text                     NOT NULL,
  "name"           text                     NOT NULL,
  "description"    text,
  "journey_type"   text                     NOT NULL DEFAULT 'lifecycle'::text,
  "status"         text                     NOT NULL DEFAULT 'draft'::text,
  "is_active"      boolean                  DEFAULT false,
  "entry_criteria" jsonb                    DEFAULT '{}'::jsonb,
  "exit_criteria"  jsonb                    DEFAULT '{}'::jsonb,
  "created_by"     uuid,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "lifecycle_journeys_pkey" PRIMARY KEY (id),
  CONSTRAINT "lifecycle_journeys_store_id_journey_key_key" UNIQUE (store_id, journey_key)
);

ALTER TABLE "public"."lifecycle_journeys"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."live_behavior_events" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "event_key"         text                     NOT NULL,
  "event_type"        text                     NOT NULL,
  "journey_step"      text                     DEFAULT 'general'::text,
  "device_type"       text                     DEFAULT 'unknown'::text,
  "session_id"        text,
  "customer_email"    text,
  "status"            text                     DEFAULT 'observed'::text,
  "value"             numeric(12,2)            DEFAULT 0,
  "friction_detected" boolean                  DEFAULT false,
  "details"           jsonb                    DEFAULT '{}'::jsonb,
  "captured_by"       uuid,
  "captured_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "live_behavior_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "live_behavior_events_store_id_event_key_key" UNIQUE (store_id, event_key)
);

ALTER TABLE "public"."live_behavior_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."live_operations_snapshots" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "snapshot_key"     text                     NOT NULL,
  "status"           text                     NOT NULL DEFAULT 'monitoring'::text,
  "real_sales_count" integer                  NOT NULL DEFAULT 0,
  "conversion_rate"  numeric(10,4)            NOT NULL DEFAULT 0,
  "revenue_cents"    integer                  NOT NULL DEFAULT 0,
  "active_issues"    integer                  NOT NULL DEFAULT 0,
  "score"            integer                  NOT NULL DEFAULT 0,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "live_operations_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "live_operations_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."live_operations_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."load_test_scenarios" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "scenario_key"     text                     NOT NULL,
  "name"             text                     NOT NULL,
  "description"      text,
  "target_endpoints" jsonb                    DEFAULT '[]'::jsonb,
  "concurrent_users" integer                  DEFAULT 1,
  "duration_seconds" integer                  DEFAULT 30,
  "status"           text                     DEFAULT 'active'::text,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "load_test_scenarios_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."load_test_scenarios"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."localized_content_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "content_key"    text                     NOT NULL,
  "locale_key"     text                     NOT NULL DEFAULT 'es-MX'::text,
  "content_type"   text                     DEFAULT 'page_copy'::text,
  "source_text"    text,
  "localized_text" text,
  "status"         text                     DEFAULT 'draft'::text,
  "quality_score"  integer                  DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "localized_content_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "localized_content_items_store_id_content_key_locale_key_key" UNIQUE (store_id, content_key, locale_key)
);

ALTER TABLE "public"."localized_content_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."maintenance_mode_controls" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "control_key"    text                     NOT NULL,
  "control_name"   text                     DEFAULT 'Maintenance mode control'::text,
  "is_enabled"     boolean                  DEFAULT false,
  "mode_type"      text                     DEFAULT 'soft_maintenance'::text,
  "status"         text                     DEFAULT 'ready'::text,
  "message"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "maintenance_mode_controls_pkey" PRIMARY KEY (id),
  CONSTRAINT "maintenance_mode_controls_store_id_control_key_key" UNIQUE (store_id, control_key)
);

ALTER TABLE "public"."maintenance_mode_controls"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."marketing_events" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "session_id"  text,
  "user_id"     uuid,
  "event_type"  text                     NOT NULL,
  "product_id"  uuid,
  "campaign_id" uuid,
  "order_id"    uuid,
  "source"      text                     DEFAULT 'storefront'::text,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "marketing_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."marketing_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."marketing_launch_readiness_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "area"           text                     NOT NULL DEFAULT 'launch_readiness'::text,
  "status"         text                     NOT NULL DEFAULT 'ready'::text,
  "score"          integer                  DEFAULT 0,
  "requirement"    text                     NOT NULL DEFAULT 'Marketing launch readiness requirement'::text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "marketing_launch_readiness_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "marketing_launch_readiness_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."marketing_launch_readiness_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."merchandising_rules" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"   uuid                     NOT NULL,
  "rule_key"   text                     NOT NULL,
  "title"      text                     NOT NULL,
  "priority"   integer                  DEFAULT 100,
  "conditions" jsonb                    DEFAULT '{}'::jsonb,
  "actions"    jsonb                    DEFAULT '{}'::jsonb,
  "is_active"  boolean                  DEFAULT true,
  "metadata"   jsonb                    DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "merchandising_rules_pkey" PRIMARY KEY (id),
  CONSTRAINT "merchandising_rules_store_id_rule_key_key" UNIQUE (store_id, rule_key)
);

ALTER TABLE "public"."merchandising_rules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_app_readiness_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "check_name"     text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "recommendation" text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "checked_at"     timestamp with time zone DEFAULT now(),
  "created_at"     timestamp with time zone DEFAULT now(),
  "area"           text                     DEFAULT 'mobile_pwa'::text,
  "category"       text                     DEFAULT 'readiness'::text,
  "severity"       text                     DEFAULT 'medium'::text,
  "priority"       integer                  DEFAULT 0,
  "score"          integer                  DEFAULT 0,
  "passed"         boolean                  DEFAULT false,
  "details"        jsonb                    DEFAULT '{}'::jsonb,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone,
  "run_id"         uuid,
  CONSTRAINT "mobile_app_readiness_checks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_app_readiness_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_checkout_events" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "order_id"          uuid,
  "event_type"        text                     NOT NULL DEFAULT 'checkout_mobile_event'::text,
  "step"              text,
  "device_type"       text                     DEFAULT 'mobile'::text,
  "success"           boolean                  DEFAULT true,
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "user_id"           uuid,
  "customer_email"    text,
  "session_id"        text,
  "device_id"         text,
  "source"            text                     DEFAULT 'web'::text,
  "display_mode"      text                     DEFAULT 'browser'::text,
  "duration_ms"       integer                  DEFAULT 0,
  "cart_value"        numeric(10,2)            DEFAULT 0,
  "item_count"        integer                  DEFAULT 0,
  "error_code"        text,
  "error_message"     text,
  "abandoned"         boolean                  DEFAULT false,
  "conversion_status" text                     DEFAULT 'unknown'::text,
  "viewport_width"    integer,
  "viewport_height"   integer,
  "browser"           text,
  "os"                text,
  "friction_reason"   text,
  "friction_step"     text,
  "payment_method"    text,
  "checkout_version"  text,
  "network_type"      text,
  "retry_count"       integer                  DEFAULT 0,
  "recovered"         boolean                  DEFAULT false,
  CONSTRAINT "mobile_checkout_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_checkout_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_install_events" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "event_type"      text                     NOT NULL DEFAULT 'install_prompt'::text,
  "platform"        text                     DEFAULT 'web'::text,
  "device_type"     text                     DEFAULT 'mobile'::text,
  "accepted"        boolean                  DEFAULT false,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "display_mode"    text                     DEFAULT 'browser'::text,
  "install_source"  text                     DEFAULT 'web'::text,
  "prompt_outcome"  text,
  "app_version"     text,
  "browser"         text,
  "os"              text,
  "viewport_width"  integer,
  "viewport_height" integer,
  "standalone"      boolean                  DEFAULT false,
  "source"          text                     DEFAULT 'web'::text,
  "device_id"       text,
  "session_id"      text,
  "customer_email"  text,
  "user_id"         uuid,
  CONSTRAINT "mobile_install_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_install_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_offline_catalog_snapshots" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "product_count"   integer                  DEFAULT 0,
  "category_count"  integer                  DEFAULT 0,
  "snapshot_status" text                     DEFAULT 'ready'::text,
  "cache_version"   text                     DEFAULT to_char(now(), 'YYYYMMDDHH24MISS'::text),
  "payload"         jsonb                    DEFAULT '{}'::jsonb,
  "generated_at"    timestamp with time zone DEFAULT now(),
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "mobile_offline_catalog_snapshots_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_offline_catalog_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_performance_snapshots" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "page_path"          text                     DEFAULT '/'::text,
  "device_type"        text                     DEFAULT 'mobile'::text,
  "lcp_ms"             integer                  DEFAULT 0,
  "fid_ms"             integer                  DEFAULT 0,
  "cls"                numeric(10,4)            DEFAULT 0,
  "ttfb_ms"            integer                  DEFAULT 0,
  "performance_status" text                     DEFAULT 'unknown'::text,
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "measured_at"        timestamp with time zone DEFAULT now(),
  "created_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "mobile_performance_snapshots_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_performance_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_pwa_sessions" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "session_id"    text,
  "device_type"   text                     DEFAULT 'mobile'::text,
  "user_agent"    text,
  "is_standalone" boolean                  DEFAULT false,
  "started_at"    timestamp with time zone DEFAULT now(),
  "last_seen_at"  timestamp with time zone DEFAULT now(),
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "mobile_pwa_sessions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_pwa_sessions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_real_device_validations" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "validation_key" text                     NOT NULL,
  "device_type"    text                     DEFAULT 'mobile'::text,
  "viewport"       text,
  "browser"        text,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "validated_by"   uuid,
  "validated_at"   timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "mobile_real_device_validations_pkey" PRIMARY KEY (id),
  CONSTRAINT "mobile_real_device_validations_store_id_validation_key_key" UNIQUE (store_id, validation_key)
);

ALTER TABLE "public"."mobile_real_device_validations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_retention_events" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "customer_email" text,
  "event_type"     text                     NOT NULL DEFAULT 'mobile_retention_event'::text,
  "channel"        text                     DEFAULT 'pwa'::text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "mobile_retention_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_retention_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_touch_optimization_events" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "area"        text                     NOT NULL DEFAULT 'storefront'::text,
  "event_type"  text                     NOT NULL DEFAULT 'touch_interaction'::text,
  "device_type" text                     DEFAULT 'mobile'::text,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "mobile_touch_optimization_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."mobile_touch_optimization_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."mobile_ux_validation_events" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "event_key"      text                     NOT NULL,
  "device_type"    text                     DEFAULT 'mobile'::text,
  "viewport"       text,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "validated_by"   uuid,
  "validated_at"   timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "mobile_ux_validation_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "mobile_ux_validation_events_store_id_event_key_key" UNIQUE (store_id, event_key)
);

ALTER TABLE "public"."mobile_ux_validation_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."monthly_operations_checklist_items" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "checklist_id" uuid                     NOT NULL,
  "category"     text                     NOT NULL,
  "item_key"     text                     NOT NULL,
  "title"        text                     NOT NULL,
  "description"  text,
  "status"       text                     NOT NULL DEFAULT 'pending'::text,
  "severity"     text                     NOT NULL DEFAULT 'medium'::text,
  "evidence"     jsonb                    DEFAULT '{}'::jsonb,
  "completed_at" timestamp with time zone,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "monthly_operations_checklist_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."monthly_operations_checklist_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."monthly_operations_checklists" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "checklist_month"  text                     NOT NULL DEFAULT to_char(now(), 'YYYY-MM'::text),
  "status"           text                     NOT NULL DEFAULT 'open'::text,
  "generated_by"     uuid,
  "generated_at"     timestamp with time zone DEFAULT now(),
  "completed_at"     timestamp with time zone,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone,
  "execution_status" text                     DEFAULT 'pending'::text,
  "execution_notes"  text,
  "period"           text,
  "run_status"       text                     DEFAULT 'pending'::text,
  "started_at"       timestamp with time zone,
  "finished_at"      timestamp with time zone,
  "summary"          jsonb                    DEFAULT '{}'::jsonb,
  "findings"         jsonb                    DEFAULT '[]'::jsonb,
  "recommendations"  jsonb                    DEFAULT '[]'::jsonb,
  CONSTRAINT "monthly_operations_checklists_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."monthly_operations_checklists"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."multi_currency_settings" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "currency_key"     text                     NOT NULL,
  "currency_code"    text                     NOT NULL DEFAULT 'MXN'::text,
  "currency_name"    text                     DEFAULT 'Mexican Peso'::text,
  "exchange_rate"    numeric(12,6)            DEFAULT 1,
  "is_default"       boolean                  DEFAULT false,
  "is_active"        boolean                  DEFAULT true,
  "pricing_strategy" text                     DEFAULT 'base_currency'::text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "multi_currency_settings_pkey" PRIMARY KEY (id),
  CONSTRAINT "multi_currency_settings_store_id_currency_key_key" UNIQUE (store_id, currency_key)
);

ALTER TABLE "public"."multi_currency_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."newsletter_subscribers" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "email"           text                     NOT NULL,
  "full_name"       text,
  "source"          text                     DEFAULT 'storefront'::text,
  "status"          text                     DEFAULT 'subscribed'::text,
  "consent_at"      timestamp with time zone DEFAULT now(),
  "unsubscribed_at" timestamp with time zone,
  "tags"            text[]                   DEFAULT ARRAY[]::text[],
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY (id),
  CONSTRAINT "newsletter_subscribers_status_check" CHECK ((status = ANY (ARRAY['subscribed'::text, 'unsubscribed'::text, 'bounced'::text, 'complained'::text]))),
  CONSTRAINT "newsletter_subscribers_store_id_email_key" UNIQUE (store_id, email)
);

ALTER TABLE "public"."newsletter_subscribers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."nps_csat_surveys" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "survey_key"     text                     NOT NULL,
  "survey_type"    text                     NOT NULL DEFAULT 'nps_csat'::text,
  "nps_score"      integer                  NOT NULL DEFAULT 0,
  "csat_score"     numeric(10,4)            NOT NULL DEFAULT 0,
  "response_count" integer                  NOT NULL DEFAULT 0,
  "status"         text                     NOT NULL DEFAULT 'active'::text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "nps_csat_surveys_pkey" PRIMARY KEY (id),
  CONSTRAINT "nps_csat_surveys_store_id_survey_key_key" UNIQUE (store_id, survey_key)
);

ALTER TABLE "public"."nps_csat_surveys"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."operating_cost_summaries" (
  "id"                            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                      uuid,
  "cost_key"                      text                     NOT NULL,
  "period"                        text                     NOT NULL DEFAULT to_char(now(), 'YYYY-MM'::text),
  "railway_estimate"              numeric(10,2)            DEFAULT 0,
  "supabase_estimate"             numeric(10,2)            DEFAULT 0,
  "stripe_variable_cost_estimate" numeric(10,2)            DEFAULT 0,
  "email_cost_estimate"           numeric(10,2)            DEFAULT 0,
  "total_estimate"                numeric(10,2)            DEFAULT 0,
  "currency"                      text                     DEFAULT 'USD'::text,
  "notes"                         text,
  "generated_by"                  uuid,
  "generated_at"                  timestamp with time zone DEFAULT now(),
  "metadata"                      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"                    timestamp with time zone DEFAULT now(),
  "updated_at"                    timestamp with time zone DEFAULT now(),
  CONSTRAINT "operating_cost_summaries_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."operating_cost_summaries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."operating_system_review_runs" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "run_key"           text                     NOT NULL,
  "review_type"       text                     NOT NULL DEFAULT 'weekly_business_review'::text,
  "status"            text                     NOT NULL DEFAULT 'completed'::text,
  "executive_summary" text,
  "action_count"      integer                  NOT NULL DEFAULT 0,
  "score"             integer                  NOT NULL DEFAULT 0,
  "recommendation"    text,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "operating_system_review_runs_pkey" PRIMARY KEY (id),
  CONSTRAINT "operating_system_review_runs_store_id_run_key_key" UNIQUE (store_id, run_key)
);

ALTER TABLE "public"."operating_system_review_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."operational_anomaly_events" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "anomaly_key"    text                     NOT NULL,
  "anomaly_type"   text                     NOT NULL DEFAULT 'conversion_drop'::text,
  "source_area"    text                     NOT NULL DEFAULT 'commerce'::text,
  "severity"       text                     NOT NULL DEFAULT 'medium'::text,
  "observed_value" numeric(12,4)            NOT NULL DEFAULT 0,
  "expected_value" numeric(12,4)            NOT NULL DEFAULT 0,
  "status"         text                     NOT NULL DEFAULT 'detected'::text,
  "recommendation" text,
  "detected_at"    timestamp with time zone DEFAULT now(),
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "operational_anomaly_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "operational_anomaly_events_store_id_anomaly_key_key" UNIQUE (store_id, anomaly_key)
);

ALTER TABLE "public"."operational_anomaly_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."operational_events" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "event_type" text                     NOT NULL,
  "severity"   text                     NOT NULL DEFAULT 'info'::text,
  "message"    text                     NOT NULL,
  "metadata"   jsonb                    DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "store_id"   uuid,
  CONSTRAINT "operational_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "operational_events_severity_check" CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text])))
);

ALTER TABLE "public"."operational_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."order_incidents" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "order_id"      uuid,
  "incident_type" text                     DEFAULT 'order_issue'::text,
  "severity"      text                     DEFAULT 'medium'::text,
  "status"        text                     DEFAULT 'open'::text,
  "description"   text,
  "resolution"    text,
  "resolved_at"   timestamp with time zone,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "order_incidents_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."order_incidents"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."order_items" (
  "id"               uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "order_id"         uuid,
  "product_id"       uuid,
  "quantity"         integer       NOT NULL DEFAULT 1,
  "unit_price"       numeric(10,2) NOT NULL,
  "product_snapshot" jsonb         DEFAULT '{}'::jsonb,
  CONSTRAINT "order_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "order_items_quantity_check" CHECK ((quantity > 0)),
  CONSTRAINT "order_items_unit_price_check" CHECK ((unit_price >= (0)::numeric))
);

ALTER TABLE "public"."order_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."order_timeline" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "order_id"      uuid                     NOT NULL,
  "actor_user_id" uuid,
  "event_type"    text                     NOT NULL,
  "from_status"   text,
  "to_status"     text,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "order_timeline_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."order_timeline"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."orders" (
  "id"                       uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                 uuid,
  "customer_user_id"         uuid,
  "customer_email"           text,
  "status"                   text                     DEFAULT 'pendiente'::text,
  "total"                    numeric(10,2)            NOT NULL DEFAULT 0,
  "subtotal"                 numeric(10,2)            NOT NULL DEFAULT 0,
  "discount_amount"          numeric(10,2)            DEFAULT 0,
  "currency"                 text                     DEFAULT 'mxn'::text,
  "stripe_session_id"        text,
  "stripe_payment_intent_id" text,
  "tracking_number"          text,
  "notes"                    text,
  "coupon_code"              text,
  "paid_at"                  timestamp with time zone,
  "cancelled_at"             timestamp with time zone,
  "refunded_at"              timestamp with time zone,
  "created_at"               timestamp with time zone DEFAULT now(),
  "updated_at"               timestamp with time zone DEFAULT now(),
  "fulfilled_at"             timestamp with time zone,
  "delivered_at"             timestamp with time zone,
  "tracking_url"             text,
  "shipped_at"               timestamp with time zone,
  "carrier"                  text,
  "fulfillment_status"       text                     DEFAULT 'unassigned'::text,
  "fulfillment_priority"     integer                  DEFAULT 100,
  "fulfillment_notes"        text,
  "support_status"           text                     DEFAULT 'none'::text,
  "financial_status"         text                     DEFAULT 'unreconciled'::text,
  "reconciled_at"            timestamp with time zone,
  "payout_reference"         text,
  "accounting_notes"         text,
  "refunded_amount"          numeric(10,2)            DEFAULT 0,
  "refund_status"            text                     DEFAULT 'none'::text,
  "stripe_refund_id"         text,
  "inventory_restocked_at"   timestamp with time zone,
  CONSTRAINT "orders_discount_amount_check" CHECK ((discount_amount >= (0)::numeric)),
  CONSTRAINT "orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "orders_status_check"
    CHECK
    ((status = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'payment_failed'::text, 'inventory_exception'::text, 'empacado'::text, 'enviado'::text, 'entregado'::text,
    'cancelado'::text, 'refunded'::text, 'partially_refunded'::text]))),
  CONSTRAINT "orders_stripe_session_id_key" UNIQUE (stripe_session_id),
  CONSTRAINT "orders_subtotal_check" CHECK ((subtotal >= (0)::numeric)),
  CONSTRAINT "orders_total_check" CHECK ((total >= (0)::numeric))
);

ALTER TABLE "public"."orders"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."organic_traffic_readiness_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "area"           text                     DEFAULT 'organic'::text,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "requirement"    text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "organic_traffic_readiness_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "organic_traffic_readiness_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."organic_traffic_readiness_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."outbound_webhook_deliveries" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "delivery_key"    text                     NOT NULL,
  "webhook_type"    text                     NOT NULL,
  "target_url"      text,
  "delivery_status" text                     DEFAULT 'queued'::text,
  "attempts"        integer                  DEFAULT 0,
  "last_attempt_at" timestamp with time zone,
  "error_message"   text,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "outbound_webhook_deliveries_pkey" PRIMARY KEY (id),
  CONSTRAINT "outbound_webhook_deliveries_store_id_delivery_key_key" UNIQUE (store_id, delivery_key)
);

ALTER TABLE "public"."outbound_webhook_deliveries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."paid_traffic_campaign_runs" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "run_key"        text                     NOT NULL,
  "campaign_name"  text                     NOT NULL DEFAULT 'Paid traffic campaign run'::text,
  "platform"       text                     NOT NULL DEFAULT 'meta'::text,
  "objective"      text                     NOT NULL DEFAULT 'conversion'::text,
  "status"         text                     NOT NULL DEFAULT 'planned'::text,
  "spend_cents"    integer                  NOT NULL DEFAULT 0,
  "clicks"         integer                  NOT NULL DEFAULT 0,
  "impressions"    integer                  NOT NULL DEFAULT 0,
  "conversions"    integer                  NOT NULL DEFAULT 0,
  "revenue_cents"  integer                  NOT NULL DEFAULT 0,
  "cpc_cents"      integer                  DEFAULT 0,
  "cpm_cents"      integer                  DEFAULT 0,
  "roas"           numeric(10,2)            DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "paid_traffic_campaign_runs_pkey" PRIMARY KEY (id),
  CONSTRAINT "paid_traffic_campaign_runs_store_id_run_key_key" UNIQUE (store_id, run_key)
);

ALTER TABLE "public"."paid_traffic_campaign_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."paid_traffic_campaigns" (
  "id"                     uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"               uuid                     NOT NULL,
  "commercial_campaign_id" uuid,
  "name"                   text                     NOT NULL,
  "slug"                   text                     NOT NULL,
  "channel"                text                     NOT NULL DEFAULT 'meta'::text,
  "objective"              text                     NOT NULL DEFAULT 'conversions'::text,
  "status"                 text                     NOT NULL DEFAULT 'draft'::text,
  "budget_daily"           numeric(12,2)            DEFAULT 0,
  "utm_source"             text,
  "utm_medium"             text,
  "utm_campaign"           text,
  "coupon_code"            text,
  "target_audience"        jsonb                    DEFAULT '{}'::jsonb,
  "metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "starts_at"              timestamp with time zone,
  "ends_at"                timestamp with time zone,
  "created_at"             timestamp with time zone DEFAULT now(),
  "updated_at"             timestamp with time zone DEFAULT now(),
  CONSTRAINT "paid_traffic_campaigns_pkey" PRIMARY KEY (id),
  CONSTRAINT "paid_traffic_campaigns_store_id_slug_key" UNIQUE (store_id, slug)
);

ALTER TABLE "public"."paid_traffic_campaigns"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."paid_traffic_landing_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "channel"        text                     DEFAULT 'paid'::text,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "requirement"    text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "paid_traffic_landing_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "paid_traffic_landing_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."paid_traffic_landing_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."performance_test_runs" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "run_key"             text                     NOT NULL,
  "scenario_key"        text,
  "status"              text                     NOT NULL DEFAULT 'pending'::text,
  "target_base_url"     text,
  "concurrent_users"    integer                  DEFAULT 1,
  "duration_seconds"    integer                  DEFAULT 30,
  "total_requests"      integer                  DEFAULT 0,
  "successful_requests" integer                  DEFAULT 0,
  "failed_requests"     integer                  DEFAULT 0,
  "p50_ms"              integer                  DEFAULT 0,
  "p95_ms"              integer                  DEFAULT 0,
  "p99_ms"              integer                  DEFAULT 0,
  "error_rate"          numeric(10,4)            DEFAULT 0,
  "executed_by"         uuid,
  "started_at"          timestamp with time zone DEFAULT now(),
  "completed_at"        timestamp with time zone,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "performance_test_runs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."performance_test_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."permission_review_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "run_id"         uuid,
  "store_id"       uuid,
  "user_id"        uuid,
  "role_name"      text,
  "permission_key" text,
  "review_status"  text                     NOT NULL DEFAULT 'pending'::text,
  "risk_level"     text                     NOT NULL DEFAULT 'medium'::text,
  "recommendation" text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "permission_review_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."permission_review_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."permission_review_runs" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "run_key"        text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "reviewed_by"    uuid,
  "started_at"     timestamp with time zone DEFAULT now(),
  "completed_at"   timestamp with time zone,
  "findings_count" integer                  DEFAULT 0,
  "recommendation" text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "permission_review_runs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."permission_review_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."personalization_profiles" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "profile_key"      text                     NOT NULL,
  "segment_key"      text                     DEFAULT 'baseline'::text,
  "lifecycle_stage"  text                     DEFAULT 'new_customer'::text,
  "preference_model" jsonb                    DEFAULT '{}'::jsonb,
  "confidence_score" integer                  DEFAULT 0,
  "status"           text                     DEFAULT 'active'::text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "personalization_profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "personalization_profiles_store_id_profile_key_key" UNIQUE (store_id, profile_key)
);

ALTER TABLE "public"."personalization_profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."post_purchase_email_optimizations" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "optimization_key" text                     NOT NULL,
  "email_type"       text                     NOT NULL DEFAULT 'post_purchase'::text,
  "subject_line"     text,
  "open_rate"        numeric(10,4)            NOT NULL DEFAULT 0,
  "click_rate"       numeric(10,4)            NOT NULL DEFAULT 0,
  "conversion_rate"  numeric(10,4)            NOT NULL DEFAULT 0,
  "status"           text                     NOT NULL DEFAULT 'optimized'::text,
  "recommendation"   text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "post_purchase_email_optimizations_pkey" PRIMARY KEY (id),
  CONSTRAINT "post_purchase_email_optimizations_store_id_optimization_key_key" UNIQUE (store_id, optimization_key)
);

ALTER TABLE "public"."post_purchase_email_optimizations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."post_purchase_experience_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "journey_stage"  text                     NOT NULL DEFAULT 'post_purchase'::text,
  "status"         text                     NOT NULL DEFAULT 'checked'::text,
  "score"          integer                  NOT NULL DEFAULT 0,
  "issue_count"    integer                  NOT NULL DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "post_purchase_experience_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "post_purchase_experience_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."post_purchase_experience_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."proactive_operations_reports" (
  "id"                          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                    uuid,
  "report_key"                  text                     NOT NULL,
  "report_type"                 text                     NOT NULL DEFAULT 'proactive_operations'::text,
  "manual_work_reduction_score" integer                  NOT NULL DEFAULT 0,
  "automation_coverage_score"   integer                  NOT NULL DEFAULT 0,
  "anomaly_detection_score"     integer                  NOT NULL DEFAULT 0,
  "alerting_score"              integer                  NOT NULL DEFAULT 0,
  "status"                      text                     NOT NULL DEFAULT 'generated'::text,
  "executive_summary"           text,
  "recommendation"              text,
  "executed_by"                 uuid,
  "executed_at"                 timestamp with time zone DEFAULT now(),
  "metadata"                    jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"                  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "proactive_operations_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "proactive_operations_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."proactive_operations_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_category_copy_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "copy_key"       text                     NOT NULL,
  "entity_type"    text                     DEFAULT 'product'::text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "title"          text,
  "copy"           text,
  "seo_notes"      text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_category_copy_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_category_copy_items_store_id_copy_key_key" UNIQUE (store_id, copy_key)
);

ALTER TABLE "public"."product_category_copy_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_content_completion_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "item_key"       text                     NOT NULL,
  "content_area"   text                     DEFAULT 'product'::text,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "requirement"    text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_content_completion_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_content_completion_items_store_id_item_key_key" UNIQUE (store_id, item_key)
);

ALTER TABLE "public"."product_content_completion_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_feeds" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid                     NOT NULL,
  "feed_type"     text                     NOT NULL DEFAULT 'meta_google'::text,
  "status"        text                     NOT NULL DEFAULT 'generated'::text,
  "product_count" integer                  DEFAULT 0,
  "invalid_count" integer                  DEFAULT 0,
  "feed_url"      text,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "generated_at"  timestamp with time zone DEFAULT now(),
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_feeds_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."product_feeds"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_media_assets" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "product_id"      uuid                     NOT NULL,
  "url"             text                     NOT NULL,
  "alt_text"        text,
  "media_type"      text                     DEFAULT 'image'::text,
  "sort_order"      integer                  DEFAULT 100,
  "is_primary"      boolean                  DEFAULT false,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "width"           integer,
  "height"          integer,
  "optimized_url"   text,
  "file_size_bytes" integer,
  "quality_status"  text                     DEFAULT 'pending'::text,
  CONSTRAINT "product_media_assets_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."product_media_assets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_publish_checks" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"   uuid                     NOT NULL,
  "product_id" uuid                     NOT NULL,
  "score"      integer                  NOT NULL DEFAULT 0,
  "issues"     jsonb                    DEFAULT '[]'::jsonb,
  "status"     text                     NOT NULL DEFAULT 'pending'::text,
  "checked_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_publish_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_publish_checks_product_id_key" UNIQUE (product_id)
);

ALTER TABLE "public"."product_publish_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_v2_roadmap_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "roadmap_key"    text                     NOT NULL,
  "roadmap_area"   text                     DEFAULT 'product_v2'::text,
  "title"          text                     NOT NULL DEFAULT 'Product v2 roadmap item'::text,
  "description"    text,
  "priority"       integer                  DEFAULT 0,
  "status"         text                     DEFAULT 'planned'::text,
  "target_quarter" text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_v2_roadmap_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_v2_roadmap_items_store_id_roadmap_key_key" UNIQUE (store_id, roadmap_key)
);

ALTER TABLE "public"."product_v2_roadmap_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."production_content_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "content_key"    text                     NOT NULL,
  "content_type"   text                     DEFAULT 'general'::text,
  "surface"        text                     DEFAULT 'storefront'::text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "title"          text,
  "body"           text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "production_content_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "production_content_items_store_id_content_key_key" UNIQUE (store_id, content_key)
);

ALTER TABLE "public"."production_content_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."products" (
  "id"                             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                       uuid,
  "name"                           text                     NOT NULL,
  "description"                    text,
  "price"                          numeric(10,2)            NOT NULL DEFAULT 0,
  "stock"                          integer                  NOT NULL DEFAULT 0,
  "images"                         jsonb                    DEFAULT '[]'::jsonb,
  "brand"                          text,
  "category"                       text,
  "categories"                     jsonb                    DEFAULT '[]'::jsonb,
  "subcategory"                    text,
  "variants"                       jsonb                    DEFAULT '[]'::jsonb,
  "status"                         text                     DEFAULT 'draft'::text,
  "slug"                           text,
  "sku"                            text,
  "seo_title"                      text,
  "seo_description"                text,
  "created_at"                     timestamp with time zone DEFAULT now(),
  "updated_at"                     timestamp with time zone DEFAULT now(),
  "long_description"               text,
  "ingredients"                    jsonb                    DEFAULT '[]'::jsonb,
  "compare_at_price"               numeric(10,2),
  "cost"                           numeric(10,2),
  "supplier"                       text,
  "low_stock_threshold"            integer                  DEFAULT 5,
  "commercial_status"              text                     DEFAULT 'ready'::text,
  "image_alt_text"                 text,
  "collection"                     text,
  "short_marketing_copy"           text,
  "hero_badge"                     text,
  "is_featured"                    boolean                  DEFAULT false,
  "sort_priority"                  integer                  DEFAULT 100,
  "launch_ready_at"                timestamp with time zone,
  "image_url"                      text,
  "currency"                       text                     DEFAULT 'MXN'::text,
  "feed_status"                    text                     DEFAULT 'eligible'::text,
  "google_product_category"        text                     DEFAULT 'Health & Beauty > Personal Care'::text,
  "landing_page_headline"          text,
  "landing_page_benefits"          jsonb                    DEFAULT '[]'::jsonb,
  "margin_percent"                 numeric(10,2),
  "merchandising_priority"         integer                  DEFAULT 100,
  "promo_badge"                    text,
  "ready_for_ads"                  boolean                  DEFAULT false,
  "catalog_quality_score"          integer                  DEFAULT 0,
  "catalog_validation_issues"      jsonb                    DEFAULT '[]'::jsonb,
  "last_catalog_reviewed_at"       timestamp with time zone,
  "primary_supplier_id"            uuid,
  "supplier_sku"                   text,
  "reorder_point"                  integer                  DEFAULT 5,
  "reorder_quantity"               integer                  DEFAULT 10,
  "preferred_supplier_cost"        numeric(12,2),
  "lead_time_days"                 integer                  DEFAULT 7,
  "last_replenishment_reviewed_at" timestamp with time zone,
  "search_keywords"                text[]                   DEFAULT ARRAY[]::text[],
  "ai_summary"                     text,
  "discovery_tags"                 text[]                   DEFAULT ARRAY[]::text[],
  "recommendation_score"           numeric(10,4)            DEFAULT 0,
  CONSTRAINT "products_pkey" PRIMARY KEY (id),
  CONSTRAINT "products_price_check" CHECK ((price >= (0)::numeric)),
  CONSTRAINT "products_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text, 'out_of_stock'::text]))),
  CONSTRAINT "products_stock_check" CHECK ((stock >= 0)),
  CONSTRAINT "products_store_id_sku_key" UNIQUE (store_id, sku),
  CONSTRAINT "products_store_id_slug_key" UNIQUE (store_id, slug)
);

ALTER TABLE "public"."products"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."projected_stock_alerts" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "supplier_id"     uuid,
  "product_id"      uuid,
  "sku"             text,
  "product_name"    text,
  "current_stock"   integer                  DEFAULT 0,
  "projected_stock" integer                  DEFAULT 0,
  "alert_type"      text                     DEFAULT 'projected_low_stock'::text,
  "severity"        text                     DEFAULT 'medium'::text,
  "status"          text                     DEFAULT 'open'::text,
  "projected_date"  date,
  "recommendation"  text,
  "created_by"      uuid,
  "resolved_at"     timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "projected_stock_alerts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."projected_stock_alerts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."public_content_pages" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "slug"            text                     NOT NULL,
  "title"           text                     NOT NULL,
  "page_type"       text                     DEFAULT 'content'::text,
  "content"         text                     NOT NULL,
  "seo_title"       text,
  "seo_description" text,
  "status"          text                     DEFAULT 'published'::text,
  "updated_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "public_content_pages_pkey" PRIMARY KEY (id),
  CONSTRAINT "public_content_pages_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
  CONSTRAINT "public_content_pages_store_id_slug_key" UNIQUE (store_id, slug)
);

ALTER TABLE "public"."public_content_pages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."purchase_order_items" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "purchase_order_id" uuid                     NOT NULL,
  "product_id"        uuid,
  "supplier_id"       uuid,
  "sku"               text,
  "supplier_sku"      text,
  "product_name"      text                     NOT NULL,
  "quantity_ordered"  integer                  NOT NULL DEFAULT 1,
  "quantity_received" integer                  DEFAULT 0,
  "unit_cost"         numeric(12,2)            DEFAULT 0,
  "line_total"        numeric(12,2)            DEFAULT 0,
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."purchase_order_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."purchase_orders" (
  "id"                    uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"              uuid,
  "supplier_id"           uuid,
  "po_number"             text                     NOT NULL,
  "status"                text                     NOT NULL DEFAULT 'draft'::text,
  "order_date"            date                     DEFAULT CURRENT_DATE,
  "expected_arrival_date" date,
  "received_at"           timestamp with time zone,
  "subtotal_amount"       numeric(12,2)            DEFAULT 0,
  "shipping_amount"       numeric(12,2)            DEFAULT 0,
  "tax_amount"            numeric(12,2)            DEFAULT 0,
  "total_amount"          numeric(12,2)            DEFAULT 0,
  "currency"              text                     DEFAULT 'MXN'::text,
  "created_by"            uuid,
  "approved_by"           uuid,
  "notes"                 text,
  "metadata"              jsonb                    DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone DEFAULT now(),
  "updated_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "purchase_orders_store_id_po_number_key" UNIQUE (store_id, po_number)
);

ALTER TABLE "public"."purchase_orders"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."query_profile_events" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "profile_key"         text                     NOT NULL,
  "query_name"          text                     NOT NULL,
  "table_name"          text,
  "duration_ms"         integer                  DEFAULT 0,
  "rows_scanned"        integer                  DEFAULT 0,
  "rows_returned"       integer                  DEFAULT 0,
  "index_used"          boolean                  DEFAULT false,
  "optimization_status" text                     DEFAULT 'unknown'::text,
  "recommendation"      text,
  "executed_by"         uuid,
  "profiled_at"         timestamp with time zone DEFAULT now(),
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "query_profile_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."query_profile_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."railway_optimization_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "check_name"     text                     NOT NULL,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "railway_optimization_checks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."railway_optimization_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."real_sales_measurements" (
  "id"                        uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                  uuid,
  "measurement_key"           text                     NOT NULL,
  "channel"                   text                     NOT NULL DEFAULT 'all'::text,
  "orders_count"              integer                  NOT NULL DEFAULT 0,
  "gross_revenue_cents"       integer                  NOT NULL DEFAULT 0,
  "net_revenue_cents"         integer                  NOT NULL DEFAULT 0,
  "average_order_value_cents" integer                  NOT NULL DEFAULT 0,
  "refunds_cents"             integer                  NOT NULL DEFAULT 0,
  "status"                    text                     NOT NULL DEFAULT 'measured'::text,
  "score"                     integer                  NOT NULL DEFAULT 0,
  "recommendation"            text,
  "executed_by"               uuid,
  "executed_at"               timestamp with time zone DEFAULT now(),
  "metadata"                  jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "real_sales_measurements_pkey" PRIMARY KEY (id),
  CONSTRAINT "real_sales_measurements_store_id_measurement_key_key" UNIQUE (store_id, measurement_key)
);

ALTER TABLE "public"."real_sales_measurements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."real_user_feedback_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "feedback_key"   text                     NOT NULL,
  "channel"        text                     DEFAULT 'manual'::text,
  "user_type"      text                     DEFAULT 'customer'::text,
  "journey_step"   text                     DEFAULT 'general'::text,
  "sentiment"      text                     DEFAULT 'neutral'::text,
  "severity"       text                     DEFAULT 'medium'::text,
  "status"         text                     DEFAULT 'open'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "comment"        text,
  "recommendation" text,
  "captured_by"    uuid,
  "captured_at"    timestamp with time zone DEFAULT now(),
  "resolved_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "real_user_feedback_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "real_user_feedback_items_store_id_feedback_key_key" UNIQUE (store_id, feedback_key)
);

ALTER TABLE "public"."real_user_feedback_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."real_user_test_runs" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "run_key"         text                     NOT NULL,
  "cohort"          text                     DEFAULT 'real_users'::text,
  "status"          text                     DEFAULT 'running'::text,
  "total_users"     integer                  DEFAULT 0,
  "completed_users" integer                  DEFAULT 0,
  "conversion_rate" numeric(6,2)             DEFAULT 0,
  "friction_score"  numeric(6,2)             DEFAULT 0,
  "findings"        jsonb                    DEFAULT '[]'::jsonb,
  "recommendation"  text,
  "started_by"      uuid,
  "started_at"      timestamp with time zone DEFAULT now(),
  "finished_at"     timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "real_user_test_runs_pkey" PRIMARY KEY (id),
  CONSTRAINT "real_user_test_runs_store_id_run_key_key" UNIQUE (store_id, run_key)
);

ALTER TABLE "public"."real_user_test_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recommendation_engine_rules" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "rule_key"       text                     NOT NULL,
  "rule_name"      text                     DEFAULT 'Baseline recommendation rule'::text,
  "rule_type"      text                     DEFAULT 'product_recommendation'::text,
  "target_segment" text                     DEFAULT 'all_customers'::text,
  "priority"       integer                  DEFAULT 0,
  "status"         text                     DEFAULT 'active'::text,
  "lift_score"     integer                  DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "recommendation_engine_rules_pkey" PRIMARY KEY (id),
  CONSTRAINT "recommendation_engine_rules_store_id_rule_key_key" UNIQUE (store_id, rule_key)
);

ALTER TABLE "public"."recommendation_engine_rules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recommendation_events" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "event_key"    text                     NOT NULL,
  "rule_key"     text,
  "customer_key" text,
  "product_sku"  text,
  "event_type"   text                     DEFAULT 'recommendation_served'::text,
  "outcome"      text                     DEFAULT 'observed'::text,
  "occurred_at"  timestamp with time zone DEFAULT now(),
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "recommendation_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "recommendation_events_store_id_event_key_key" UNIQUE (store_id, event_key)
);

ALTER TABLE "public"."recommendation_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recurring_customer_conversion_reports" (
  "id"                      uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                uuid,
  "report_key"              text                     NOT NULL,
  "period"                  text                     NOT NULL DEFAULT 'monthly'::text,
  "returning_customers"     integer                  NOT NULL DEFAULT 0,
  "recurring_revenue_cents" integer                  NOT NULL DEFAULT 0,
  "lifecycle_stage"         text                     NOT NULL DEFAULT 'retention'::text,
  "score"                   integer                  NOT NULL DEFAULT 0,
  "recommendation"          text,
  "executed_by"             uuid,
  "executed_at"             timestamp with time zone DEFAULT now(),
  "metadata"                jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recurring_customer_conversion_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "recurring_customer_conversion_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."recurring_customer_conversion_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recurring_review_schedules" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "schedule_key"   text                     NOT NULL,
  "review_name"    text                     NOT NULL DEFAULT 'Operating review'::text,
  "review_type"    text                     NOT NULL DEFAULT 'weekly_business_review'::text,
  "cadence"        text                     NOT NULL DEFAULT 'weekly'::text,
  "owner_role"     text                     NOT NULL DEFAULT 'admin'::text,
  "enabled"        boolean                  NOT NULL DEFAULT true,
  "status"         text                     NOT NULL DEFAULT 'scheduled'::text,
  "next_review_at" timestamp with time zone,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recurring_review_schedules_pkey" PRIMARY KEY (id),
  CONSTRAINT "recurring_review_schedules_store_id_schedule_key_key" UNIQUE (store_id, schedule_key)
);

ALTER TABLE "public"."recurring_review_schedules"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."repeat_purchase_measurements" (
  "id"                   uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"             uuid,
  "measurement_key"      text                     NOT NULL,
  "period"               text                     NOT NULL DEFAULT 'monthly'::text,
  "first_time_buyers"    integer                  NOT NULL DEFAULT 0,
  "repeat_buyers"        integer                  NOT NULL DEFAULT 0,
  "repeat_purchase_rate" numeric(10,4)            NOT NULL DEFAULT 0,
  "status"               text                     NOT NULL DEFAULT 'measured'::text,
  "recommendation"       text,
  "executed_by"          uuid,
  "executed_at"          timestamp with time zone DEFAULT now(),
  "metadata"             jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "repeat_purchase_measurements_pkey" PRIMARY KEY (id),
  CONSTRAINT "repeat_purchase_measurements_store_id_measurement_key_key" UNIQUE (store_id, measurement_key)
);

ALTER TABLE "public"."repeat_purchase_measurements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."resource_usage_alerts" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "alert_key"       text                     NOT NULL,
  "resource_type"   text                     NOT NULL,
  "metric_name"     text                     NOT NULL,
  "current_value"   numeric(12,4)            DEFAULT 0,
  "threshold_value" numeric(12,4)            DEFAULT 0,
  "severity"        text                     DEFAULT 'medium'::text,
  "status"          text                     DEFAULT 'open'::text,
  "recommendation"  text,
  "detected_at"     timestamp with time zone DEFAULT now(),
  "resolved_at"     timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "resource_usage_alerts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."resource_usage_alerts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."retention_activation_runs" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "run_key"             text                     NOT NULL,
  "segment"             text                     NOT NULL DEFAULT 'recent_buyers'::text,
  "campaign_name"       text                     NOT NULL DEFAULT 'post_purchase_retention'::text,
  "status"              text                     NOT NULL DEFAULT 'planned'::text,
  "target_customers"    integer                  NOT NULL DEFAULT 0,
  "activated_customers" integer                  NOT NULL DEFAULT 0,
  "recommendation"      text,
  "executed_by"         uuid,
  "executed_at"         timestamp with time zone DEFAULT now(),
  "metadata"            jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "retention_activation_runs_pkey" PRIMARY KEY (id),
  CONSTRAINT "retention_activation_runs_store_id_run_key_key" UNIQUE (store_id, run_key)
);

ALTER TABLE "public"."retention_activation_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."returns_requests" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "order_id"         uuid,
  "customer_email"   text,
  "reason"           text                     DEFAULT 'customer_request'::text,
  "status"           text                     DEFAULT 'requested'::text,
  "requested_amount" numeric(10,2),
  "approved_amount"  numeric(10,2),
  "resolution"       text,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "returns_requests_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."returns_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reusable_component_standards" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "component_key"  text                     NOT NULL,
  "component_type" text                     DEFAULT 'component'::text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "standard"       text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "reusable_component_standards_pkey" PRIMARY KEY (id),
  CONSTRAINT "reusable_component_standards_store_id_component_key_key" UNIQUE (store_id, component_key)
);

ALTER TABLE "public"."reusable_component_standards"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."revenue_conversion_risk_notifications" (
  "id"                    uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"              uuid,
  "notification_key"      text                     NOT NULL,
  "risk_type"             text                     NOT NULL DEFAULT 'conversion_risk'::text,
  "channel"               text                     NOT NULL DEFAULT 'all'::text,
  "severity"              text                     NOT NULL DEFAULT 'medium'::text,
  "revenue_at_risk_cents" integer                  NOT NULL DEFAULT 0,
  "conversion_delta"      numeric(10,4)            NOT NULL DEFAULT 0,
  "notification_status"   text                     NOT NULL DEFAULT 'queued'::text,
  "recommendation"        text,
  "notified_at"           timestamp with time zone,
  "executed_by"           uuid,
  "executed_at"           timestamp with time zone DEFAULT now(),
  "metadata"              jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "revenue_conversion_risk_notificat_store_id_notification_key_key" UNIQUE (store_id, notification_key),
  CONSTRAINT "revenue_conversion_risk_notifications_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."revenue_conversion_risk_notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."revenue_snapshots" (
  "id"                    uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"              uuid,
  "snapshot_date"         date                     NOT NULL DEFAULT CURRENT_DATE,
  "revenue_total"         numeric(12,2)            DEFAULT 0,
  "order_count"           integer                  DEFAULT 0,
  "paid_order_count"      integer                  DEFAULT 0,
  "average_order_value"   numeric(12,2)            DEFAULT 0,
  "unique_customer_count" integer                  DEFAULT 0,
  "metadata"              jsonb                    DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "revenue_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "revenue_snapshots_store_id_snapshot_date_key" UNIQUE (store_id, snapshot_date)
);

ALTER TABLE "public"."revenue_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."revenue_validation_snapshots" (
  "id"                        uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                  uuid,
  "snapshot_key"              text                     NOT NULL,
  "period"                    text                     NOT NULL DEFAULT 'controlled_launch'::text,
  "gross_revenue_cents"       integer                  NOT NULL DEFAULT 0,
  "net_revenue_cents"         integer                  NOT NULL DEFAULT 0,
  "paid_orders"               integer                  NOT NULL DEFAULT 0,
  "average_order_value_cents" integer                  NOT NULL DEFAULT 0,
  "refund_rate"               numeric(10,2)            DEFAULT 0,
  "status"                    text                     NOT NULL DEFAULT 'baseline'::text,
  "score"                     integer                  DEFAULT 0,
  "recommendation"            text,
  "executed_by"               uuid,
  "executed_at"               timestamp with time zone DEFAULT now(),
  "metadata"                  jsonb                    DEFAULT '{}'::jsonb,
  "created_at"                timestamp with time zone DEFAULT now(),
  "updated_at"                timestamp with time zone DEFAULT now(),
  CONSTRAINT "revenue_validation_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "revenue_validation_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."revenue_validation_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."review_requests" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "order_id"       uuid,
  "customer_email" text                     NOT NULL,
  "status"         text                     DEFAULT 'pending'::text,
  "sent_at"        timestamp with time zone,
  "reviewed_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "review_requests_order_id_customer_email_key" UNIQUE (order_id, customer_email),
  CONSTRAINT "review_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "review_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'reviewed'::text, 'skipped'::text, 'failed'::text])))
);

ALTER TABLE "public"."review_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reviews" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "product_id"        uuid,
  "user_id"           uuid,
  "rating"            integer                  NOT NULL,
  "comment"           text,
  "status"            text                     DEFAULT 'published'::text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "moderation_status" text                     DEFAULT 'approved'::text,
  "moderated_at"      timestamp with time zone,
  "moderated_by"      uuid,
  "source"            text                     DEFAULT 'storefront'::text,
  "helpful_count"     integer                  DEFAULT 0,
  "verified_purchase" boolean                  DEFAULT false,
  "response_text"     text,
  "responded_at"      timestamp with time zone,
  CONSTRAINT "reviews_moderation_status_check" CHECK ((moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT "reviews_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'published'::text, 'hidden'::text])))
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."risk_cost_control_snapshots" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "snapshot_key"   text                     NOT NULL,
  "spend_cents"    integer                  NOT NULL DEFAULT 0,
  "revenue_cents"  integer                  NOT NULL DEFAULT 0,
  "roas"           numeric(10,4)            NOT NULL DEFAULT 0,
  "risk_level"     text                     NOT NULL DEFAULT 'low'::text,
  "cost_status"    text                     NOT NULL DEFAULT 'controlled'::text,
  "score"          integer                  NOT NULL DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "risk_cost_control_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "risk_cost_control_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."risk_cost_control_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sales_channels" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "channel_key"         text                     NOT NULL,
  "name"                text                     NOT NULL,
  "channel_type"        text                     NOT NULL DEFAULT 'marketplace'::text,
  "platform"            text                     NOT NULL DEFAULT 'custom'::text,
  "status"              text                     NOT NULL DEFAULT 'draft'::text,
  "is_active"           boolean                  DEFAULT true,
  "currency"            text                     DEFAULT 'MXN'::text,
  "locale"              text                     DEFAULT 'es-MX'::text,
  "base_url"            text,
  "external_account_id" text,
  "config"              jsonb                    DEFAULT '{}'::jsonb,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "sales_channels_pkey" PRIMARY KEY (id),
  CONSTRAINT "sales_channels_store_id_channel_key_key" UNIQUE (store_id, channel_key)
);

ALTER TABLE "public"."sales_channels"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."scale_capacity_assessments" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "capacity_key"     text                     NOT NULL,
  "area"             text                     NOT NULL DEFAULT 'platform'::text,
  "status"           text                     NOT NULL DEFAULT 'ready'::text,
  "score"            integer                  DEFAULT 100,
  "current_capacity" text,
  "scale_limit"      text,
  "recommendation"   text,
  "measured_by"      uuid,
  "measured_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "scale_capacity_assessments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."scale_capacity_assessments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."scale_decision_records" (
  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"     uuid,
  "decision_key" text                     NOT NULL,
  "decision"     text                     NOT NULL DEFAULT 'scale_carefully'::text,
  "status"       text                     NOT NULL DEFAULT 'approved'::text,
  "rationale"    text,
  "conditions"   jsonb                    DEFAULT '[]'::jsonb,
  "next_actions" jsonb                    DEFAULT '[]'::jsonb,
  "decided_by"   uuid,
  "decided_at"   timestamp with time zone DEFAULT now(),
  "metadata"     jsonb                    DEFAULT '{}'::jsonb,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "scale_decision_records_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."scale_decision_records"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."scale_governance_freeze_records" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "freeze_key"      text                     NOT NULL,
  "freeze_name"     text                     DEFAULT 'Scale governance freeze'::text,
  "freeze_scope"    text                     DEFAULT 'post_launch_platform'::text,
  "status"          text                     DEFAULT 'active'::text,
  "readiness_score" integer                  DEFAULT 0,
  "approved_by"     uuid,
  "approved_at"     timestamp with time zone,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "scale_governance_freeze_records_pkey" PRIMARY KEY (id),
  CONSTRAINT "scale_governance_freeze_records_store_id_freeze_key_key" UNIQUE (store_id, freeze_key)
);

ALTER TABLE "public"."scale_governance_freeze_records"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."scheduled_report_definitions" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "report_key"     text                     NOT NULL,
  "report_name"    text                     NOT NULL DEFAULT 'Scheduled operating report'::text,
  "report_type"    text                     NOT NULL DEFAULT 'executive_daily'::text,
  "cadence"        text                     NOT NULL DEFAULT 'daily'::text,
  "audience"       text                     NOT NULL DEFAULT 'executive'::text,
  "enabled"        boolean                  NOT NULL DEFAULT true,
  "last_run_at"    timestamp with time zone,
  "next_run_at"    timestamp with time zone,
  "status"         text                     NOT NULL DEFAULT 'active'::text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "scheduled_report_definitions_pkey" PRIMARY KEY (id),
  CONSTRAINT "scheduled_report_definitions_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."scheduled_report_definitions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."scheduled_report_runs" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "run_key"          text                     NOT NULL,
  "report_key"       text                     NOT NULL,
  "report_type"      text                     NOT NULL DEFAULT 'executive_daily'::text,
  "period_start"     timestamp with time zone,
  "period_end"       timestamp with time zone,
  "delivery_status"  text                     NOT NULL DEFAULT 'generated'::text,
  "recipients_count" integer                  NOT NULL DEFAULT 0,
  "score"            integer                  NOT NULL DEFAULT 0,
  "summary"          text,
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone DEFAULT now(),
  "metadata"         jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "scheduled_report_runs_pkey" PRIMARY KEY (id),
  CONSTRAINT "scheduled_report_runs_store_id_run_key_key" UNIQUE (store_id, run_key)
);

ALTER TABLE "public"."scheduled_report_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."search_intent_optimization_items" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "intent_key"        text                     NOT NULL,
  "intent_type"       text                     DEFAULT 'commercial'::text,
  "status"            text                     DEFAULT 'planned'::text,
  "score"             numeric(6,2)             DEFAULT 0,
  "target_query"      text,
  "optimized_surface" text,
  "recommendation"    text,
  "executed_by"       uuid,
  "executed_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "search_intent_optimization_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "search_intent_optimization_items_store_id_intent_key_key" UNIQUE (store_id, intent_key)
);

ALTER TABLE "public"."search_intent_optimization_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."security_hardening_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "check_name"     text                     NOT NULL,
  "area"           text                     NOT NULL DEFAULT 'security'::text,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "severity"       text                     NOT NULL DEFAULT 'medium'::text,
  "recommendation" text,
  "score"          integer                  DEFAULT 0,
  "passed"         boolean                  DEFAULT false,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "security_hardening_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "security_hardening_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."security_hardening_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sensitive_action_approvals" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "action_key"     text                     NOT NULL,
  "action_name"    text                     NOT NULL,
  "requested_by"   uuid,
  "approved_by"    uuid,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "reason"         text,
  "decision_notes" text,
  "expires_at"     timestamp with time zone,
  "requested_at"   timestamp with time zone DEFAULT now(),
  "resolved_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "sensitive_action_approvals_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."sensitive_action_approvals"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."seo_content_depth_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "page_type"      text                     DEFAULT 'general'::text,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "target_keyword" text,
  "content_gap"    text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "seo_content_depth_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "seo_content_depth_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."seo_content_depth_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."skincare_synonyms" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"   uuid,
  "term"       text                     NOT NULL,
  "synonyms"   text[]                   DEFAULT ARRAY[]::text[],
  "category"   text                     DEFAULT 'skincare'::text,
  "language"   text                     DEFAULT 'es'::text,
  "is_active"  boolean                  DEFAULT true,
  "metadata"   jsonb                    DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "skincare_synonyms_pkey" PRIMARY KEY (id),
  CONSTRAINT "skincare_synonyms_store_id_term_language_key" UNIQUE (store_id, term, LANGUAGE)
);

ALTER TABLE "public"."skincare_synonyms"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."slow_query_reports" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "report_key"     text                     NOT NULL,
  "query_name"     text                     NOT NULL,
  "table_name"     text,
  "duration_ms"    integer                  DEFAULT 0,
  "threshold_ms"   integer                  DEFAULT 500,
  "severity"       text                     DEFAULT 'medium'::text,
  "status"         text                     DEFAULT 'open'::text,
  "recommendation" text,
  "detected_at"    timestamp with time zone DEFAULT now(),
  "resolved_at"    timestamp with time zone,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "slow_query_reports_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."slow_query_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stores" (
  "id"                              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name"                            text                     NOT NULL DEFAULT 'Selfcare Sinners'::text,
  "slug"                            text                     NOT NULL DEFAULT 'selfcare-sinners'::text,
  "owner_user_id"                   uuid,
  "config"                          jsonb                    DEFAULT '{}'::jsonb,
  "plan"                            text                     DEFAULT 'production'::text,
  "status"                          text                     DEFAULT 'active'::text,
  "created_at"                      timestamp with time zone DEFAULT now(),
  "updated_at"                      timestamp with time zone DEFAULT now(),
  "description"                     text,
  "hero_title"                      text,
  "hero_subtitle"                   text,
  "announcement_text"               text,
  "support_email"                   text,
  "instagram_url"                   text,
  "tiktok_url"                      text,
  "whatsapp_url"                    text,
  "contact_phone"                   text,
  "contact_whatsapp"                text,
  "support_hours"                   text,
  "legal_business_name"             text,
  "legal_address"                   text,
  "lifecycle_config"                jsonb                    DEFAULT '{}'::jsonb,
  "meta_pixel_id"                   text,
  "google_ads_conversion_id"        text,
  "google_analytics_measurement_id" text,
  "default_campaign_coupon"         text,
  "paid_traffic_mode"               text                     DEFAULT 'readiness'::text,
  CONSTRAINT "stores_pkey" PRIMARY KEY (id),
  CONSTRAINT "stores_slug_key" UNIQUE (slug),
  CONSTRAINT "stores_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'disabled'::text])))
);

ALTER TABLE "public"."stores"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."strategic_risk_matrix" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "risk_key"    text                     NOT NULL,
  "category"    text                     NOT NULL DEFAULT 'strategic'::text,
  "severity"    text                     NOT NULL DEFAULT 'medium'::text,
  "probability" text                     NOT NULL DEFAULT 'medium'::text,
  "impact"      text                     NOT NULL DEFAULT 'medium'::text,
  "status"      text                     NOT NULL DEFAULT 'open'::text,
  "description" text,
  "mitigation"  text,
  "owner"       text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "strategic_risk_matrix_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."strategic_risk_matrix"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."strategic_roadmap_items" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "roadmap_key"     text                     NOT NULL,
  "phase"           text                     NOT NULL,
  "title"           text                     NOT NULL,
  "objective"       text,
  "priority"        text                     NOT NULL DEFAULT 'medium'::text,
  "status"          text                     NOT NULL DEFAULT 'planned'::text,
  "target_quarter"  text,
  "business_value"  text,
  "technical_scope" text,
  "created_by"      uuid,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "strategic_roadmap_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."strategic_roadmap_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."stripe_events" (
  "id"            text                     NOT NULL,
  "type"          text                     NOT NULL,
  "processed_at"  timestamp with time zone,
  "created_at"    timestamp with time zone DEFAULT now(),
  "error_message" text,
  "payload"       jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT "stripe_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."stripe_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supabase_optimization_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "check_name"     text                     NOT NULL,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "supabase_optimization_checks_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."supabase_optimization_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supplier_catalog_items" (
  "id"                     uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"               uuid,
  "supplier_id"            uuid,
  "product_id"             uuid,
  "supplier_sku"           text,
  "product_name"           text                     NOT NULL,
  "brand"                  text,
  "category"               text,
  "status"                 text                     DEFAULT 'active'::text,
  "unit_cost"              numeric(12,2)            DEFAULT 0,
  "msrp"                   numeric(12,2),
  "available_quantity"     integer,
  "minimum_order_quantity" integer                  DEFAULT 1,
  "lead_time_days"         integer                  DEFAULT 7,
  "last_seen_at"           timestamp with time zone DEFAULT now(),
  "metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "created_at"             timestamp with time zone DEFAULT now(),
  "updated_at"             timestamp with time zone DEFAULT now(),
  CONSTRAINT "supplier_catalog_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."supplier_catalog_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supplier_lead_time_logs" (
  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"          uuid,
  "supplier_id"       uuid,
  "purchase_order_id" uuid,
  "expected_days"     integer                  DEFAULT 7,
  "actual_days"       integer,
  "status"            text                     DEFAULT 'tracked'::text,
  "recorded_at"       timestamp with time zone DEFAULT now(),
  "metadata"          jsonb                    DEFAULT '{}'::jsonb,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "supplier_lead_time_logs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."supplier_lead_time_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supplier_margin_snapshots" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "supplier_id"    uuid,
  "product_id"     uuid,
  "product_name"   text,
  "supplier_name"  text,
  "unit_cost"      numeric(12,2)            DEFAULT 0,
  "sell_price"     numeric(12,2)            DEFAULT 0,
  "margin_amount"  numeric(12,2)            DEFAULT 0,
  "margin_percent" numeric(12,2)            DEFAULT 0,
  "status"         text                     DEFAULT 'current'::text,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "supplier_margin_snapshots_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."supplier_margin_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supplier_product_costs" (
  "id"                     uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"               uuid,
  "supplier_id"            uuid,
  "product_id"             uuid,
  "supplier_sku"           text,
  "currency"               text                     DEFAULT 'MXN'::text,
  "unit_cost"              numeric(12,2)            NOT NULL DEFAULT 0,
  "previous_unit_cost"     numeric(12,2),
  "effective_from"         date                     DEFAULT CURRENT_DATE,
  "effective_to"           date,
  "is_preferred"           boolean                  DEFAULT false,
  "minimum_order_quantity" integer                  DEFAULT 1,
  "metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "created_at"             timestamp with time zone DEFAULT now(),
  "updated_at"             timestamp with time zone DEFAULT now(),
  CONSTRAINT "supplier_product_costs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."supplier_product_costs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."supplier_replenishment_suggestions" (
  "id"                      uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                uuid,
  "supplier_id"             uuid,
  "product_id"              uuid,
  "sku"                     text,
  "product_name"            text,
  "current_stock"           integer                  DEFAULT 0,
  "reorder_point"           integer                  DEFAULT 5,
  "suggested_quantity"      integer                  DEFAULT 1,
  "lead_time_days"          integer                  DEFAULT 7,
  "projected_stockout_date" date,
  "status"                  text                     DEFAULT 'recommended'::text,
  "recommendation_reason"   text,
  "created_by"              uuid,
  "metadata"                jsonb                    DEFAULT '{}'::jsonb,
  "created_at"              timestamp with time zone DEFAULT now(),
  "updated_at"              timestamp with time zone DEFAULT now(),
  CONSTRAINT "supplier_replenishment_suggestions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."supplier_replenishment_suggestions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."suppliers" (
  "id"                   uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"             uuid,
  "supplier_key"         text                     NOT NULL,
  "name"                 text                     NOT NULL,
  "status"               text                     NOT NULL DEFAULT 'active'::text,
  "contact_name"         text,
  "contact_email"        text,
  "contact_phone"        text,
  "website_url"          text,
  "lead_time_days"       integer                  DEFAULT 7,
  "minimum_order_amount" numeric(12,2)            DEFAULT 0,
  "payment_terms"        text                     DEFAULT 'manual'::text,
  "notes"                text,
  "created_by"           uuid,
  "metadata"             jsonb                    DEFAULT '{}'::jsonb,
  "created_at"           timestamp with time zone DEFAULT now(),
  "updated_at"           timestamp with time zone DEFAULT now(),
  CONSTRAINT "suppliers_pkey" PRIMARY KEY (id),
  CONSTRAINT "suppliers_store_id_supplier_key_key" UNIQUE (store_id, supplier_key)
);

ALTER TABLE "public"."suppliers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_followup_tasks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "task_key"       text                     NOT NULL,
  "customer_email" text,
  "order_id"       uuid,
  "support_area"   text                     NOT NULL DEFAULT 'post_purchase'::text,
  "priority"       text                     NOT NULL DEFAULT 'medium'::text,
  "status"         text                     NOT NULL DEFAULT 'open'::text,
  "due_at"         timestamp with time zone,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "support_followup_tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "support_followup_tasks_store_id_task_key_key" UNIQUE (store_id, task_key)
);

ALTER TABLE "public"."support_followup_tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_messages" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "order_id"    uuid,
  "name"        text,
  "email"       text                     NOT NULL,
  "subject"     text,
  "message"     text                     NOT NULL,
  "status"      text                     DEFAULT 'new'::text,
  "source"      text                     DEFAULT 'contact_page'::text,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  "ticket_id"   uuid,
  "priority"    text                     DEFAULT 'normal'::text,
  "assigned_to" uuid,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "support_messages_pkey" PRIMARY KEY (id),
  CONSTRAINT "support_messages_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text, 'spam'::text])))
);

ALTER TABLE "public"."support_messages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_response_templates" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"   uuid,
  "title"      text                     NOT NULL,
  "category"   text                     DEFAULT 'general'::text,
  "body"       text                     NOT NULL,
  "is_active"  boolean                  DEFAULT true,
  "sort_order" integer                  DEFAULT 100,
  "metadata"   jsonb                    DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "support_response_templates_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."support_response_templates"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_retention_followup_automations" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "automation_key"      text                     NOT NULL,
  "workflow_type"       text                     NOT NULL DEFAULT 'post_purchase_support'::text,
  "segment"             text                     NOT NULL DEFAULT 'recent_buyers'::text,
  "trigger_type"        text                     NOT NULL DEFAULT 'support_or_retention_signal'::text,
  "status"              text                     NOT NULL DEFAULT 'active'::text,
  "pending_followups"   integer                  NOT NULL DEFAULT 0,
  "completed_followups" integer                  NOT NULL DEFAULT 0,
  "recommendation"      text,
  "executed_by"         uuid,
  "executed_at"         timestamp with time zone DEFAULT now(),
  "metadata"            jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "support_retention_followup_automati_store_id_automation_key_key" UNIQUE (store_id, automation_key),
  CONSTRAINT "support_retention_followup_automations_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."support_retention_followup_automations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_sla_policies" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"           uuid,
  "name"               text                     NOT NULL,
  "priority"           text                     DEFAULT 'normal'::text,
  "response_minutes"   integer                  DEFAULT 1440,
  "resolution_minutes" integer                  DEFAULT 4320,
  "is_active"          boolean                  DEFAULT true,
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "support_sla_policies_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."support_sla_policies"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_ticket_messages" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "ticket_id"     uuid,
  "actor_user_id" uuid,
  "direction"     text                     DEFAULT 'inbound'::text,
  "body"          text                     NOT NULL,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."support_ticket_messages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_tickets" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "order_id"       uuid,
  "customer_email" text,
  "subject"        text                     NOT NULL DEFAULT 'Customer support request'::text,
  "status"         text                     DEFAULT 'open'::text,
  "priority"       text                     DEFAULT 'normal'::text,
  "channel"        text                     DEFAULT 'web'::text,
  "category"       text                     DEFAULT 'general'::text,
  "sla_due_at"     timestamp with time zone,
  "assigned_to"    uuid,
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."support_tickets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tax_legal_readiness_checks" (
  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"        uuid,
  "check_key"       text                     NOT NULL,
  "area"            text                     NOT NULL DEFAULT 'tax_legal'::text,
  "jurisdiction"    text                     DEFAULT 'MX'::text,
  "status"          text                     DEFAULT 'pending'::text,
  "readiness_score" integer                  DEFAULT 0,
  "risk_level"      text                     DEFAULT 'medium'::text,
  "finding"         text,
  "recommendation"  text,
  "executed_by"     uuid,
  "executed_at"     timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "tax_legal_readiness_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tax_legal_readiness_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."tax_legal_readiness_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."technical_debt_matrix" (
  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"         uuid,
  "debt_key"         text                     NOT NULL,
  "area"             text                     NOT NULL DEFAULT 'platform'::text,
  "severity"         text                     NOT NULL DEFAULT 'medium'::text,
  "status"           text                     NOT NULL DEFAULT 'open'::text,
  "description"      text,
  "business_impact"  text,
  "remediation_plan" text,
  "estimated_effort" text,
  "reviewed_by"      uuid,
  "reviewed_at"      timestamp with time zone,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "technical_debt_matrix_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."technical_debt_matrix"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."traffic_quality_reports" (
  "id"                    uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"              uuid,
  "report_key"            text                     NOT NULL,
  "channel"               text                     NOT NULL DEFAULT 'paid_social'::text,
  "traffic_quality_score" integer                  DEFAULT 0,
  "bounce_rate"           numeric(10,2)            DEFAULT 0,
  "engaged_sessions"      integer                  DEFAULT 0,
  "suspicious_sessions"   integer                  DEFAULT 0,
  "status"                text                     NOT NULL DEFAULT 'measured'::text,
  "recommendation"        text,
  "executed_by"           uuid,
  "executed_at"           timestamp with time zone DEFAULT now(),
  "metadata"              jsonb                    DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone DEFAULT now(),
  "updated_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "traffic_quality_reports_pkey" PRIMARY KEY (id),
  CONSTRAINT "traffic_quality_reports_store_id_report_key_key" UNIQUE (store_id, report_key)
);

ALTER TABLE "public"."traffic_quality_reports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."trust_badges" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid                     NOT NULL,
  "badge_key"   text                     NOT NULL,
  "label"       text                     NOT NULL,
  "description" text,
  "icon"        text,
  "is_visible"  boolean                  DEFAULT true,
  "sort_order"  integer                  DEFAULT 100,
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  "is_active"   boolean                  DEFAULT true,
  CONSTRAINT "trust_badges_pkey" PRIMARY KEY (id),
  CONSTRAINT "trust_badges_store_id_badge_key_key" UNIQUE (store_id, badge_key)
);

ALTER TABLE "public"."trust_badges"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."unit_economics_snapshots" (
  "id"                        uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"                  uuid,
  "snapshot_key"              text                     NOT NULL,
  "aov_cents"                 bigint                   DEFAULT 0,
  "gross_margin_percent"      numeric(10,2)            DEFAULT 0,
  "cac_cents"                 bigint                   DEFAULT 0,
  "ltv_cents"                 bigint                   DEFAULT 0,
  "payback_days"              integer                  DEFAULT 0,
  "contribution_margin_cents" bigint                   DEFAULT 0,
  "status"                    text                     DEFAULT 'generated'::text,
  "recommendation"            text,
  "executed_by"               uuid,
  "executed_at"               timestamp with time zone DEFAULT now(),
  "metadata"                  jsonb                    DEFAULT '{}'::jsonb,
  "created_at"                timestamp with time zone DEFAULT now(),
  "updated_at"                timestamp with time zone DEFAULT now(),
  CONSTRAINT "unit_economics_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "unit_economics_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."unit_economics_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_session_replay_markers" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "marker_key"     text                     NOT NULL,
  "session_id"     text,
  "journey_step"   text                     DEFAULT 'general'::text,
  "marker_type"    text                     DEFAULT 'friction'::text,
  "severity"       text                     DEFAULT 'medium'::text,
  "description"    text,
  "recommendation" text,
  "captured_by"    uuid,
  "captured_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "user_session_replay_markers_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_session_replay_markers_store_id_marker_key_key" UNIQUE (store_id, marker_key)
);

ALTER TABLE "public"."user_session_replay_markers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."users" (
  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "email"              text                     NOT NULL,
  "password_hash"      text,
  "full_name"          text,
  "phone"              text,
  "role"               text                     NOT NULL DEFAULT 'user'::text,
  "addresses"          jsonb                    DEFAULT '[]'::jsonb,
  "shipping_address"   jsonb                    DEFAULT '{}'::jsonb,
  "billing_address"    jsonb                    DEFAULT '{}'::jsonb,
  "verification_token" text,
  "verified_at"        timestamp with time zone,
  "is_verified"        boolean                  DEFAULT false,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "users_email_key" UNIQUE (email),
  CONSTRAINT "users_pkey" PRIMARY KEY (id),
  CONSTRAINT "users_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text, 'owner'::text, 'support'::text])))
);

ALTER TABLE "public"."users"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."utm_sessions" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"      uuid,
  "session_id"    text                     NOT NULL,
  "user_id"       uuid,
  "email"         text,
  "utm_source"    text,
  "utm_medium"    text,
  "utm_campaign"  text,
  "utm_term"      text,
  "utm_content"   text,
  "landing_path"  text,
  "referrer"      text,
  "metadata"      jsonb                    DEFAULT '{}'::jsonb,
  "first_seen_at" timestamp with time zone DEFAULT now(),
  "last_seen_at"  timestamp with time zone DEFAULT now(),
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "utm_sessions_pkey" PRIMARY KEY (id),
  CONSTRAINT "utm_sessions_store_id_session_id_key" UNIQUE (store_id, session_id)
);

ALTER TABLE "public"."utm_sessions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ux_ui_audit_items" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "run_key"        text,
  "item_key"       text                     NOT NULL,
  "area"           text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "evidence"       jsonb                    DEFAULT '{}'::jsonb,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "ux_ui_audit_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "ux_ui_audit_items_store_id_item_key_key" UNIQUE (store_id, item_key)
);

ALTER TABLE "public"."ux_ui_audit_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ux_ui_audit_runs" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"    uuid,
  "run_key"     text                     NOT NULL,
  "status"      text                     NOT NULL DEFAULT 'pending'::text,
  "score"       integer                  DEFAULT 0,
  "scope"       text                     DEFAULT 'full_customer_admin_journey'::text,
  "summary"     text,
  "findings"    jsonb                    DEFAULT '{}'::jsonb,
  "executed_by" uuid,
  "executed_at" timestamp with time zone DEFAULT now(),
  "metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "ux_ui_audit_runs_pkey" PRIMARY KEY (id),
  CONSTRAINT "ux_ui_audit_runs_store_id_run_key_key" UNIQUE (store_id, run_key)
);

ALTER TABLE "public"."ux_ui_audit_runs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."visual_brand_systems" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "brand_key"      text                     NOT NULL,
  "area"           text                     DEFAULT 'brand_identity'::text,
  "status"         text                     DEFAULT 'draft'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "title"          text,
  "description"    text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "visual_brand_systems_pkey" PRIMARY KEY (id),
  CONSTRAINT "visual_brand_systems_store_id_brand_key_key" UNIQUE (store_id, brand_key)
);

ALTER TABLE "public"."visual_brand_systems"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."visual_consistency_checks" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "check_key"      text                     NOT NULL,
  "surface"        text                     DEFAULT 'storefront'::text,
  "status"         text                     DEFAULT 'pending'::text,
  "score"          numeric(6,2)             DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "executed_by"    uuid,
  "executed_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "visual_consistency_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "visual_consistency_checks_store_id_check_key_key" UNIQUE (store_id, check_key)
);

ALTER TABLE "public"."visual_consistency_checks"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."visual_regression_snapshots" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"       uuid,
  "snapshot_key"   text                     NOT NULL,
  "page_path"      text                     NOT NULL,
  "viewport"       text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'baseline'::text,
  "score"          integer                  DEFAULT 0,
  "finding"        text,
  "recommendation" text,
  "captured_by"    uuid,
  "captured_at"    timestamp with time zone DEFAULT now(),
  "metadata"       jsonb                    DEFAULT '{}'::jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "visual_regression_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "visual_regression_snapshots_store_id_snapshot_key_key" UNIQUE (store_id, snapshot_key)
);

ALTER TABLE "public"."visual_regression_snapshots"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."web_push_subscriptions" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "store_id"            uuid,
  "customer_email"      text,
  "endpoint"            text,
  "p256dh"              text,
  "auth"                text,
  "permission_status"   text                     DEFAULT 'default'::text,
  "is_active"           boolean                  DEFAULT true,
  "metadata"            jsonb                    DEFAULT '{}'::jsonb,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  "source"              text                     DEFAULT 'web'::text,
  "user_id"             uuid,
  "device_id"           text,
  "session_id"          text,
  "display_mode"        text                     DEFAULT 'browser'::text,
  "platform"            text                     DEFAULT 'web'::text,
  "browser"             text,
  "os"                  text,
  "app_version"         text,
  "subscription_status" text                     DEFAULT 'active'::text,
  "last_seen_at"        timestamp with time zone DEFAULT now(),
  "revoked_at"          timestamp with time zone,
  CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."web_push_subscriptions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."wishlist_items" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id"    uuid,
  "product_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "wishlist_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "wishlist_items_user_id_product_id_key" UNIQUE (user_id, product_id)
);

ALTER TABLE "public"."wishlist_items"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."_dummy_id_seq" OWNED BY "public"."_dummy"."id";

CREATE OR REPLACE FUNCTION public.claim_abandoned_carts_for_recovery (
  batch_limit integer                  DEFAULT 25,
  lock_token  text                     DEFAULT NULL::text,
  older_than  timestamp with time zone DEFAULT (now() - '02:00:00'::interval)
)
  RETURNS SETOF public.abandoned_carts
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  effective_lock_token TEXT;
BEGIN
  effective_lock_token := COALESCE(NULLIF(lock_token, ''), gen_random_uuid()::text);

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM abandoned_carts
    WHERE reminder_sent = FALSE
      AND email IS NOT NULL
      AND updated_at < older_than
      AND (recovery_locked_until IS NULL OR recovery_locked_until < NOW())
    ORDER BY updated_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(batch_limit, 25), 100))
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE abandoned_carts ac
    SET recovery_lock_id = effective_lock_token,
        recovery_locked_until = NOW() + INTERVAL '15 minutes',
        recovery_attempts = COALESCE(ac.recovery_attempts, 0) + 1,
        recovery_last_attempt_at = NOW(),
        recovery_last_error = NULL
    FROM candidates c
    WHERE ac.id = c.id
    RETURNING ac.*
  )
  SELECT * FROM claimed;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_email_queue_for_delivery (
  batch_limit integer DEFAULT 25,
  lock_token  text    DEFAULT NULL::text
)
  RETURNS SETOF public.email_queue
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  effective_lock_token TEXT;
BEGIN
  effective_lock_token := COALESCE(NULLIF(lock_token, ''), gen_random_uuid()::text);

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM email_queue
    WHERE status = 'queued'
      AND scheduled_for <= NOW()
      AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      AND attempts < max_attempts
      AND (locked_until IS NULL OR locked_until < NOW())
    ORDER BY scheduled_for ASC, created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(batch_limit, 25), 100))
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE email_queue q
    SET status = 'processing',
        locked_by = effective_lock_token,
        locked_until = NOW() + INTERVAL '10 minutes',
        attempts = COALESCE(q.attempts, 0) + 1,
        updated_at = NOW()
    FROM candidates c
    WHERE q.id = c.id
    RETURNING q.*
  )
  SELECT * FROM claimed;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_paid_order (
  order_id_input                 uuid,
  stripe_session_id_input        text,
  stripe_payment_intent_id_input text,
  customer_email_input           text
)
  RETURNS TABLE (
    success      boolean,
    final_status text,
    message      text
  )
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
DECLARE
  locked_order public.orders%ROWTYPE;
  item_record RECORD;
  updated_count INT;
BEGIN
  SELECT * INTO locked_order
  FROM public.orders
  WHERE id = order_id_input
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'missing'::TEXT, 'ORDER_NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  IF locked_order.status IN ('pagado', 'empacado', 'enviado', 'entregado', 'refunded', 'partially_refunded') THEN
    RETURN QUERY SELECT true, locked_order.status::TEXT, 'ORDER_ALREADY_FINALIZED'::TEXT;
    RETURN;
  END IF;

  IF locked_order.status <> 'pendiente' THEN
    RETURN QUERY SELECT false, locked_order.status::TEXT, 'ORDER_NOT_PAYABLE'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = order_id_input) THEN
    UPDATE public.orders
    SET status = 'inventory_exception',
        notes = 'Paid order has no order_items and requires manual reconciliation.',
        stripe_session_id = stripe_session_id_input,
        stripe_payment_intent_id = stripe_payment_intent_id_input,
        customer_email = COALESCE(customer_email_input, customer_email),
        paid_at = COALESCE(paid_at, NOW()),
        updated_at = NOW()
    WHERE id = order_id_input;

    RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'ORDER_HAS_NO_ITEMS'::TEXT;
    RETURN;
  END IF;

  FOR item_record IN
    SELECT oi.product_id, oi.quantity, p.stock, p.name
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = order_id_input
  LOOP
    IF item_record.product_id IS NULL OR item_record.stock IS NULL OR item_record.stock < item_record.quantity THEN
      UPDATE public.orders
      SET status = 'inventory_exception',
          notes = 'Stripe payment confirmed, but stock was insufficient for product ' || COALESCE(item_record.name, item_record.product_id::TEXT),
          stripe_session_id = stripe_session_id_input,
          stripe_payment_intent_id = stripe_payment_intent_id_input,
          customer_email = COALESCE(customer_email_input, customer_email),
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
      WHERE id = order_id_input;

      RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'INSUFFICIENT_STOCK'::TEXT;
      RETURN;
    END IF;
  END LOOP;

  FOR item_record IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = order_id_input
  LOOP
    UPDATE public.products
    SET stock = stock - item_record.quantity,
        updated_at = NOW()
    WHERE id = item_record.product_id
      AND stock >= item_record.quantity;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    IF updated_count = 0 THEN
      UPDATE public.orders
      SET status = 'inventory_exception',
          notes = 'Stripe payment confirmed, but stock decrement failed during finalization.',
          stripe_session_id = stripe_session_id_input,
          stripe_payment_intent_id = stripe_payment_intent_id_input,
          customer_email = COALESCE(customer_email_input, customer_email),
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
      WHERE id = order_id_input;

      RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'STOCK_DECREMENT_FAILED'::TEXT;
      RETURN;
    END IF;

    INSERT INTO public.inventory_movements(product_id, order_id, quantity_delta, reason, notes)
    VALUES(item_record.product_id, order_id_input, item_record.quantity * -1, 'sale', 'Stripe payment confirmed');
  END LOOP;

  IF locked_order.coupon_code IS NOT NULL THEN
    UPDATE public.coupons
    SET current_uses = current_uses + 1,
        updated_at = NOW()
    WHERE code = locked_order.coupon_code
      AND store_id = locked_order.store_id
      AND is_active = true
      AND (max_uses IS NULL OR current_uses < max_uses);
  END IF;

  UPDATE public.orders
  SET status = 'pagado',
      stripe_session_id = stripe_session_id_input,
      stripe_payment_intent_id = stripe_payment_intent_id_input,
      customer_email = COALESCE(customer_email_input, customer_email),
      paid_at = COALESCE(paid_at, NOW()),
      notes = NULL,
      updated_at = NOW()
  WHERE id = order_id_input;

  RETURN QUERY SELECT true, 'pagado'::TEXT, 'ORDER_FINALIZED'::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_ai_commerce_core()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF TG_TABLE_NAME = 'ai_search_queries' THEN
    NEW.query := COALESCE(NULLIF(BTRIM(NEW.query), ''), 'empty search');
    NEW.normalized_query := COALESCE(NULLIF(BTRIM(NEW.normalized_query), ''), LOWER(NEW.query));
    NEW.intent := COALESCE(NULLIF(BTRIM(NEW.intent), ''), 'unknown');
    NEW.intent_score := COALESCE(NEW.intent_score, 0);
    NEW.result_count := COALESCE(NEW.result_count, 0);
    NEW.source := COALESCE(NULLIF(BTRIM(NEW.source), ''), 'web');
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
  ELSIF TG_TABLE_NAME = 'ai_assistant_sessions' THEN
    NEW.status := COALESCE(NULLIF(BTRIM(NEW.status), ''), 'active');
    NEW.channel := COALESCE(NULLIF(BTRIM(NEW.channel), ''), 'web');
    NEW.intent := COALESCE(NULLIF(BTRIM(NEW.intent), ''), 'shopping_assistance');
    NEW.conversion_score := COALESCE(NEW.conversion_score, 0);
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
    NEW.updated_at := NOW();
  ELSIF TG_TABLE_NAME = 'ai_faq_entries' THEN
    NEW.topic := COALESCE(NULLIF(BTRIM(NEW.topic), ''), 'general');
    NEW.keywords := COALESCE(NEW.keywords, ARRAY[]::TEXT[]);
    NEW.is_active := COALESCE(NEW.is_active, TRUE);
    NEW.sort_order := COALESCE(NEW.sort_order, 0);
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
    NEW.updated_at := NOW();
  ELSIF TG_TABLE_NAME = 'skincare_synonyms' THEN
    NEW.term := COALESCE(NULLIF(BTRIM(NEW.term), ''), 'general');
    NEW.synonyms := COALESCE(NEW.synonyms, ARRAY[]::TEXT[]);
    NEW.category := COALESCE(NULLIF(BTRIM(NEW.category), ''), 'skincare');
    NEW.language := COALESCE(NULLIF(BTRIM(NEW.language), ''), 'es');
    NEW.is_active := COALESCE(NEW.is_active, TRUE);
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_campaign_landing_pages_pl24()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.landing_key := COALESCE(NULLIF(BTRIM(NEW.landing_key), ''), NULLIF(BTRIM(NEW.slug), ''), 'landing-' || SUBSTRING(COALESCE(NEW.id, uuid_generate_v4())::text, 1, 8));
  NEW.slug := COALESCE(NULLIF(BTRIM(NEW.slug), ''), NEW.landing_key, 'landing-' || SUBSTRING(COALESCE(NEW.id, uuid_generate_v4())::text, 1, 8));
  NEW.campaign_type := COALESCE(NULLIF(BTRIM(NEW.campaign_type), ''), 'general');
  NEW.status := COALESCE(NULLIF(BTRIM(NEW.status), ''), 'draft');
  NEW.score := COALESCE(NEW.score, 0);
  NEW.headline := COALESCE(NULLIF(BTRIM(NEW.headline), ''), NULLIF(BTRIM(NEW.title), ''), 'Campaign landing page');
  NEW.title := COALESCE(NULLIF(BTRIM(NEW.title), ''), NEW.headline, 'Campaign landing page');
  NEW.subtitle := COALESCE(NULLIF(BTRIM(NEW.subtitle), ''), NULLIF(BTRIM(NEW.value_proposition), ''), 'Landing page preparada para campañas.');
  NEW.primary_cta := COALESCE(NULLIF(BTRIM(NEW.primary_cta), ''), 'Comprar ahora');
  NEW.content := COALESCE(NEW.content, '{}'::jsonb);
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.updated_at := NOW();
  NEW.executed_at := COALESCE(NEW.executed_at, NOW());
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_mobile_app_readiness_checks()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.area := COALESCE(NULLIF(BTRIM(NEW.area), ''), 'mobile_pwa');
  NEW.category := COALESCE(NULLIF(BTRIM(NEW.category), ''), 'readiness');
  NEW.check_key := COALESCE(NULLIF(BTRIM(NEW.check_key), ''), 'check-' || COALESCE(NEW.id::text, uuid_generate_v4()::text));
  NEW.check_name := COALESCE(NULLIF(BTRIM(NEW.check_name), ''), INITCAP(REPLACE(NEW.check_key, '_', ' ')));
  NEW.status := COALESCE(NULLIF(BTRIM(NEW.status), ''), 'pending');
  NEW.severity := COALESCE(NULLIF(BTRIM(NEW.severity), ''), 'medium');
  NEW.priority := COALESCE(NEW.priority, 0);
  NEW.score := COALESCE(NEW.score, CASE WHEN NEW.status = 'pass' THEN 100 WHEN NEW.status = 'warning' THEN 60 WHEN NEW.status = 'fail' THEN 0 ELSE 0 END);
  NEW.passed := COALESCE(NEW.passed, NEW.status = 'pass');
  NEW.recommendation := COALESCE(NEW.recommendation, 'Revisar este punto dentro del readiness móvil/PWA.');
  NEW.details := COALESCE(NEW.details, '{}'::jsonb);
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
  NEW.checked_at := COALESCE(NEW.checked_at, NOW());
  NEW.executed_at := COALESCE(NEW.executed_at, NEW.checked_at, NOW());
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pl26_set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pl27_set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pl28_set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pl29_set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_order_status_timeline_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_timeline(
      order_id,
      actor_user_id,
      event_type,
      from_status,
      to_status,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      NULL,
      'status_changed_trigger',
      OLD.status,
      NEW.status,
      jsonb_build_object('source', '005_storefront_customer_experience_and_timeline'),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restock_refunded_order (
  order_id_input uuid
)
  RETURNS TABLE (
    success boolean,
    message text
  )
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_updated_count INT;
  v_has_items BOOLEAN := false;
BEGIN
  IF order_id_input IS NULL THEN
    RAISE EXCEPTION 'INVALID_ORDER: order_id_input cannot be null';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = order_id_input
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: order % does not exist', order_id_input;
  END IF;

  -- Idempotency check: if order has already been restocked, no-op and return ALREADY_RESTOCKED
  IF v_order.inventory_restocked_at IS NOT NULL THEN
    RETURN QUERY SELECT true, 'ALREADY_RESTOCKED'::TEXT;
    RETURN;
  END IF;

  -- Order must be in 'refunded' status to restock
  IF v_order.status <> 'refunded' THEN
    RAISE EXCEPTION 'ORDER_NOT_REFUNDED: order % has status % but must be refunded', order_id_input, v_order.status;
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = order_id_input
  LOOP
    v_has_items := true;

    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ORDER_ITEM: null product_id encountered in order %', order_id_input;
    END IF;

    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_ORDER_ITEM_QUANTITY: invalid quantity % for product % in order %',
        v_item.quantity, v_item.product_id, order_id_input;
    END IF;

    UPDATE public.products
    SET stock = stock + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN
      RAISE EXCEPTION 'PRODUCT_UPDATE_FAILED: expected to update 1 product row for %, updated %',
        v_item.product_id, v_updated_count;
    END IF;

    INSERT INTO public.inventory_movements(
      product_id,
      order_id,
      quantity_delta,
      reason,
      notes
    )
    VALUES(
      v_item.product_id,
      order_id_input,
      v_item.quantity,
      'refund',
      'Full order refund restock'
    );
  END LOOP;

  IF NOT v_has_items THEN
    RAISE EXCEPTION 'ORDER_HAS_NO_ITEMS: order % has no items to restock', order_id_input;
  END IF;

  UPDATE public.orders
  SET inventory_restocked_at = NOW(),
      updated_at = NOW()
  WHERE id = order_id_input;

  RETURN QUERY SELECT true, 'ORDER_RESTOCKED'::TEXT;
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at_macro_final_a()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_customer_segments_slug()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.segment_key := COALESCE(
    NEW.segment_key,
    LOWER(REGEXP_REPLACE(COALESCE(NEW.name, 'customer-segment'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 8)
  );

  NEW.slug := COALESCE(
    NEW.slug,
    NEW.segment_key,
    LOWER(REGEXP_REPLACE(COALESCE(NEW.name, 'customer-segment'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 8)
  );

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."ab_test_variants"
  ADD CONSTRAINT "ab_test_variants_test_id_fkey" FOREIGN KEY (test_id) REFERENCES public.ab_tests(id) ON DELETE CASCADE;

ALTER TABLE "public"."abandoned_cart_recovery_events"
  ADD CONSTRAINT "abandoned_cart_recovery_events_abandoned_cart_id_fkey" FOREIGN KEY (abandoned_cart_id) REFERENCES public.abandoned_carts(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_role_permissions"
  ADD CONSTRAINT "admin_role_permissions_permission_id_fkey" FOREIGN KEY (permission_id) REFERENCES public.admin_permissions(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_role_permissions"
  ADD CONSTRAINT "admin_role_permissions_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_team_members"
  ADD CONSTRAINT "admin_team_members_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_work_queues"
  ADD CONSTRAINT "admin_work_queues_owner_role_id_fkey" FOREIGN KEY (owner_role_id) REFERENCES public.admin_roles(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_work_queue_items"
  ADD CONSTRAINT "admin_work_queue_items_queue_id_fkey" FOREIGN KEY (queue_id) REFERENCES public.admin_work_queues(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_assistant_messages"
  ADD CONSTRAINT "ai_assistant_messages_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.ai_assistant_sessions(id) ON DELETE CASCADE;

ALTER TABLE "public"."ai_faq_interactions"
  ADD CONSTRAINT "ai_faq_interactions_faq_entry_id_fkey" FOREIGN KEY (faq_entry_id) REFERENCES public.ai_faq_entries(id) ON DELETE SET NULL;

ALTER TABLE "public"."automation_runs"
  ADD CONSTRAINT "automation_runs_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.automation_jobs(id) ON DELETE SET NULL;

ALTER TABLE "public"."automation_executions"
  ADD CONSTRAINT "automation_executions_trigger_id_fkey" FOREIGN KEY (trigger_id) REFERENCES public.automation_triggers(id) ON DELETE SET NULL;

ALTER TABLE "public"."catalog_import_rows"
  ADD CONSTRAINT "catalog_import_rows_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.catalog_import_batches(id) ON DELETE CASCADE;

ALTER TABLE "public"."campaign_attribution"
  ADD CONSTRAINT "campaign_attribution_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_events"
  ADD CONSTRAINT "conversion_events_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL;

ALTER TABLE "public"."commercial_campaigns"
  ADD CONSTRAINT "commercial_campaigns_coupon_id_fkey" FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE "public"."automation_executions"
  ADD CONSTRAINT "automation_executions_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_loyalty_accounts"
  ADD CONSTRAINT "customer_loyalty_accounts_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_loyalty_transactions"
  ADD CONSTRAINT "customer_loyalty_transactions_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_notification_events"
  ADD CONSTRAINT "customer_notification_events_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_personalization_events"
  ADD CONSTRAINT "customer_personalization_events_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_preferences"
  ADD CONSTRAINT "customer_preferences_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_rebuy_lists"
  ADD CONSTRAINT "customer_rebuy_lists_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_recommendations"
  ADD CONSTRAINT "customer_recommendations_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_subscriptions"
  ADD CONSTRAINT "customer_subscriptions_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_touchpoints"
  ADD CONSTRAINT "customer_touchpoints_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.crm_contacts(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_wallet_items"
  ADD CONSTRAINT "customer_wallet_items_customer_profile_id_fkey" FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."email_delivery_attempts"
  ADD CONSTRAINT "email_delivery_attempts_queue_id_fkey" FOREIGN KEY (queue_id) REFERENCES public.email_queue(id) ON DELETE CASCADE;

ALTER TABLE "public"."external_order_items"
  ADD CONSTRAINT "external_order_items_external_order_id_fkey" FOREIGN KEY (external_order_id) REFERENCES public.external_orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."finance_reconciliation_items"
  ADD CONSTRAINT "finance_reconciliation_items_run_id_fkey" FOREIGN KEY (run_id) REFERENCES public.finance_reconciliation_runs(id) ON DELETE CASCADE;

ALTER TABLE "public"."fulfillment_queue"
  ADD CONSTRAINT "fulfillment_queue_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.fulfillment_batches(id) ON DELETE SET NULL;

ALTER TABLE "public"."automation_executions"
  ADD CONSTRAINT "automation_executions_journey_id_fkey" FOREIGN KEY (journey_id) REFERENCES public.lifecycle_journeys(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_touchpoints"
  ADD CONSTRAINT "customer_touchpoints_journey_id_fkey" FOREIGN KEY (journey_id) REFERENCES public.lifecycle_journeys(id) ON DELETE SET NULL;

ALTER TABLE "public"."journey_steps"
  ADD CONSTRAINT "journey_steps_journey_id_fkey" FOREIGN KEY (journey_id) REFERENCES public.lifecycle_journeys(id) ON DELETE CASCADE;

ALTER TABLE "public"."marketing_events"
  ADD CONSTRAINT "marketing_events_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL;

ALTER TABLE "public"."monthly_operations_checklist_items"
  ADD CONSTRAINT "monthly_operations_checklist_items_checklist_id_fkey" FOREIGN KEY (checklist_id) REFERENCES public.monthly_operations_checklists(id) ON DELETE CASCADE;

ALTER TABLE "public"."accounting_adjustments"
  ADD CONSTRAINT "accounting_adjustments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."ad_platform_events"
  ADD CONSTRAINT "ad_platform_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."campaign_attribution"
  ADD CONSTRAINT "campaign_attribution_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."complaints_returns_cases"
  ADD CONSTRAINT "complaints_returns_cases_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_events"
  ADD CONSTRAINT "conversion_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_loyalty_transactions"
  ADD CONSTRAINT "customer_loyalty_transactions_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_rebuy_lists"
  ADD CONSTRAINT "customer_rebuy_lists_source_order_id_fkey" FOREIGN KEY (source_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_service_notes"
  ADD CONSTRAINT "customer_service_notes_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_touchpoints"
  ADD CONSTRAINT "customer_touchpoints_related_order_id_fkey" FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."email_events"
  ADD CONSTRAINT "email_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."finance_reconciliation_items"
  ADD CONSTRAINT "finance_reconciliation_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."fulfillment_queue"
  ADD CONSTRAINT "fulfillment_queue_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."inventory_movements"
  ADD CONSTRAINT "inventory_movements_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."lifecycle_events"
  ADD CONSTRAINT "lifecycle_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."marketing_events"
  ADD CONSTRAINT "marketing_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_checkout_events"
  ADD CONSTRAINT "mobile_checkout_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."order_incidents"
  ADD CONSTRAINT "order_incidents_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."order_items"
  ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."order_timeline"
  ADD CONSTRAINT "order_timeline_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."paid_traffic_campaigns"
  ADD CONSTRAINT "paid_traffic_campaigns_commercial_campaign_id_fkey" FOREIGN KEY (commercial_campaign_id) REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL;

ALTER TABLE "public"."campaign_landing_pages"
  ADD CONSTRAINT "campaign_landing_pages_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.paid_traffic_campaigns(id) ON DELETE SET NULL;

ALTER TABLE "public"."permission_review_items"
  ADD CONSTRAINT "permission_review_items_run_id_fkey" FOREIGN KEY (run_id) REFERENCES public.permission_review_runs(id) ON DELETE CASCADE;

ALTER TABLE "public"."ad_platform_events"
  ADD CONSTRAINT "ad_platform_events_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_product_discovery_events"
  ADD CONSTRAINT "ai_product_discovery_events_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_recommendation_events"
  ADD CONSTRAINT "ai_recommendation_events_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_search_queries"
  ADD CONSTRAINT "ai_search_queries_clicked_product_id_fkey" FOREIGN KEY (clicked_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."catalog_import_rows"
  ADD CONSTRAINT "catalog_import_rows_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_inventory_snapshots"
  ADD CONSTRAINT "channel_inventory_snapshots_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversion_events"
  ADD CONSTRAINT "conversion_events_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_personalization_events"
  ADD CONSTRAINT "customer_personalization_events_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_rebuy_lists"
  ADD CONSTRAINT "customer_rebuy_lists_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_recommendations"
  ADD CONSTRAINT "customer_recommendations_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_subscriptions"
  ADD CONSTRAINT "customer_subscriptions_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."external_order_items"
  ADD CONSTRAINT "external_order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."inventory_movements"
  ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."inventory_planning_snapshots"
  ADD CONSTRAINT "inventory_planning_snapshots_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."marketing_events"
  ADD CONSTRAINT "marketing_events_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."order_items"
  ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."product_media_assets"
  ADD CONSTRAINT "product_media_assets_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."product_publish_checks"
  ADD CONSTRAINT "product_publish_checks_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."projected_stock_alerts"
  ADD CONSTRAINT "projected_stock_alerts_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."purchase_order_items"
  ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."purchase_order_items"
  ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."returns_requests"
  ADD CONSTRAINT "returns_requests_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_requests"
  ADD CONSTRAINT "review_requests_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_inventory_snapshots"
  ADD CONSTRAINT "channel_inventory_snapshots_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_performance_snapshots"
  ADD CONSTRAINT "channel_performance_snapshots_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_pricing_rules"
  ADD CONSTRAINT "channel_pricing_rules_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_product_feeds"
  ADD CONSTRAINT "channel_product_feeds_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_sync_events"
  ADD CONSTRAINT "channel_sync_events_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE SET NULL;

ALTER TABLE "public"."external_orders"
  ADD CONSTRAINT "external_orders_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE SET NULL;

ALTER TABLE "public"."ab_experiment_definitions"
  ADD CONSTRAINT "ab_experiment_definitions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ab_experiment_variants"
  ADD CONSTRAINT "ab_experiment_variants_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ab_test_prioritization_items"
  ADD CONSTRAINT "ab_test_prioritization_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."ab_tests"
  ADD CONSTRAINT "ab_tests_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."abandoned_cart_recovery_events"
  ADD CONSTRAINT "abandoned_cart_recovery_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."abuse_detection_events"
  ADD CONSTRAINT "abuse_detection_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."accessibility_validation_items"
  ADD CONSTRAINT "accessibility_validation_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."accounting_adjustments"
  ADD CONSTRAINT "accounting_adjustments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."ad_platform_events"
  ADD CONSTRAINT "ad_platform_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_action_trails"
  ADD CONSTRAINT "admin_action_trails_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_assignments"
  ADD CONSTRAINT "admin_assignments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_bulk_action_runs"
  ADD CONSTRAINT "admin_bulk_action_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_dashboard_views"
  ADD CONSTRAINT "admin_dashboard_views_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_endpoint_optimization_checks"
  ADD CONSTRAINT "admin_endpoint_optimization_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_notifications"
  ADD CONSTRAINT "admin_notifications_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_roles"
  ADD CONSTRAINT "admin_roles_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_team_members"
  ADD CONSTRAINT "admin_team_members_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_ux_checks"
  ADD CONSTRAINT "admin_ux_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_work_queue_items"
  ADD CONSTRAINT "admin_work_queue_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_work_queues"
  ADD CONSTRAINT "admin_work_queues_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."ads_api_sync_events"
  ADD CONSTRAINT "ads_api_sync_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_assistant_messages"
  ADD CONSTRAINT "ai_assistant_messages_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_assistant_sessions"
  ADD CONSTRAINT "ai_assistant_sessions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_faq_entries"
  ADD CONSTRAINT "ai_faq_entries_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_faq_interactions"
  ADD CONSTRAINT "ai_faq_interactions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_intent_scores"
  ADD CONSTRAINT "ai_intent_scores_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_product_discovery_events"
  ADD CONSTRAINT "ai_product_discovery_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_recommendation_events"
  ADD CONSTRAINT "ai_recommendation_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_recommendation_rules"
  ADD CONSTRAINT "ai_recommendation_rules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_search_insight_snapshots"
  ADD CONSTRAINT "ai_search_insight_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_search_queries"
  ADD CONSTRAINT "ai_search_queries_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."analytics_destination_events"
  ADD CONSTRAINT "analytics_destination_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."automation_executions"
  ADD CONSTRAINT "automation_executions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."automation_jobs"
  ADD CONSTRAINT "automation_jobs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."automation_runs"
  ADD CONSTRAINT "automation_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."automation_triggers"
  ADD CONSTRAINT "automation_triggers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."board_investor_reporting_packets"
  ADD CONSTRAINT "board_investor_reporting_packets_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_command_center_reports"
  ADD CONSTRAINT "business_command_center_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_intelligence_insights"
  ADD CONSTRAINT "business_intelligence_insights_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."cac_roas_measurements"
  ADD CONSTRAINT "cac_roas_measurements_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."cache_metrics"
  ADD CONSTRAINT "cache_metrics_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."campaign_adjustment_items"
  ADD CONSTRAINT "campaign_adjustment_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."campaign_attribution"
  ADD CONSTRAINT "campaign_attribution_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."campaign_followup_automations"
  ADD CONSTRAINT "campaign_followup_automations_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."campaign_iteration_records"
  ADD CONSTRAINT "campaign_iteration_records_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."campaign_landing_pages"
  ADD CONSTRAINT "campaign_landing_pages_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."campaign_orchestration_events"
  ADD CONSTRAINT "campaign_orchestration_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."catalog_import_batches"
  ADD CONSTRAINT "catalog_import_batches_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."category_collections"
  ADD CONSTRAINT "category_collections_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."cdp_segment_memberships"
  ADD CONSTRAINT "cdp_segment_memberships_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_behavior_analytics"
  ADD CONSTRAINT "channel_behavior_analytics_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_campaign_comparison_reports"
  ADD CONSTRAINT "channel_campaign_comparison_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_inventory_snapshots"
  ADD CONSTRAINT "channel_inventory_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_performance_snapshots"
  ADD CONSTRAINT "channel_performance_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_pricing_rules"
  ADD CONSTRAINT "channel_pricing_rules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_product_feeds"
  ADD CONSTRAINT "channel_product_feeds_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."channel_sync_events"
  ADD CONSTRAINT "channel_sync_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."checkout_live_monitoring_events"
  ADD CONSTRAINT "checkout_live_monitoring_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."checkout_optimization_events"
  ADD CONSTRAINT "checkout_optimization_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."checkout_ux_checks"
  ADD CONSTRAINT "checkout_ux_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."commercial_bottleneck_reports"
  ADD CONSTRAINT "commercial_bottleneck_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."commercial_campaigns"
  ADD CONSTRAINT "commercial_campaigns_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."commercial_technical_alert_rules"
  ADD CONSTRAINT "commercial_technical_alert_rules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."complaints_returns_cases"
  ADD CONSTRAINT "complaints_returns_cases_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."compliance_exports"
  ADD CONSTRAINT "compliance_exports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."compliance_operations_snapshots"
  ADD CONSTRAINT "compliance_operations_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."continuous_improvement_reports"
  ADD CONSTRAINT "continuous_improvement_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."controlled_marketing_launches"
  ADD CONSTRAINT "controlled_marketing_launches_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversion_events"
  ADD CONSTRAINT "conversion_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversion_learning_results"
  ADD CONSTRAINT "conversion_learning_results_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_optimization_experiments"
  ADD CONSTRAINT "conversion_optimization_experiments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversion_trust_checks"
  ADD CONSTRAINT "conversion_trust_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."cost_snapshots"
  ADD CONSTRAINT "cost_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."coupons"
  ADD CONSTRAINT "coupons_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."crm_contacts"
  ADD CONSTRAINT "crm_contacts_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."crm_segments"
  ADD CONSTRAINT "crm_segments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_data_platform_profiles"
  ADD CONSTRAINT "customer_data_platform_profiles_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_journey_checks"
  ADD CONSTRAINT "customer_journey_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_loyalty_accounts"
  ADD CONSTRAINT "customer_loyalty_accounts_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_loyalty_transactions"
  ADD CONSTRAINT "customer_loyalty_transactions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_metrics"
  ADD CONSTRAINT "customer_metrics_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_notification_events"
  ADD CONSTRAINT "customer_notification_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_personalization_events"
  ADD CONSTRAINT "customer_personalization_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_profiles"
  ADD CONSTRAINT "customer_profiles_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_rebuy_lists"
  ADD CONSTRAINT "customer_rebuy_lists_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_recommendations"
  ADD CONSTRAINT "customer_recommendations_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_satisfaction_measurements"
  ADD CONSTRAINT "customer_satisfaction_measurements_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_segments"
  ADD CONSTRAINT "customer_segments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_service_notes"
  ADD CONSTRAINT "customer_service_notes_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_subscriptions"
  ADD CONSTRAINT "customer_subscriptions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_success_snapshots"
  ADD CONSTRAINT "customer_success_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_touchpoints"
  ADD CONSTRAINT "customer_touchpoints_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."customer_wallet_items"
  ADD CONSTRAINT "customer_wallet_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."daily_commercial_health_checks"
  ADD CONSTRAINT "daily_commercial_health_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."daily_technical_health_checks"
  ADD CONSTRAINT "daily_technical_health_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."data_retention_jobs"
  ADD CONSTRAINT "data_retention_jobs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."email_events"
  ADD CONSTRAINT "email_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."email_provider_sync_events"
  ADD CONSTRAINT "email_provider_sync_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."endpoint_performance_snapshots"
  ADD CONSTRAINT "endpoint_performance_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."enterprise_security_audit_events"
  ADD CONSTRAINT "enterprise_security_audit_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."executive_decision_priorities"
  ADD CONSTRAINT "executive_decision_priorities_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."executive_kpi_snapshots"
  ADD CONSTRAINT "executive_kpi_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."executive_workflow_automations"
  ADD CONSTRAINT "executive_workflow_automations_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."experiment_decision_records"
  ADD CONSTRAINT "experiment_decision_records_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."external_integration_connections"
  ADD CONSTRAINT "external_integration_connections_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."external_orders"
  ADD CONSTRAINT "external_orders_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."final_commercial_assessments"
  ADD CONSTRAINT "final_commercial_assessments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."final_scale_reports"
  ADD CONSTRAINT "final_scale_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."final_technical_assessments"
  ADD CONSTRAINT "final_technical_assessments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."finance_daily_closes"
  ADD CONSTRAINT "finance_daily_closes_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."finance_exports"
  ADD CONSTRAINT "finance_exports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."finance_reconciliation_items"
  ADD CONSTRAINT "finance_reconciliation_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."finance_reconciliation_runs"
  ADD CONSTRAINT "finance_reconciliation_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."financial_forecast_snapshots"
  ADD CONSTRAINT "financial_forecast_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."frontend_polish_tasks"
  ADD CONSTRAINT "frontend_polish_tasks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."fulfillment_batches"
  ADD CONSTRAINT "fulfillment_batches_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."fulfillment_queue"
  ADD CONSTRAINT "fulfillment_queue_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."full_funnel_analytics_snapshots"
  ADD CONSTRAINT "full_funnel_analytics_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."growth_iteration_loop_actions"
  ADD CONSTRAINT "growth_iteration_loop_actions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."internationalization_locales"
  ADD CONSTRAINT "internationalization_locales_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."inventory_demand_forecasts"
  ADD CONSTRAINT "inventory_demand_forecasts_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."inventory_planning_snapshots"
  ADD CONSTRAINT "inventory_planning_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."investment_scaling_decisions"
  ADD CONSTRAINT "investment_scaling_decisions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."investor_readiness_checks"
  ADD CONSTRAINT "investor_readiness_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."journey_steps"
  ADD CONSTRAINT "journey_steps_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."landing_page_conversion_checks"
  ADD CONSTRAINT "landing_page_conversion_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."landing_sections"
  ADD CONSTRAINT "landing_sections_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."lifecycle_events"
  ADD CONSTRAINT "lifecycle_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."lifecycle_journeys"
  ADD CONSTRAINT "lifecycle_journeys_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."live_operations_snapshots"
  ADD CONSTRAINT "live_operations_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."load_test_scenarios"
  ADD CONSTRAINT "load_test_scenarios_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."localized_content_items"
  ADD CONSTRAINT "localized_content_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."maintenance_mode_controls"
  ADD CONSTRAINT "maintenance_mode_controls_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."marketing_events"
  ADD CONSTRAINT "marketing_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."marketing_launch_readiness_checks"
  ADD CONSTRAINT "marketing_launch_readiness_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."merchandising_rules"
  ADD CONSTRAINT "merchandising_rules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."mobile_app_readiness_checks"
  ADD CONSTRAINT "mobile_app_readiness_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_checkout_events"
  ADD CONSTRAINT "mobile_checkout_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_install_events"
  ADD CONSTRAINT "mobile_install_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_offline_catalog_snapshots"
  ADD CONSTRAINT "mobile_offline_catalog_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_performance_snapshots"
  ADD CONSTRAINT "mobile_performance_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_pwa_sessions"
  ADD CONSTRAINT "mobile_pwa_sessions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_retention_events"
  ADD CONSTRAINT "mobile_retention_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_touch_optimization_events"
  ADD CONSTRAINT "mobile_touch_optimization_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_ux_validation_events"
  ADD CONSTRAINT "mobile_ux_validation_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."monthly_operations_checklists"
  ADD CONSTRAINT "monthly_operations_checklists_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."multi_currency_settings"
  ADD CONSTRAINT "multi_currency_settings_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."newsletter_subscribers"
  ADD CONSTRAINT "newsletter_subscribers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."nps_csat_surveys"
  ADD CONSTRAINT "nps_csat_surveys_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."operating_cost_summaries"
  ADD CONSTRAINT "operating_cost_summaries_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."operating_system_review_runs"
  ADD CONSTRAINT "operating_system_review_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."operational_anomaly_events"
  ADD CONSTRAINT "operational_anomaly_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."operational_events"
  ADD CONSTRAINT "operational_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."order_incidents"
  ADD CONSTRAINT "order_incidents_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."outbound_webhook_deliveries"
  ADD CONSTRAINT "outbound_webhook_deliveries_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."paid_traffic_campaign_runs"
  ADD CONSTRAINT "paid_traffic_campaign_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."paid_traffic_campaigns"
  ADD CONSTRAINT "paid_traffic_campaigns_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."performance_test_runs"
  ADD CONSTRAINT "performance_test_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."permission_review_items"
  ADD CONSTRAINT "permission_review_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."permission_review_runs"
  ADD CONSTRAINT "permission_review_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."personalization_profiles"
  ADD CONSTRAINT "personalization_profiles_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."post_purchase_email_optimizations"
  ADD CONSTRAINT "post_purchase_email_optimizations_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."post_purchase_experience_checks"
  ADD CONSTRAINT "post_purchase_experience_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."proactive_operations_reports"
  ADD CONSTRAINT "proactive_operations_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."product_feeds"
  ADD CONSTRAINT "product_feeds_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."product_publish_checks"
  ADD CONSTRAINT "product_publish_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."product_v2_roadmap_items"
  ADD CONSTRAINT "product_v2_roadmap_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."products"
  ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."projected_stock_alerts"
  ADD CONSTRAINT "projected_stock_alerts_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."public_content_pages"
  ADD CONSTRAINT "public_content_pages_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."purchase_orders"
  ADD CONSTRAINT "purchase_orders_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."query_profile_events"
  ADD CONSTRAINT "query_profile_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."railway_optimization_checks"
  ADD CONSTRAINT "railway_optimization_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."real_sales_measurements"
  ADD CONSTRAINT "real_sales_measurements_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."recommendation_engine_rules"
  ADD CONSTRAINT "recommendation_engine_rules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."recommendation_events"
  ADD CONSTRAINT "recommendation_events_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."recurring_customer_conversion_reports"
  ADD CONSTRAINT "recurring_customer_conversion_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."recurring_review_schedules"
  ADD CONSTRAINT "recurring_review_schedules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."repeat_purchase_measurements"
  ADD CONSTRAINT "repeat_purchase_measurements_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."resource_usage_alerts"
  ADD CONSTRAINT "resource_usage_alerts_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."retention_activation_runs"
  ADD CONSTRAINT "retention_activation_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."returns_requests"
  ADD CONSTRAINT "returns_requests_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."revenue_conversion_risk_notifications"
  ADD CONSTRAINT "revenue_conversion_risk_notifications_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."revenue_snapshots"
  ADD CONSTRAINT "revenue_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."revenue_validation_snapshots"
  ADD CONSTRAINT "revenue_validation_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."review_requests"
  ADD CONSTRAINT "review_requests_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."risk_cost_control_snapshots"
  ADD CONSTRAINT "risk_cost_control_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."sales_channels"
  ADD CONSTRAINT "sales_channels_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."scale_capacity_assessments"
  ADD CONSTRAINT "scale_capacity_assessments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."scale_decision_records"
  ADD CONSTRAINT "scale_decision_records_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."scale_governance_freeze_records"
  ADD CONSTRAINT "scale_governance_freeze_records_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."scheduled_report_definitions"
  ADD CONSTRAINT "scheduled_report_definitions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."scheduled_report_runs"
  ADD CONSTRAINT "scheduled_report_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."security_hardening_checks"
  ADD CONSTRAINT "security_hardening_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."sensitive_action_approvals"
  ADD CONSTRAINT "sensitive_action_approvals_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."skincare_synonyms"
  ADD CONSTRAINT "skincare_synonyms_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."slow_query_reports"
  ADD CONSTRAINT "slow_query_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."strategic_risk_matrix"
  ADD CONSTRAINT "strategic_risk_matrix_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."strategic_roadmap_items"
  ADD CONSTRAINT "strategic_roadmap_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."supabase_optimization_checks"
  ADD CONSTRAINT "supabase_optimization_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_catalog_items"
  ADD CONSTRAINT "supplier_catalog_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_catalog_items"
  ADD CONSTRAINT "supplier_catalog_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_lead_time_logs"
  ADD CONSTRAINT "supplier_lead_time_logs_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_lead_time_logs"
  ADD CONSTRAINT "supplier_lead_time_logs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_margin_snapshots"
  ADD CONSTRAINT "supplier_margin_snapshots_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_margin_snapshots"
  ADD CONSTRAINT "supplier_margin_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_product_costs"
  ADD CONSTRAINT "supplier_product_costs_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_product_costs"
  ADD CONSTRAINT "supplier_product_costs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_replenishment_suggestions"
  ADD CONSTRAINT "supplier_replenishment_suggestions_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_replenishment_suggestions"
  ADD CONSTRAINT "supplier_replenishment_suggestions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."inventory_planning_snapshots"
  ADD CONSTRAINT "inventory_planning_snapshots_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."projected_stock_alerts"
  ADD CONSTRAINT "projected_stock_alerts_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."purchase_order_items"
  ADD CONSTRAINT "purchase_order_items_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."purchase_orders"
  ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_catalog_items"
  ADD CONSTRAINT "supplier_catalog_items_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_lead_time_logs"
  ADD CONSTRAINT "supplier_lead_time_logs_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_margin_snapshots"
  ADD CONSTRAINT "supplier_margin_snapshots_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_product_costs"
  ADD CONSTRAINT "supplier_product_costs_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE "public"."supplier_replenishment_suggestions"
  ADD CONSTRAINT "supplier_replenishment_suggestions_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."suppliers"
  ADD CONSTRAINT "suppliers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."support_followup_tasks"
  ADD CONSTRAINT "support_followup_tasks_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_followup_tasks"
  ADD CONSTRAINT "support_followup_tasks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."support_messages"
  ADD CONSTRAINT "support_messages_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_messages"
  ADD CONSTRAINT "support_messages_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_response_templates"
  ADD CONSTRAINT "support_response_templates_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."support_retention_followup_automations"
  ADD CONSTRAINT "support_retention_followup_automations_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."support_sla_policies"
  ADD CONSTRAINT "support_sla_policies_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."support_tickets"
  ADD CONSTRAINT "support_tickets_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_messages"
  ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE "public"."support_tickets"
  ADD CONSTRAINT "support_tickets_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."tax_legal_readiness_checks"
  ADD CONSTRAINT "tax_legal_readiness_checks_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."technical_debt_matrix"
  ADD CONSTRAINT "technical_debt_matrix_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."traffic_quality_reports"
  ADD CONSTRAINT "traffic_quality_reports_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."trust_badges"
  ADD CONSTRAINT "trust_badges_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."unit_economics_snapshots"
  ADD CONSTRAINT "unit_economics_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."ab_experiment_definitions"
  ADD CONSTRAINT "ab_experiment_definitions_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ab_experiment_variants"
  ADD CONSTRAINT "ab_experiment_variants_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ab_test_prioritization_items"
  ADD CONSTRAINT "ab_test_prioritization_items_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."abandoned_carts"
  ADD CONSTRAINT "abandoned_carts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."abuse_detection_events"
  ADD CONSTRAINT "abuse_detection_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."accessibility_validation_items"
  ADD CONSTRAINT "accessibility_validation_items_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."accounting_adjustments"
  ADD CONSTRAINT "accounting_adjustments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_action_trails"
  ADD CONSTRAINT "admin_action_trails_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_assignments"
  ADD CONSTRAINT "admin_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_assignments"
  ADD CONSTRAINT "admin_assignments_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_bulk_action_runs"
  ADD CONSTRAINT "admin_bulk_action_runs_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_endpoint_optimization_checks"
  ADD CONSTRAINT "admin_endpoint_optimization_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_notifications"
  ADD CONSTRAINT "admin_notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_team_members"
  ADD CONSTRAINT "admin_team_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."admin_ux_checks"
  ADD CONSTRAINT "admin_ux_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."admin_work_queue_items"
  ADD CONSTRAINT "admin_work_queue_items_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."advanced_admin_audit_entries"
  ADD CONSTRAINT "advanced_admin_audit_entries_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_assistant_sessions"
  ADD CONSTRAINT "ai_assistant_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_product_discovery_events"
  ADD CONSTRAINT "ai_product_discovery_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_recommendation_events"
  ADD CONSTRAINT "ai_recommendation_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ai_search_queries"
  ADD CONSTRAINT "ai_search_queries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."audit_logs"
  ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."automation_executions"
  ADD CONSTRAINT "automation_executions_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."automation_triggers"
  ADD CONSTRAINT "automation_triggers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."board_investor_reporting_packets"
  ADD CONSTRAINT "board_investor_reporting_packets_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."business_command_center_reports"
  ADD CONSTRAINT "business_command_center_reports_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."business_intelligence_insights"
  ADD CONSTRAINT "business_intelligence_insights_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."cache_metrics"
  ADD CONSTRAINT "cache_metrics_analyzed_by_fkey" FOREIGN KEY (analyzed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."campaign_followup_automations"
  ADD CONSTRAINT "campaign_followup_automations_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."campaign_iteration_records"
  ADD CONSTRAINT "campaign_iteration_records_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."campaign_orchestration_events"
  ADD CONSTRAINT "campaign_orchestration_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."catalog_import_batches"
  ADD CONSTRAINT "catalog_import_batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_behavior_analytics"
  ADD CONSTRAINT "channel_behavior_analytics_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_campaign_comparison_reports"
  ADD CONSTRAINT "channel_campaign_comparison_reports_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."channel_product_feeds"
  ADD CONSTRAINT "channel_product_feeds_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."checkout_ux_checks"
  ADD CONSTRAINT "checkout_ux_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."commercial_bottleneck_reports"
  ADD CONSTRAINT "commercial_bottleneck_reports_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."commercial_technical_alert_rules"
  ADD CONSTRAINT "commercial_technical_alert_rules_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."complaints_returns_cases"
  ADD CONSTRAINT "complaints_returns_cases_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."compliance_exports"
  ADD CONSTRAINT "compliance_exports_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."continuous_improvement_reports"
  ADD CONSTRAINT "continuous_improvement_reports_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_events"
  ADD CONSTRAINT "conversion_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_learning_results"
  ADD CONSTRAINT "conversion_learning_results_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_optimization_experiments"
  ADD CONSTRAINT "conversion_optimization_experiments_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."conversion_trust_checks"
  ADD CONSTRAINT "conversion_trust_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."cost_snapshots"
  ADD CONSTRAINT "cost_snapshots_captured_by_fkey" FOREIGN KEY (captured_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."crm_contacts"
  ADD CONSTRAINT "crm_contacts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."crm_segments"
  ADD CONSTRAINT "crm_segments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_journey_checks"
  ADD CONSTRAINT "customer_journey_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_profiles"
  ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_satisfaction_measurements"
  ADD CONSTRAINT "customer_satisfaction_measurements_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_segments"
  ADD CONSTRAINT "customer_segments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_service_notes"
  ADD CONSTRAINT "customer_service_notes_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."customer_success_snapshots"
  ADD CONSTRAINT "customer_success_snapshots_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."daily_commercial_health_checks"
  ADD CONSTRAINT "daily_commercial_health_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."daily_technical_health_checks"
  ADD CONSTRAINT "daily_technical_health_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."data_retention_jobs"
  ADD CONSTRAINT "data_retention_jobs_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."email_events"
  ADD CONSTRAINT "email_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."enterprise_security_audit_events"
  ADD CONSTRAINT "enterprise_security_audit_events_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."executive_decision_priorities"
  ADD CONSTRAINT "executive_decision_priorities_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."executive_kpi_snapshots"
  ADD CONSTRAINT "executive_kpi_snapshots_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."executive_workflow_automations"
  ADD CONSTRAINT "executive_workflow_automations_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."experiment_decision_records"
  ADD CONSTRAINT "experiment_decision_records_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."external_integration_connections"
  ADD CONSTRAINT "external_integration_connections_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."final_commercial_assessments"
  ADD CONSTRAINT "final_commercial_assessments_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."final_scale_reports"
  ADD CONSTRAINT "final_scale_reports_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."final_technical_assessments"
  ADD CONSTRAINT "final_technical_assessments_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."finance_daily_closes"
  ADD CONSTRAINT "finance_daily_closes_closed_by_fkey" FOREIGN KEY (closed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."finance_exports"
  ADD CONSTRAINT "finance_exports_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."financial_forecast_snapshots"
  ADD CONSTRAINT "financial_forecast_snapshots_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."frontend_polish_tasks"
  ADD CONSTRAINT "frontend_polish_tasks_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."fulfillment_batches"
  ADD CONSTRAINT "fulfillment_batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."fulfillment_queue"
  ADD CONSTRAINT "fulfillment_queue_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."full_funnel_analytics_snapshots"
  ADD CONSTRAINT "full_funnel_analytics_snapshots_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."growth_iteration_loop_actions"
  ADD CONSTRAINT "growth_iteration_loop_actions_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."inventory_demand_forecasts"
  ADD CONSTRAINT "inventory_demand_forecasts_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."investor_readiness_checks"
  ADD CONSTRAINT "investor_readiness_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."lifecycle_events"
  ADD CONSTRAINT "lifecycle_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."lifecycle_journeys"
  ADD CONSTRAINT "lifecycle_journeys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."live_operations_snapshots"
  ADD CONSTRAINT "live_operations_snapshots_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."marketing_events"
  ADD CONSTRAINT "marketing_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_app_readiness_checks"
  ADD CONSTRAINT "mobile_app_readiness_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_checkout_events"
  ADD CONSTRAINT "mobile_checkout_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_install_events"
  ADD CONSTRAINT "mobile_install_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."mobile_ux_validation_events"
  ADD CONSTRAINT "mobile_ux_validation_events_validated_by_fkey" FOREIGN KEY (validated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."monthly_operations_checklists"
  ADD CONSTRAINT "monthly_operations_checklists_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."monthly_operations_checklists"
  ADD CONSTRAINT "monthly_operations_checklists_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."nps_csat_surveys"
  ADD CONSTRAINT "nps_csat_surveys_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."operating_cost_summaries"
  ADD CONSTRAINT "operating_cost_summaries_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."operating_system_review_runs"
  ADD CONSTRAINT "operating_system_review_runs_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."operational_anomaly_events"
  ADD CONSTRAINT "operational_anomaly_events_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."order_timeline"
  ADD CONSTRAINT "order_timeline_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_customer_user_id_fkey" FOREIGN KEY (customer_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."performance_test_runs"
  ADD CONSTRAINT "performance_test_runs_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."permission_review_items"
  ADD CONSTRAINT "permission_review_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."permission_review_runs"
  ADD CONSTRAINT "permission_review_runs_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."post_purchase_email_optimizations"
  ADD CONSTRAINT "post_purchase_email_optimizations_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."post_purchase_experience_checks"
  ADD CONSTRAINT "post_purchase_experience_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."proactive_operations_reports"
  ADD CONSTRAINT "proactive_operations_reports_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."projected_stock_alerts"
  ADD CONSTRAINT "projected_stock_alerts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."public_content_pages"
  ADD CONSTRAINT "public_content_pages_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."purchase_orders"
  ADD CONSTRAINT "purchase_orders_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."purchase_orders"
  ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."query_profile_events"
  ADD CONSTRAINT "query_profile_events_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."railway_optimization_checks"
  ADD CONSTRAINT "railway_optimization_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."real_sales_measurements"
  ADD CONSTRAINT "real_sales_measurements_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."recurring_customer_conversion_reports"
  ADD CONSTRAINT "recurring_customer_conversion_reports_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."recurring_review_schedules"
  ADD CONSTRAINT "recurring_review_schedules_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."repeat_purchase_measurements"
  ADD CONSTRAINT "repeat_purchase_measurements_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."retention_activation_runs"
  ADD CONSTRAINT "retention_activation_runs_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."revenue_conversion_risk_notifications"
  ADD CONSTRAINT "revenue_conversion_risk_notifications_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_moderated_by_fkey" FOREIGN KEY (moderated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."risk_cost_control_snapshots"
  ADD CONSTRAINT "risk_cost_control_snapshots_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."scale_capacity_assessments"
  ADD CONSTRAINT "scale_capacity_assessments_measured_by_fkey" FOREIGN KEY (measured_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."scale_decision_records"
  ADD CONSTRAINT "scale_decision_records_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."scheduled_report_definitions"
  ADD CONSTRAINT "scheduled_report_definitions_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."scheduled_report_runs"
  ADD CONSTRAINT "scheduled_report_runs_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."security_hardening_checks"
  ADD CONSTRAINT "security_hardening_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."sensitive_action_approvals"
  ADD CONSTRAINT "sensitive_action_approvals_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."sensitive_action_approvals"
  ADD CONSTRAINT "sensitive_action_approvals_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."stores"
  ADD CONSTRAINT "stores_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."strategic_risk_matrix"
  ADD CONSTRAINT "strategic_risk_matrix_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."strategic_roadmap_items"
  ADD CONSTRAINT "strategic_roadmap_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."supabase_optimization_checks"
  ADD CONSTRAINT "supabase_optimization_checks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."supplier_replenishment_suggestions"
  ADD CONSTRAINT "supplier_replenishment_suggestions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."suppliers"
  ADD CONSTRAINT "suppliers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_followup_tasks"
  ADD CONSTRAINT "support_followup_tasks_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_messages"
  ADD CONSTRAINT "support_messages_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_retention_followup_automations"
  ADD CONSTRAINT "support_retention_followup_automations_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_tickets"
  ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."technical_debt_matrix"
  ADD CONSTRAINT "technical_debt_matrix_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."unit_economics_snapshots"
  ADD CONSTRAINT "unit_economics_snapshots_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."utm_sessions"
  ADD CONSTRAINT "utm_sessions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."utm_sessions"
  ADD CONSTRAINT "utm_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ux_ui_audit_items"
  ADD CONSTRAINT "ux_ui_audit_items_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ux_ui_audit_items"
  ADD CONSTRAINT "ux_ui_audit_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."ux_ui_audit_runs"
  ADD CONSTRAINT "ux_ui_audit_runs_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."ux_ui_audit_runs"
  ADD CONSTRAINT "ux_ui_audit_runs_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."visual_regression_snapshots"
  ADD CONSTRAINT "visual_regression_snapshots_captured_by_fkey" FOREIGN KEY (captured_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."visual_regression_snapshots"
  ADD CONSTRAINT "visual_regression_snapshots_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE "public"."web_push_subscriptions"
  ADD CONSTRAINT "web_push_subscriptions_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

ALTER TABLE "public"."web_push_subscriptions"
  ADD CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."wishlist_items"
  ADD CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."wishlist_items"
  ADD CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX idx_ab_experiment_definitions_store_status ON public.ab_experiment_definitions USING btree (store_id, status);

CREATE INDEX idx_ab_experiment_variants_store_experiment ON public.ab_experiment_variants USING btree (store_id, experiment_key);

CREATE INDEX idx_ab_test_prioritization_items_store_priority ON public.ab_test_prioritization_items USING btree (store_id, priority_score DESC);

CREATE INDEX idx_ab_tests_store_status ON public.ab_tests USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_abandoned_cart_recovery_events_store_status ON public.abandoned_cart_recovery_events USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_abandoned_carts_email ON public.abandoned_carts USING btree (email);

CREATE INDEX idx_abandoned_carts_recovery_claim ON public.abandoned_carts USING btree (reminder_sent, recovery_locked_until, updated_at)
  WHERE ((reminder_sent = false) AND (email IS NOT NULL));

CREATE INDEX idx_abandonment_store_step ON public.abandonment_analysis_snapshots USING btree (store_id, funnel_step, created_at DESC);

CREATE INDEX idx_abuse_detection_events_store_status ON public.abuse_detection_events USING btree (store_id, status);

CREATE INDEX idx_accessibility_validation_items_store_category ON public.accessibility_validation_items USING btree (store_id, category, status);

CREATE INDEX idx_accounting_adjustments_store_created ON public.accounting_adjustments USING btree (store_id, created_at DESC);

CREATE INDEX idx_ad_events_store_event_name_created ON public.ad_platform_events USING btree (store_id, event_name, created_at DESC);

CREATE INDEX idx_ad_events_store_platform_created ON public.ad_platform_events USING btree (store_id, platform, created_at DESC);

CREATE INDEX idx_admin_action_trails_admin ON public.admin_action_trails USING btree (admin_user_id);

CREATE INDEX idx_admin_action_trails_store_created ON public.admin_action_trails USING btree (store_id, created_at DESC);

CREATE INDEX idx_admin_assignments_assigned_status ON public.admin_assignments USING btree (assigned_to, status, due_at);

CREATE INDEX idx_admin_bulk_action_runs_store_created ON public.admin_bulk_action_runs USING btree (store_id, created_at DESC);

CREATE INDEX idx_admin_notifications_recipient_read ON public.admin_notifications USING btree (recipient_user_id, read_at, created_at DESC);

CREATE INDEX idx_admin_permissions_module_action ON public.admin_permissions USING btree (module, action);

CREATE INDEX idx_admin_roles_store_key ON public.admin_roles USING btree (store_id, role_key);

CREATE INDEX idx_admin_team_members_store_status ON public.admin_team_members USING btree (store_id, status);

CREATE INDEX idx_admin_ux_checks_store_module ON public.admin_ux_checks USING btree (store_id, module, status);

CREATE INDEX idx_admin_work_queue_items_assigned ON public.admin_work_queue_items USING btree (assigned_to, status, due_at);

CREATE INDEX idx_admin_work_queue_items_queue_status ON public.admin_work_queue_items USING btree (queue_id, status, priority);

CREATE INDEX idx_admin_work_queues_store_status ON public.admin_work_queues USING btree (store_id, status, priority);

CREATE INDEX idx_advanced_admin_audit_actor_created ON public.advanced_admin_audit_entries USING btree (actor_user_id, created_at DESC);

CREATE INDEX idx_advanced_admin_audit_entity ON public.advanced_admin_audit_entries USING btree (entity_type, entity_id);

CREATE INDEX idx_ai_assistant_messages_session_created ON public.ai_assistant_messages USING btree (session_id, created_at);

CREATE INDEX idx_ai_assistant_sessions_status ON public.ai_assistant_sessions USING btree (status);

CREATE INDEX idx_ai_assistant_sessions_store_created ON public.ai_assistant_sessions USING btree (store_id, created_at DESC);

CREATE INDEX idx_ai_faq_entries_store_active ON public.ai_faq_entries USING btree (store_id, is_active, sort_order);

CREATE INDEX idx_ai_faq_interactions_store_created ON public.ai_faq_interactions USING btree (store_id, created_at DESC);

CREATE INDEX idx_ai_intent_scores_store_created ON public.ai_intent_scores USING btree (store_id, created_at DESC);

CREATE INDEX idx_ai_product_discovery_events_store_created ON public.ai_product_discovery_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_ai_recommendation_events_store_created ON public.ai_recommendation_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_ai_recommendation_rules_store_active ON public.ai_recommendation_rules USING btree (store_id, is_active, priority DESC);

CREATE INDEX idx_ai_search_insight_snapshots_store_period ON public.ai_search_insight_snapshots USING btree (store_id, period DESC);

CREATE INDEX idx_ai_search_queries_intent ON public.ai_search_queries USING btree (intent);

CREATE INDEX idx_ai_search_queries_normalized ON public.ai_search_queries USING btree (normalized_query);

CREATE INDEX idx_ai_search_queries_store_created ON public.ai_search_queries USING btree (store_id, created_at DESC);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);

CREATE INDEX idx_automation_executions_created_at ON public.automation_executions USING btree (created_at DESC);

CREATE INDEX idx_automation_executions_store_status ON public.automation_executions USING btree (store_id, status);

CREATE INDEX idx_automation_executions_trigger_key ON public.automation_executions USING btree (trigger_key);

CREATE INDEX idx_automation_jobs_store_type ON public.automation_jobs USING btree (store_id, job_type);

CREATE INDEX idx_automation_runs_store_created_at ON public.automation_runs USING btree (store_id, created_at DESC);

CREATE INDEX idx_automation_triggers_event_name ON public.automation_triggers USING btree (event_name);

CREATE INDEX idx_automation_triggers_store_active ON public.automation_triggers USING btree (store_id, is_active);

CREATE INDEX idx_banner_card_button_form_standards_store_element ON public.banner_card_button_form_standards USING btree (store_id, element_type);

CREATE INDEX idx_behavior_feedback_loop_store_priority ON public.behavior_feedback_loop_actions USING btree (store_id, priority, status, created_at DESC);

CREATE INDEX idx_board_investor_reporting_packets_store_period ON public.board_investor_reporting_packets USING btree (store_id, period);

CREATE INDEX idx_brand_microcopy_items_store_surface ON public.brand_microcopy_items USING btree (store_id, surface);

CREATE INDEX idx_brand_readiness_reports_store_status ON public.brand_readiness_reports USING btree (store_id, status);

CREATE INDEX idx_business_command_center_reports_store_created ON public.business_command_center_reports USING btree (store_id, created_at DESC);

CREATE INDEX idx_business_intelligence_insights_store_type ON public.business_intelligence_insights USING btree (store_id, insight_type, severity);

CREATE INDEX idx_cac_roas_measurements_store_channel ON public.cac_roas_measurements USING btree (store_id, channel, created_at DESC);

CREATE INDEX idx_cache_metrics_area ON public.cache_metrics USING btree (cache_area, cache_status);

CREATE INDEX idx_campaign_adjustment_items_store_status ON public.campaign_adjustment_items USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_campaign_asset_readiness_store_channel ON public.campaign_asset_readiness USING btree (store_id, campaign_channel);

CREATE INDEX idx_campaign_attribution_campaign_id ON public.campaign_attribution USING btree (campaign_id);

CREATE INDEX idx_campaign_attribution_store_created_at ON public.campaign_attribution USING btree (store_id, created_at DESC);

CREATE INDEX idx_campaign_followup_automations_store ON public.campaign_followup_automations USING btree (store_id, created_at DESC);

CREATE INDEX idx_campaign_iteration_records_store_channel ON public.campaign_iteration_records USING btree (store_id, channel, created_at DESC);

CREATE INDEX idx_campaign_landing_pages_campaign_type ON public.campaign_landing_pages USING btree (campaign_type);

CREATE INDEX idx_campaign_landing_pages_status ON public.campaign_landing_pages USING btree (status);

CREATE INDEX idx_campaign_landing_pages_updated_at ON public.campaign_landing_pages USING btree (updated_at DESC);

CREATE INDEX idx_campaign_orchestration_campaign_key ON public.campaign_orchestration_events USING btree (campaign_key);

CREATE INDEX idx_campaign_orchestration_scheduled ON public.campaign_orchestration_events USING btree (scheduled_at DESC);

CREATE INDEX idx_campaign_orchestration_store_status ON public.campaign_orchestration_events USING btree (store_id, status);

CREATE INDEX idx_campaign_page_readiness_status ON public.campaign_page_readiness USING btree (status);

CREATE INDEX idx_catalog_import_batches_store_created_at ON public.catalog_import_batches USING btree (store_id, created_at DESC);

CREATE INDEX idx_catalog_import_rows_batch_status ON public.catalog_import_rows USING btree (batch_id, validation_status);

CREATE INDEX idx_categories_store_active ON public.categories USING btree (store_id, is_active);

CREATE INDEX idx_categories_store_sort ON public.categories USING btree (store_id, sort_order);

CREATE INDEX idx_category_collections_store_visible_sort ON public.category_collections USING btree (store_id, is_visible, sort_order);

CREATE INDEX idx_cdp_memberships_store ON public.cdp_segment_memberships USING btree (store_id);

CREATE INDEX idx_cdp_profiles_store ON public.customer_data_platform_profiles USING btree (store_id);

CREATE INDEX idx_channel_behavior_analytics_store_channel ON public.channel_behavior_analytics USING btree (store_id, channel, created_at DESC);

CREATE INDEX idx_channel_campaign_comparison_reports_store_channel ON public.channel_campaign_comparison_reports USING btree (store_id, channel);

CREATE INDEX idx_channel_inventory_snapshots_store_channel ON public.channel_inventory_snapshots USING btree (store_id, channel_key);

CREATE INDEX idx_channel_performance_snapshots_store_period ON public.channel_performance_snapshots USING btree (store_id, period DESC);

CREATE INDEX idx_channel_pricing_rules_store_channel ON public.channel_pricing_rules USING btree (store_id, channel_key, is_active);

CREATE INDEX idx_channel_product_feeds_store_channel ON public.channel_product_feeds USING btree (store_id, channel_key);

CREATE INDEX idx_channel_sync_events_store_channel ON public.channel_sync_events USING btree (store_id, channel_key, created_at DESC);

CREATE INDEX idx_checkout_live_monitoring_events_store_severity ON public.checkout_live_monitoring_events USING btree (store_id, severity, created_at DESC);

CREATE INDEX idx_checkout_opt_events_store_created ON public.checkout_optimization_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_checkout_real_flow_store_status ON public.checkout_real_flow_validations USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_checkout_ux_checks_store_step ON public.checkout_ux_checks USING btree (store_id, step, status);

CREATE INDEX idx_commercial_bottleneck_reports_store_severity ON public.commercial_bottleneck_reports USING btree (store_id, severity, status);

CREATE INDEX idx_commercial_campaigns_store_status ON public.commercial_campaigns USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_commercial_content_items_store_surface ON public.commercial_content_items USING btree (store_id, surface);

CREATE INDEX idx_commercial_technical_alert_rules_store ON public.commercial_technical_alert_rules USING btree (store_id, created_at DESC);

CREATE INDEX idx_complaints_returns_cases_store_status ON public.complaints_returns_cases USING btree (store_id, status);

CREATE INDEX idx_compliance_operations_snapshots_store_created ON public.compliance_operations_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_content_readiness_reports_status ON public.content_readiness_reports USING btree (status);

CREATE INDEX idx_continuous_improvement_reports_store_created ON public.continuous_improvement_reports USING btree (store_id, created_at DESC);

CREATE INDEX idx_controlled_marketing_launches_store_status ON public.controlled_marketing_launches USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_conversion_events_order_id ON public.conversion_events USING btree (order_id);

CREATE INDEX idx_conversion_events_session_id ON public.conversion_events USING btree (session_id);

CREATE INDEX idx_conversion_events_store_type_created_at ON public.conversion_events USING btree (store_id, event_type, created_at DESC);

CREATE INDEX idx_conversion_learning_results_store_key ON public.conversion_learning_results USING btree (store_id, learning_key);

CREATE INDEX idx_conversion_optimization_experiments_store_status ON public.conversion_optimization_experiments USING btree (store_id, status, priority);

CREATE INDEX idx_conversion_qa_store_step ON public.conversion_qa_checks USING btree (store_id, funnel_step, created_at DESC);

CREATE INDEX idx_conversion_trust_checks_store_area ON public.conversion_trust_checks USING btree (store_id, area, status);

CREATE INDEX idx_cost_snapshots_provider ON public.cost_snapshots USING btree (PROVIDER, captured_at DESC);

CREATE INDEX idx_coupons_store_code ON public.coupons USING btree (store_id, code);

CREATE INDEX idx_crm_contacts_email ON public.crm_contacts USING btree (email);

CREATE INDEX idx_crm_contacts_store_marketing ON public.crm_contacts USING btree (store_id, marketing_status);

CREATE INDEX idx_crm_contacts_store_stage ON public.crm_contacts USING btree (store_id, lifecycle_stage);

CREATE INDEX idx_crm_contacts_updated_at ON public.crm_contacts USING btree (updated_at DESC);

CREATE INDEX idx_crm_segments_segment_key ON public.crm_segments USING btree (segment_key);

CREATE INDEX idx_crm_segments_store_active ON public.crm_segments USING btree (store_id, is_active);

CREATE INDEX idx_customer_journey_checks_store_step ON public.customer_journey_checks USING btree (store_id, step, status);

CREATE INDEX idx_customer_loyalty_email ON public.customer_loyalty_accounts USING btree (email);

CREATE INDEX idx_customer_loyalty_tx_profile_created ON public.customer_loyalty_transactions USING btree (customer_profile_id, created_at DESC);

CREATE INDEX idx_customer_metrics_store_spent ON public.customer_metrics USING btree (store_id, total_spent DESC);

CREATE INDEX idx_customer_notification_events_status_created ON public.customer_notification_events USING btree (status, created_at DESC);

CREATE INDEX idx_customer_personalization_events_created ON public.customer_personalization_events USING btree (created_at DESC);

CREATE INDEX idx_customer_profiles_email ON public.customer_profiles USING btree (email);

CREATE INDEX idx_customer_profiles_stage ON public.customer_profiles USING btree (lifecycle_stage);

CREATE INDEX idx_customer_rebuy_profile_status ON public.customer_rebuy_lists USING btree (customer_profile_id, status);

CREATE INDEX idx_customer_recommendations_profile_score ON public.customer_recommendations USING btree (customer_profile_id, score DESC);

CREATE INDEX idx_customer_satisfaction_measurements_store_created ON public.customer_satisfaction_measurements USING btree (store_id, created_at DESC);

CREATE INDEX idx_customer_segments_active ON public.customer_segments USING btree (is_active);

CREATE UNIQUE INDEX idx_customer_segments_segment_key ON public.customer_segments USING btree (segment_key);

CREATE INDEX idx_customer_service_notes_customer_created ON public.customer_service_notes USING btree (customer_email, created_at DESC);

CREATE INDEX idx_customer_subscriptions_profile_status ON public.customer_subscriptions USING btree (customer_profile_id, status);

CREATE INDEX idx_customer_success_snapshots_store_created ON public.customer_success_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_customer_touchpoints_channel ON public.customer_touchpoints USING btree (channel);

CREATE INDEX idx_customer_touchpoints_email ON public.customer_touchpoints USING btree (customer_email);

CREATE INDEX idx_customer_touchpoints_store_created ON public.customer_touchpoints USING btree (store_id, created_at DESC);

CREATE INDEX idx_customer_wallet_profile_status ON public.customer_wallet_items USING btree (customer_profile_id, status);

CREATE INDEX idx_daily_commercial_health_checks_store_date ON public.daily_commercial_health_checks USING btree (store_id, business_date DESC);

CREATE INDEX idx_daily_technical_health_checks_store_date ON public.daily_technical_health_checks USING btree (store_id, health_date DESC);

CREATE INDEX idx_design_system_tokens_store_type ON public.design_system_tokens USING btree (store_id, token_type);

CREATE INDEX idx_educational_content_items_status ON public.educational_content_items USING btree (status);

CREATE INDEX idx_email_delivery_attempts_queue_id ON public.email_delivery_attempts USING btree (queue_id);

CREATE INDEX idx_email_events_created_at ON public.email_events USING btree (created_at DESC);

CREATE INDEX idx_email_events_dedupe_key ON public.email_events USING btree (dedupe_key)
  WHERE (dedupe_key IS NOT NULL);

CREATE INDEX idx_email_events_email_created_at ON public.email_events USING btree (email, created_at DESC);

CREATE INDEX idx_email_events_email ON public.email_events USING btree (email);

CREATE INDEX idx_email_events_event_status_created_at ON public.email_events USING btree (event_type, status, created_at DESC);

CREATE INDEX idx_email_events_event_type ON public.email_events USING btree (event_type);

CREATE INDEX idx_email_events_order_id ON public.email_events USING btree (order_id);

CREATE INDEX idx_email_events_provider_message_id ON public.email_events USING btree (provider_message_id);

CREATE INDEX idx_email_events_request_id ON public.email_events USING btree (request_id)
  WHERE (request_id IS NOT NULL);

CREATE INDEX idx_email_events_status ON public.email_events USING btree (status);

CREATE INDEX idx_email_events_store_event_status ON public.email_events USING btree (store_id, event_type, status, created_at DESC);

CREATE INDEX idx_email_events_user_id ON public.email_events USING btree (user_id);

CREATE INDEX idx_email_queue_locked_until ON public.email_queue USING btree (locked_until);

CREATE INDEX idx_email_queue_provider_message_id ON public.email_queue USING btree (provider_message_id);

CREATE INDEX idx_email_queue_status_next_attempt ON public.email_queue USING btree (status, next_attempt_at, scheduled_for);

CREATE INDEX idx_email_suppression_active_email ON public.email_suppression_list USING btree (email, is_active);

CREATE INDEX idx_email_template_catalog_category ON public.email_template_catalog USING btree (category, is_active);

CREATE INDEX idx_email_template_preview_events_template ON public.email_template_preview_events USING btree (template_key, created_at DESC);

CREATE INDEX idx_endpoint_performance_status ON public.endpoint_performance_snapshots USING btree (performance_status);

CREATE INDEX idx_endpoint_performance_store_endpoint ON public.endpoint_performance_snapshots USING btree (store_id, endpoint, measured_at DESC);

CREATE INDEX idx_enterprise_security_audit_events_severity ON public.enterprise_security_audit_events USING btree (severity);

CREATE INDEX idx_enterprise_security_audit_events_store_created ON public.enterprise_security_audit_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_executive_decision_priorities_store_status ON public.executive_decision_priorities USING btree (store_id, status, priority_level);

CREATE INDEX idx_executive_kpi_snapshots_store_created ON public.executive_kpi_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_executive_workflow_automations_store ON public.executive_workflow_automations USING btree (store_id, created_at DESC);

CREATE INDEX idx_external_integration_connections_store_type ON public.external_integration_connections USING btree (store_id, provider_type);

CREATE INDEX idx_external_order_items_external_order ON public.external_order_items USING btree (external_order_id);

CREATE INDEX idx_external_orders_store_channel ON public.external_orders USING btree (store_id, channel_key, created_at DESC);

CREATE INDEX idx_final_scale_reports_status ON public.final_scale_reports USING btree (status);

CREATE INDEX idx_finance_daily_closes_store_date ON public.finance_daily_closes USING btree (store_id, business_date DESC);

CREATE INDEX idx_finance_exports_store_created ON public.finance_exports USING btree (store_id, created_at DESC);

CREATE INDEX idx_finance_reconciliation_items_status ON public.finance_reconciliation_items USING btree (status, severity, created_at DESC);

CREATE INDEX idx_finance_reconciliation_runs_store_started ON public.finance_reconciliation_runs USING btree (store_id, started_at DESC);

CREATE INDEX idx_financial_forecast_snapshots_store_period ON public.financial_forecast_snapshots USING btree (store_id, forecast_period);

CREATE INDEX idx_friction_prioritization_store_priority ON public.friction_prioritization_items USING btree (store_id, priority_score DESC, status);

CREATE INDEX idx_frontend_polish_tasks_store_area ON public.frontend_polish_tasks USING btree (store_id, area, status);

CREATE INDEX idx_fulfillment_queue_order ON public.fulfillment_queue USING btree (order_id);

CREATE INDEX idx_fulfillment_queue_store_status_due ON public.fulfillment_queue USING btree (store_id, status, due_at);

CREATE INDEX idx_full_funnel_analytics_snapshots_store_created ON public.full_funnel_analytics_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_growth_iteration_loop_actions_store_status ON public.growth_iteration_loop_actions USING btree (store_id, status, priority);

CREATE INDEX idx_i18n_locales_store ON public.internationalization_locales USING btree (store_id);

CREATE INDEX idx_inventory_demand_forecasts_store_sku ON public.inventory_demand_forecasts USING btree (store_id, product_sku);

CREATE INDEX idx_inventory_movements_created_at ON public.inventory_movements USING btree (created_at DESC);

CREATE INDEX idx_inventory_movements_order_created_at ON public.inventory_movements USING btree (order_id, created_at DESC);

CREATE INDEX idx_inventory_movements_product_id ON public.inventory_movements USING btree (product_id);

CREATE INDEX idx_inventory_planning_snapshots_store_created ON public.inventory_planning_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_investment_scaling_decisions_store_status ON public.investment_scaling_decisions USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_investor_readiness_checks_status ON public.investor_readiness_checks USING btree (status);

CREATE INDEX idx_journey_steps_journey_order ON public.journey_steps USING btree (journey_id, step_order);

CREATE INDEX idx_journey_steps_store_channel ON public.journey_steps USING btree (store_id, channel);

CREATE INDEX idx_landing_page_conversion_checks_store_slug ON public.landing_page_conversion_checks USING btree (store_id, landing_slug, created_at DESC);

CREATE INDEX idx_landing_pages_store_status ON public.campaign_landing_pages USING btree (store_id, status, updated_at DESC);

CREATE INDEX idx_landing_sections_store_visible_sort ON public.landing_sections USING btree (store_id, is_visible, sort_order);

CREATE INDEX idx_lifecycle_events_store_stage_status ON public.lifecycle_events USING btree (store_id, lifecycle_stage, status, created_at DESC);

CREATE INDEX idx_lifecycle_journeys_store_status ON public.lifecycle_journeys USING btree (store_id, status);

CREATE INDEX idx_lifecycle_journeys_store_type ON public.lifecycle_journeys USING btree (store_id, journey_type);

CREATE INDEX idx_live_behavior_store_step ON public.live_behavior_events USING btree (store_id, journey_step, created_at DESC);

CREATE INDEX idx_live_operations_snapshots_store_created ON public.live_operations_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_localized_content_store ON public.localized_content_items USING btree (store_id);

CREATE INDEX idx_maintenance_controls_store ON public.maintenance_mode_controls USING btree (store_id);

CREATE INDEX idx_marketing_events_event_type_created_at ON public.marketing_events USING btree (event_type, created_at DESC);

CREATE INDEX idx_marketing_events_product_created_at ON public.marketing_events USING btree (product_id, created_at DESC);

CREATE INDEX idx_marketing_events_store_created_at ON public.marketing_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_marketing_launch_readiness_checks_store_area ON public.marketing_launch_readiness_checks USING btree (store_id, area, created_at DESC);

CREATE INDEX idx_merchandising_rules_store_active_priority ON public.merchandising_rules USING btree (store_id, is_active, priority);

CREATE INDEX idx_mobile_app_readiness_checks_area_status ON public.mobile_app_readiness_checks USING btree (area, status);

CREATE INDEX idx_mobile_app_readiness_checks_area ON public.mobile_app_readiness_checks USING btree (area);

CREATE INDEX idx_mobile_app_readiness_checks_category ON public.mobile_app_readiness_checks USING btree (category);

CREATE INDEX idx_mobile_app_readiness_checks_executed_at ON public.mobile_app_readiness_checks USING btree (executed_at DESC);

CREATE INDEX idx_mobile_app_readiness_checks_run_id ON public.mobile_app_readiness_checks USING btree (run_id);

CREATE INDEX idx_mobile_app_readiness_checks_status ON public.mobile_app_readiness_checks USING btree (status);

CREATE INDEX idx_mobile_app_readiness_checks_store_key ON public.mobile_app_readiness_checks USING btree (store_id, check_key);

CREATE INDEX idx_mobile_app_readiness_checks_store_status ON public.mobile_app_readiness_checks USING btree (store_id, status);

CREATE INDEX idx_mobile_checkout_events_abandoned ON public.mobile_checkout_events USING btree (abandoned);

CREATE INDEX idx_mobile_checkout_events_conversion_status ON public.mobile_checkout_events USING btree (conversion_status);

CREATE INDEX idx_mobile_checkout_events_customer_email ON public.mobile_checkout_events USING btree (customer_email);

CREATE INDEX idx_mobile_checkout_events_duration ON public.mobile_checkout_events USING btree (duration_ms);

CREATE INDEX idx_mobile_checkout_events_friction_reason ON public.mobile_checkout_events USING btree (friction_reason);

CREATE INDEX idx_mobile_checkout_events_friction_step ON public.mobile_checkout_events USING btree (friction_step);

CREATE INDEX idx_mobile_checkout_events_payment_method ON public.mobile_checkout_events USING btree (payment_method);

CREATE INDEX idx_mobile_checkout_events_recovered ON public.mobile_checkout_events USING btree (recovered);

CREATE INDEX idx_mobile_checkout_events_session_id ON public.mobile_checkout_events USING btree (session_id);

CREATE INDEX idx_mobile_checkout_events_store_created ON public.mobile_checkout_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_mobile_checkout_events_user_id ON public.mobile_checkout_events USING btree (user_id);

CREATE INDEX idx_mobile_install_events_customer_email ON public.mobile_install_events USING btree (customer_email);

CREATE INDEX idx_mobile_install_events_display_mode ON public.mobile_install_events USING btree (display_mode);

CREATE INDEX idx_mobile_install_events_install_source ON public.mobile_install_events USING btree (install_source);

CREATE INDEX idx_mobile_install_events_session_id ON public.mobile_install_events USING btree (session_id);

CREATE INDEX idx_mobile_install_events_source ON public.mobile_install_events USING btree (source);

CREATE INDEX idx_mobile_install_events_store_created ON public.mobile_install_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_mobile_install_events_user_id ON public.mobile_install_events USING btree (user_id);

CREATE INDEX idx_mobile_offline_catalog_snapshots_store_created ON public.mobile_offline_catalog_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_mobile_performance_snapshots_store_created ON public.mobile_performance_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_mobile_pwa_sessions_store_created ON public.mobile_pwa_sessions USING btree (store_id, created_at DESC);

CREATE INDEX idx_mobile_real_device_store_status ON public.mobile_real_device_validations USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_mobile_retention_events_store_created ON public.mobile_retention_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_mobile_touch_optimization_events_store_created ON public.mobile_touch_optimization_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_mobile_ux_validation_events_store_device ON public.mobile_ux_validation_events USING btree (store_id, device_type, status);

CREATE INDEX idx_monthly_operations_checklist_items_checklist ON public.monthly_operations_checklist_items USING btree (checklist_id);

CREATE INDEX idx_monthly_operations_checklist_items_status ON public.monthly_operations_checklist_items USING btree (status);

CREATE INDEX idx_monthly_operations_checklists_executed_at ON public.monthly_operations_checklists USING btree (executed_at DESC);

CREATE INDEX idx_monthly_operations_checklists_execution_status ON public.monthly_operations_checklists USING btree (execution_status);

CREATE INDEX idx_monthly_operations_checklists_month ON public.monthly_operations_checklists USING btree (checklist_month DESC);

CREATE INDEX idx_monthly_operations_checklists_period ON public.monthly_operations_checklists USING btree (period DESC);

CREATE INDEX idx_monthly_operations_checklists_run_status ON public.monthly_operations_checklists USING btree (run_status);

CREATE INDEX idx_monthly_operations_checklists_status ON public.monthly_operations_checklists USING btree (status);

CREATE INDEX idx_multi_currency_store ON public.multi_currency_settings USING btree (store_id);

CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_subscribers USING btree (email);

CREATE INDEX idx_newsletter_subscribers_store_status ON public.newsletter_subscribers USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_nps_csat_surveys_store_type ON public.nps_csat_surveys USING btree (store_id, survey_type);

CREATE INDEX idx_operating_system_review_runs_store_type ON public.operating_system_review_runs USING btree (store_id, review_type);

CREATE INDEX idx_operational_anomaly_events_store ON public.operational_anomaly_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_operational_events_created_at ON public.operational_events USING btree (created_at DESC);

CREATE INDEX idx_operational_events_event_type ON public.operational_events USING btree (event_type, created_at DESC);

CREATE INDEX idx_operational_events_severity_created_at ON public.operational_events USING btree (severity, created_at DESC);

CREATE INDEX idx_operational_events_store_created_at ON public.operational_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_order_incidents_store_status ON public.order_incidents USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);

CREATE INDEX idx_order_timeline_event_type_created_at ON public.order_timeline USING btree (event_type, created_at DESC);

CREATE INDEX idx_order_timeline_order_id_created_at ON public.order_timeline USING btree (order_id, created_at DESC);

CREATE INDEX idx_orders_customer_email ON public.orders USING btree (customer_email);

CREATE INDEX idx_orders_customer_user_id ON public.orders USING btree (customer_user_id);

CREATE INDEX idx_orders_financial_status_updated_at ON public.orders USING btree (financial_status, updated_at DESC);

CREATE INDEX idx_orders_fulfillment_status_updated_at ON public.orders USING btree (fulfillment_status, updated_at DESC);

CREATE INDEX idx_orders_paid_at_status ON public.orders USING btree (paid_at DESC, status);

CREATE INDEX idx_orders_refund_status ON public.orders USING btree (refund_status);

CREATE INDEX idx_orders_refunded_at ON public.orders USING btree (refunded_at DESC);

CREATE INDEX idx_orders_status_updated_at_pl08 ON public.orders USING btree (status, updated_at DESC);

CREATE INDEX idx_orders_status_updated_at ON public.orders USING btree (status, updated_at DESC);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_orders_store_id ON public.orders USING btree (store_id);

CREATE INDEX idx_orders_stripe_session_id ON public.orders USING btree (stripe_session_id);

CREATE INDEX idx_orders_tracking_number ON public.orders USING btree (tracking_number);

CREATE INDEX idx_organic_traffic_readiness_checks_status ON public.organic_traffic_readiness_checks USING btree (status);

CREATE INDEX idx_paid_campaigns_store_channel ON public.paid_traffic_campaigns USING btree (store_id, channel, created_at DESC);

CREATE INDEX idx_paid_campaigns_store_status ON public.paid_traffic_campaigns USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_paid_traffic_campaign_runs_store_status ON public.paid_traffic_campaign_runs USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_paid_traffic_landing_checks_status ON public.paid_traffic_landing_checks USING btree (status);

CREATE INDEX idx_performance_test_runs_store_created ON public.performance_test_runs USING btree (store_id, created_at DESC);

CREATE INDEX idx_permission_review_items_run ON public.permission_review_items USING btree (run_id);

CREATE INDEX idx_personalization_profiles_store ON public.personalization_profiles USING btree (store_id);

CREATE INDEX idx_post_purchase_email_optimizations_store_type ON public.post_purchase_email_optimizations USING btree (store_id, email_type);

CREATE INDEX idx_post_purchase_experience_checks_store_status ON public.post_purchase_experience_checks USING btree (store_id, status);

CREATE INDEX idx_proactive_operations_reports_store ON public.proactive_operations_reports USING btree (store_id, created_at DESC);

CREATE INDEX idx_product_category_copy_items_status ON public.product_category_copy_items USING btree (status);

CREATE INDEX idx_product_content_completion_items_store_status ON public.product_content_completion_items USING btree (store_id, status);

CREATE INDEX idx_product_feeds_store_generated ON public.product_feeds USING btree (store_id, generated_at DESC);

CREATE INDEX idx_product_media_assets_quality ON public.product_media_assets USING btree (quality_status, is_primary);

CREATE INDEX idx_product_publish_checks_store_status ON public.product_publish_checks USING btree (store_id, status, score DESC);

CREATE INDEX idx_product_v2_roadmap_store ON public.product_v2_roadmap_items USING btree (store_id);

CREATE INDEX idx_production_content_items_status ON public.production_content_items USING btree (status);

CREATE INDEX idx_products_category ON public.products USING btree (category);

CREATE INDEX idx_products_commercial_status ON public.products USING btree (store_id, commercial_status, status);

CREATE INDEX idx_products_feed_readiness ON public.products USING btree (store_id, status, feed_status, stock);

CREATE INDEX idx_products_low_stock_threshold ON public.products USING btree (store_id, status, stock, low_stock_threshold);

CREATE INDEX idx_products_low_stock ON public.products USING btree (store_id, stock, status);

CREATE INDEX idx_products_search_name_description ON public.products
  USING gin
  (to_tsvector('simple'::regconfig, ((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(seo_title, ''::text)) || ' '::text)
  || COALESCE(seo_description, ''::text))));

CREATE INDEX idx_products_slug ON public.products USING btree (slug);

CREATE INDEX idx_products_status ON public.products USING btree (status);

CREATE INDEX idx_products_store_commercial_status ON public.products USING btree (store_id, commercial_status, status);

CREATE INDEX idx_products_store_featured_sort ON public.products USING btree (store_id, status, is_featured DESC, sort_priority, updated_at DESC);

CREATE INDEX idx_products_store_id ON public.products USING btree (store_id);

CREATE INDEX idx_products_store_merchandising ON public.products USING btree (store_id, status, is_featured DESC, merchandising_priority, sort_priority);

CREATE INDEX idx_products_store_ready_ads ON public.products USING btree (store_id, ready_for_ads, catalog_quality_score DESC);

CREATE UNIQUE INDEX idx_products_store_slug_unique ON public.products USING btree (store_id, slug)
  WHERE (slug IS NOT NULL);

CREATE INDEX idx_products_store_status_slug ON public.products USING btree (store_id, status, slug);

CREATE INDEX idx_products_store_status_updated_at ON public.products USING btree (store_id, status, updated_at DESC);

CREATE INDEX idx_projected_stock_alerts_status ON public.projected_stock_alerts USING btree (store_id, status, severity);

CREATE INDEX idx_public_content_pages_store_slug_status ON public.public_content_pages USING btree (store_id, slug, status);

CREATE INDEX idx_purchase_order_items_po ON public.purchase_order_items USING btree (purchase_order_id);

CREATE INDEX idx_purchase_orders_store_status ON public.purchase_orders USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_query_profile_events_store_created ON public.query_profile_events USING btree (store_id, created_at DESC);

CREATE INDEX idx_real_sales_measurements_store_channel ON public.real_sales_measurements USING btree (store_id, channel, created_at DESC);

CREATE INDEX idx_real_user_feedback_store_status ON public.real_user_feedback_items USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_real_user_test_runs_store_created ON public.real_user_test_runs USING btree (store_id, created_at DESC);

CREATE INDEX idx_recommendation_events_store ON public.recommendation_events USING btree (store_id);

CREATE INDEX idx_recommendation_rules_store ON public.recommendation_engine_rules USING btree (store_id);

CREATE INDEX idx_recurring_customer_conversion_reports_store_period ON public.recurring_customer_conversion_reports USING btree (store_id, period);

CREATE INDEX idx_recurring_review_schedules_store ON public.recurring_review_schedules USING btree (store_id, created_at DESC);

CREATE INDEX idx_repeat_purchase_measurements_store_period ON public.repeat_purchase_measurements USING btree (store_id, period);

CREATE INDEX idx_replenishment_suggestions_status ON public.supplier_replenishment_suggestions USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_resource_usage_alerts_status ON public.resource_usage_alerts USING btree (status, severity);

CREATE INDEX idx_retention_activation_runs_store_status ON public.retention_activation_runs USING btree (store_id, status);

CREATE INDEX idx_returns_requests_store_status ON public.returns_requests USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_reusable_component_standards_store_type ON public.reusable_component_standards USING btree (store_id, component_type);

CREATE INDEX idx_revenue_conversion_risk_notifications_store ON public.revenue_conversion_risk_notifications USING btree (store_id, created_at DESC);

CREATE INDEX idx_revenue_snapshots_store_date ON public.revenue_snapshots USING btree (store_id, snapshot_date DESC);

CREATE INDEX idx_revenue_validation_snapshots_store_period ON public.revenue_validation_snapshots USING btree (store_id, period, created_at DESC);

CREATE INDEX idx_review_requests_store_status ON public.review_requests USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_reviews_moderation_created_at ON public.reviews USING btree (moderation_status, created_at DESC);

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);

CREATE INDEX idx_reviews_product_moderation ON public.reviews USING btree (product_id, moderation_status, created_at DESC);

CREATE INDEX idx_risk_cost_control_snapshots_store_created ON public.risk_cost_control_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_sales_channels_store_active ON public.sales_channels USING btree (store_id, is_active);

CREATE INDEX idx_scale_freeze_store ON public.scale_governance_freeze_records USING btree (store_id);

CREATE INDEX idx_scheduled_report_definitions_store ON public.scheduled_report_definitions USING btree (store_id, created_at DESC);

CREATE INDEX idx_scheduled_report_runs_store ON public.scheduled_report_runs USING btree (store_id, created_at DESC);

CREATE INDEX idx_search_intent_optimization_items_status ON public.search_intent_optimization_items USING btree (status);

CREATE INDEX idx_security_hardening_checks_store_status ON public.security_hardening_checks USING btree (store_id, status);

CREATE INDEX idx_sensitive_action_approvals_status ON public.sensitive_action_approvals USING btree (status);

CREATE INDEX idx_seo_content_depth_checks_status ON public.seo_content_depth_checks USING btree (status);

CREATE INDEX idx_skincare_synonyms_store_active ON public.skincare_synonyms USING btree (store_id, is_active);

CREATE INDEX idx_slow_query_reports_status ON public.slow_query_reports USING btree (status, severity);

CREATE INDEX idx_strategic_risk_matrix_severity_status ON public.strategic_risk_matrix USING btree (severity, status);

CREATE INDEX idx_strategic_roadmap_items_status_priority ON public.strategic_roadmap_items USING btree (status, priority);

CREATE INDEX idx_stripe_events_created_at ON public.stripe_events USING btree (created_at);

CREATE INDEX idx_stripe_events_processed_error ON public.stripe_events USING btree (processed_at, error_message, created_at DESC);

CREATE INDEX idx_supplier_catalog_items_supplier ON public.supplier_catalog_items USING btree (supplier_id, status);

CREATE INDEX idx_supplier_lead_time_logs_supplier ON public.supplier_lead_time_logs USING btree (supplier_id, created_at DESC);

CREATE INDEX idx_supplier_margin_snapshots_store_created ON public.supplier_margin_snapshots USING btree (store_id, created_at DESC);

CREATE INDEX idx_supplier_product_costs_product ON public.supplier_product_costs USING btree (product_id, is_preferred);

CREATE INDEX idx_suppliers_store_status ON public.suppliers USING btree (store_id, status);

CREATE INDEX idx_support_followup_tasks_store_status_priority ON public.support_followup_tasks USING btree (store_id, status, priority);

CREATE INDEX idx_support_messages_store_status ON public.support_messages USING btree (store_id, status, created_at DESC);

CREATE INDEX idx_support_retention_followup_automations_store ON public.support_retention_followup_automations USING btree (store_id, created_at DESC);

CREATE INDEX idx_support_sla_store_active ON public.support_sla_policies USING btree (store_id, is_active);

CREATE INDEX idx_support_templates_store_active ON public.support_response_templates USING btree (store_id, is_active, sort_order);

CREATE INDEX idx_support_ticket_messages_ticket_created ON public.support_ticket_messages USING btree (ticket_id, created_at DESC);

CREATE INDEX idx_support_tickets_order ON public.support_tickets USING btree (order_id);

CREATE INDEX idx_support_tickets_store_status_updated ON public.support_tickets USING btree (store_id, status, updated_at DESC);

CREATE INDEX idx_tax_legal_store ON public.tax_legal_readiness_checks USING btree (store_id);

CREATE INDEX idx_technical_debt_matrix_severity_status ON public.technical_debt_matrix USING btree (severity, status);

CREATE INDEX idx_traffic_quality_reports_store_channel ON public.traffic_quality_reports USING btree (store_id, channel, created_at DESC);

CREATE INDEX idx_trust_badges_active_sort ON public.trust_badges USING btree (is_active, sort_order);

CREATE INDEX idx_trust_badges_store_visible_sort ON public.trust_badges USING btree (store_id, is_visible, sort_order);

CREATE INDEX idx_unit_economics_snapshots_store_key ON public.unit_economics_snapshots USING btree (store_id, snapshot_key);

CREATE INDEX idx_user_session_replay_markers_store_severity ON public.user_session_replay_markers USING btree (store_id, severity, created_at DESC);

CREATE INDEX idx_users_role ON public.users USING btree (ROLE);

CREATE INDEX idx_utm_sessions_store_campaign ON public.utm_sessions USING btree (store_id, utm_campaign, last_seen_at DESC);

CREATE INDEX idx_ux_ui_audit_items_store_area ON public.ux_ui_audit_items USING btree (store_id, area, status);

CREATE INDEX idx_ux_ui_audit_runs_store_created ON public.ux_ui_audit_runs USING btree (store_id, created_at DESC);

CREATE INDEX idx_visual_brand_systems_store_status ON public.visual_brand_systems USING btree (store_id, status);

CREATE INDEX idx_visual_consistency_checks_store_status ON public.visual_consistency_checks USING btree (store_id, status);

CREATE INDEX idx_visual_regression_snapshots_store_page ON public.visual_regression_snapshots USING btree (store_id, page_path, viewport);

CREATE INDEX idx_web_push_subscriptions_customer_email ON public.web_push_subscriptions USING btree (customer_email);

CREATE INDEX idx_web_push_subscriptions_last_seen ON public.web_push_subscriptions USING btree (last_seen_at DESC);

CREATE INDEX idx_web_push_subscriptions_session_id ON public.web_push_subscriptions USING btree (session_id);

CREATE INDEX idx_web_push_subscriptions_source ON public.web_push_subscriptions USING btree (source);

CREATE INDEX idx_web_push_subscriptions_store_active ON public.web_push_subscriptions USING btree (store_id, is_active);

CREATE INDEX idx_web_push_subscriptions_store_status ON public.web_push_subscriptions USING btree (store_id, subscription_status);

CREATE INDEX idx_web_push_subscriptions_subscription_status ON public.web_push_subscriptions USING btree (subscription_status);

CREATE INDEX idx_web_push_subscriptions_user_id ON public.web_push_subscriptions USING btree (user_id);

CREATE INDEX idx_wishlist_user_id ON public.wishlist_items USING btree (user_id);

CREATE UNIQUE INDEX ux_admin_endpoint_optimization_store_check ON public.admin_endpoint_optimization_checks USING btree (store_id, check_key);

CREATE UNIQUE INDEX ux_cache_metrics_store_metric_key ON public.cache_metrics USING btree (store_id, metric_key);

CREATE UNIQUE INDEX ux_campaign_landing_pages_store_landing_key ON public.campaign_landing_pages USING btree (store_id, landing_key);

CREATE UNIQUE INDEX ux_compliance_exports_store_export_key ON public.compliance_exports USING btree (store_id, export_key);

CREATE UNIQUE INDEX ux_cost_snapshots_store_snapshot_key ON public.cost_snapshots USING btree (store_id, snapshot_key);

CREATE UNIQUE INDEX ux_data_retention_jobs_store_job_key ON public.data_retention_jobs USING btree (store_id, job_key);

CREATE UNIQUE INDEX ux_final_commercial_assessments_store_key ON public.final_commercial_assessments USING btree (store_id, assessment_key);

CREATE UNIQUE INDEX ux_final_scale_reports_store_key ON public.final_scale_reports USING btree (store_id, report_key);

CREATE UNIQUE INDEX ux_final_technical_assessments_store_key ON public.final_technical_assessments USING btree (store_id, assessment_key);

CREATE UNIQUE INDEX ux_investor_readiness_checks_store_key ON public.investor_readiness_checks USING btree (store_id, check_key);

CREATE UNIQUE INDEX ux_load_test_scenarios_store_scenario ON public.load_test_scenarios USING btree (store_id, scenario_key);

CREATE UNIQUE INDEX ux_mobile_app_readiness_area_check ON public.mobile_app_readiness_checks USING btree (area, check_key);

CREATE UNIQUE INDEX ux_mobile_app_readiness_store_area_check ON public.mobile_app_readiness_checks USING btree (store_id, area, check_key);

CREATE UNIQUE INDEX ux_mobile_app_readiness_store_check ON public.mobile_app_readiness_checks USING btree (store_id, check_key);

CREATE UNIQUE INDEX ux_operating_cost_summaries_store_period_key ON public.operating_cost_summaries USING btree (store_id, period, cost_key);

CREATE UNIQUE INDEX ux_performance_test_runs_store_run_key ON public.performance_test_runs USING btree (store_id, run_key);

CREATE UNIQUE INDEX ux_permission_review_runs_store_run_key ON public.permission_review_runs USING btree (store_id, run_key);

CREATE UNIQUE INDEX ux_query_profile_events_store_profile_key ON public.query_profile_events USING btree (store_id, profile_key);

CREATE UNIQUE INDEX ux_railway_optimization_store_check ON public.railway_optimization_checks USING btree (store_id, check_key);

CREATE UNIQUE INDEX ux_resource_usage_alerts_store_alert_key ON public.resource_usage_alerts USING btree (store_id, alert_key);

CREATE UNIQUE INDEX ux_scale_capacity_assessments_store_key ON public.scale_capacity_assessments USING btree (store_id, capacity_key);

CREATE UNIQUE INDEX ux_scale_decision_records_store_key ON public.scale_decision_records USING btree (store_id, decision_key);

CREATE UNIQUE INDEX ux_sensitive_action_approvals_store_action_key ON public.sensitive_action_approvals USING btree (store_id, action_key);

CREATE UNIQUE INDEX ux_slow_query_reports_store_report_key ON public.slow_query_reports USING btree (store_id, report_key);

CREATE UNIQUE INDEX ux_strategic_risk_matrix_store_key ON public.strategic_risk_matrix USING btree (store_id, risk_key);

CREATE UNIQUE INDEX ux_strategic_roadmap_items_store_key ON public.strategic_roadmap_items USING btree (store_id, roadmap_key);

CREATE UNIQUE INDEX ux_supabase_optimization_store_check ON public.supabase_optimization_checks USING btree (store_id, check_key);

CREATE UNIQUE INDEX ux_technical_debt_matrix_store_key ON public.technical_debt_matrix USING btree (store_id, debt_key);

CREATE UNIQUE INDEX ux_web_push_subscriptions_endpoint ON public.web_push_subscriptions USING btree (endpoint);

CREATE UNIQUE INDEX ux_web_push_subscriptions_store_endpoint ON public.web_push_subscriptions USING btree (store_id, endpoint);

CREATE TRIGGER trg_ab_experiment_definitions_updated_at
  BEFORE UPDATE ON public.ab_experiment_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_ab_experiment_variants_updated_at
  BEFORE UPDATE ON public.ab_experiment_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_ab_test_prioritization_items_updated_at
  BEFORE UPDATE ON public.ab_test_prioritization_items
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_ads_api_sync_events_updated_at
  BEFORE UPDATE ON public.ads_api_sync_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_normalize_ai_assistant_sessions
  BEFORE INSERT OR UPDATE ON public.ai_assistant_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_ai_commerce_core();

CREATE TRIGGER trg_normalize_ai_faq_entries
  BEFORE INSERT OR UPDATE ON public.ai_faq_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_ai_commerce_core();

CREATE TRIGGER trg_normalize_ai_search_queries
  BEFORE INSERT OR UPDATE ON public.ai_search_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_ai_commerce_core();

CREATE TRIGGER trg_analytics_destination_events_updated_at
  BEFORE UPDATE ON public.analytics_destination_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_board_investor_reporting_packets_updated_at
  BEFORE UPDATE ON public.board_investor_reporting_packets
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_business_command_center_reports_updated_at
  BEFORE UPDATE ON public.business_command_center_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_business_intelligence_insights_updated_at
  BEFORE UPDATE ON public.business_intelligence_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_campaign_followup_automations_updated_at
  BEFORE UPDATE ON public.campaign_followup_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_campaign_iteration_records_updated_at
  BEFORE UPDATE ON public.campaign_iteration_records
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_normalize_campaign_landing_pages_pl24
  BEFORE INSERT OR UPDATE ON public.campaign_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_campaign_landing_pages_pl24();

CREATE TRIGGER trg_channel_behavior_analytics_updated_at
  BEFORE UPDATE ON public.channel_behavior_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_channel_campaign_comparison_reports_updated_at
  BEFORE UPDATE ON public.channel_campaign_comparison_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_commercial_bottleneck_reports_updated_at
  BEFORE UPDATE ON public.commercial_bottleneck_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_commercial_technical_alert_rules_updated_at
  BEFORE UPDATE ON public.commercial_technical_alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_complaints_returns_cases_updated_at
  BEFORE UPDATE ON public.complaints_returns_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_continuous_improvement_reports_updated_at
  BEFORE UPDATE ON public.continuous_improvement_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_conversion_learning_results_updated_at
  BEFORE UPDATE ON public.conversion_learning_results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_conversion_optimization_experiments_updated_at
  BEFORE UPDATE ON public.conversion_optimization_experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_customer_satisfaction_measurements_updated_at
  BEFORE UPDATE ON public.customer_satisfaction_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_sync_customer_segments_slug
  BEFORE INSERT OR UPDATE ON public.customer_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_customer_segments_slug();

CREATE TRIGGER trg_customer_success_snapshots_updated_at
  BEFORE UPDATE ON public.customer_success_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_daily_commercial_health_checks_updated_at
  BEFORE UPDATE ON public.daily_commercial_health_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_daily_technical_health_checks_updated_at
  BEFORE UPDATE ON public.daily_technical_health_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_email_provider_sync_events_updated_at
  BEFORE UPDATE ON public.email_provider_sync_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_executive_decision_priorities_updated_at
  BEFORE UPDATE ON public.executive_decision_priorities
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_executive_kpi_snapshots_updated_at
  BEFORE UPDATE ON public.executive_kpi_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_executive_workflow_automations_updated_at
  BEFORE UPDATE ON public.executive_workflow_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_experiment_decision_records_updated_at
  BEFORE UPDATE ON public.experiment_decision_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_external_integration_connections_updated_at
  BEFORE UPDATE ON public.external_integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_financial_forecast_snapshots_updated_at
  BEFORE UPDATE ON public.financial_forecast_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_full_funnel_analytics_snapshots_updated_at
  BEFORE UPDATE ON public.full_funnel_analytics_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_growth_iteration_loop_actions_updated_at
  BEFORE UPDATE ON public.growth_iteration_loop_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_inventory_demand_forecasts_updated_at
  BEFORE UPDATE ON public.inventory_demand_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_live_operations_snapshots_updated_at
  BEFORE UPDATE ON public.live_operations_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_normalize_mobile_app_readiness_checks
  BEFORE INSERT OR UPDATE ON public.mobile_app_readiness_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_mobile_app_readiness_checks();

CREATE TRIGGER trg_nps_csat_surveys_updated_at
  BEFORE UPDATE ON public.nps_csat_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_operating_system_review_runs_updated_at
  BEFORE UPDATE ON public.operating_system_review_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.pl28_set_updated_at();

CREATE TRIGGER trg_operational_anomaly_events_updated_at
  BEFORE UPDATE ON public.operational_anomaly_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_orders_status_timeline_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.record_order_status_timeline_change();

CREATE TRIGGER trg_outbound_webhook_deliveries_updated_at
  BEFORE UPDATE ON public.outbound_webhook_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE TRIGGER trg_post_purchase_email_optimizations_updated_at
  BEFORE UPDATE ON public.post_purchase_email_optimizations
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_post_purchase_experience_checks_updated_at
  BEFORE UPDATE ON public.post_purchase_experience_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_proactive_operations_reports_updated_at
  BEFORE UPDATE ON public.proactive_operations_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_real_sales_measurements_updated_at
  BEFORE UPDATE ON public.real_sales_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_recurring_customer_conversion_reports_updated_at
  BEFORE UPDATE ON public.recurring_customer_conversion_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_recurring_review_schedules_updated_at
  BEFORE UPDATE ON public.recurring_review_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_repeat_purchase_measurements_updated_at
  BEFORE UPDATE ON public.repeat_purchase_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_retention_activation_runs_updated_at
  BEFORE UPDATE ON public.retention_activation_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_revenue_conversion_risk_notifications_updated_at
  BEFORE UPDATE ON public.revenue_conversion_risk_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_risk_cost_control_snapshots_updated_at
  BEFORE UPDATE ON public.risk_cost_control_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.pl26_set_updated_at();

CREATE TRIGGER trg_scheduled_report_definitions_updated_at
  BEFORE UPDATE ON public.scheduled_report_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_scheduled_report_runs_updated_at
  BEFORE UPDATE ON public.scheduled_report_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_normalize_skincare_synonyms
  BEFORE INSERT OR UPDATE ON public.skincare_synonyms
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_ai_commerce_core();

CREATE TRIGGER trg_support_followup_tasks_updated_at
  BEFORE UPDATE ON public.support_followup_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.pl27_set_updated_at();

CREATE TRIGGER trg_support_retention_followup_automations_updated_at
  BEFORE UPDATE ON public.support_retention_followup_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.pl29_set_updated_at();

CREATE TRIGGER trg_unit_economics_snapshots_updated_at
  BEFORE UPDATE ON public.unit_economics_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_macro_final_a();

CREATE POLICY "Allow Uploads" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((bucket_id = 'products'::text));

CREATE POLICY "Public Access" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'products'::text));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON COLUMN "public"."products"."ingredients" IS 'Structured product ingredient/use details for the product detail page.';

COMMENT ON COLUMN "public"."products"."long_description" IS 'Long-form public product description for richer storefront content.';

COMMENT ON COLUMN "public"."products"."seo_description" IS 'Product-specific SEO description shown in meta and Open Graph tags.';

COMMENT ON COLUMN "public"."products"."seo_title" IS 'Product-specific SEO title shown in meta and Open Graph tags.';

COMMENT ON COLUMN "public"."products"."slug" IS 'Public product slug used for canonical product URLs and sitemap entries.';

COMMENT ON EXTENSION "unaccent" IS 'text search dictionary that removes accents';

GRANT EXECUTE ON FUNCTION "public"."claim_abandoned_carts_for_recovery"(integer, text, timestamp WITH time zone) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."claim_email_queue_for_delivery"(integer, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."finalize_paid_order"(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."finalize_paid_order"(uuid, text, text, text) FROM "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."finalize_paid_order"(uuid, text, text, text) TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."normalize_ai_commerce_core"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."normalize_campaign_landing_pages_pl24"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."normalize_mobile_app_readiness_checks"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."pl26_set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."pl27_set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."pl28_set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."pl29_set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."record_order_status_timeline_change"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."restock_refunded_order"(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."restock_refunded_order"(uuid) FROM "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."restock_refunded_order"(uuid) TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at_macro_final_a"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."sync_customer_segments_slug"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."_dummy_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."_dummy" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ab_experiment_definitions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ab_experiment_variants" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."ab_test_prioritization_items"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ab_test_variants" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ab_tests" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."abandoned_cart_recovery_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."abandoned_carts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."abandonment_analysis_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."abuse_detection_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."accessibility_validation_items"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounting_adjustments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ad_platform_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_action_trails" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_assignments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_bulk_action_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_dashboard_views" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."admin_endpoint_optimization_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_notifications" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_permissions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_role_permissions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_roles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_team_members" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_ux_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_work_queue_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_work_queues" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ads_api_sync_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."advanced_admin_audit_entries"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_assistant_messages" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_assistant_sessions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_faq_entries" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_faq_interactions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_intent_scores" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_product_discovery_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_recommendation_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_recommendation_rules" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_search_insight_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_search_queries" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."analytics_destination_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."audit_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automation_executions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automation_jobs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automation_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."automation_triggers" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."banner_card_button_form_standards"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."behavior_feedback_loop_actions"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."board_investor_reporting_packets"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."brand_microcopy_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."brand_readiness_reports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."business_command_center_reports"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."business_intelligence_insights"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cac_roas_measurements" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cache_metrics" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."campaign_adjustment_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."campaign_asset_readiness" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."campaign_attribution" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."campaign_followup_automations"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."campaign_iteration_records" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."campaign_landing_pages" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."campaign_orchestration_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."campaign_page_readiness" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_import_batches" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_import_rows" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."category_collections" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cdp_segment_memberships" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."channel_behavior_analytics" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."channel_campaign_comparison_reports"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."channel_inventory_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."channel_performance_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."channel_pricing_rules" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."channel_product_feeds" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."channel_sync_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."checkout_live_monitoring_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."checkout_optimization_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."checkout_real_flow_validations"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."checkout_ux_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."commercial_bottleneck_reports"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commercial_campaigns" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."commercial_content_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."commercial_technical_alert_rules"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."complaints_returns_cases" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."compliance_exports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."compliance_operations_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."content_readiness_reports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."continuous_improvement_reports"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."controlled_marketing_launches"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversion_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversion_learning_results" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."conversion_optimization_experiments"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversion_qa_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversion_trust_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cost_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."coupons" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."crm_contacts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."crm_segments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."customer_data_platform_profiles"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_journey_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_loyalty_accounts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."customer_loyalty_transactions"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_metrics" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."customer_notification_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."customer_personalization_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_preferences" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_rebuy_lists" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_recommendations" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."customer_satisfaction_measurements"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_segments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_service_notes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_subscriptions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_success_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_touchpoints" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."customer_wallet_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."daily_commercial_health_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."daily_technical_health_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."data_retention_jobs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."design_system_tokens" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."educational_content_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_delivery_attempts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_provider_sync_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_queue" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_suppression_list" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."email_template_catalog" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."email_template_preview_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."endpoint_performance_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."enterprise_security_audit_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."executive_decision_priorities"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."executive_kpi_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."executive_workflow_automations"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."experiment_decision_records" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."external_integration_connections"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."external_order_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."external_orders" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."final_commercial_assessments"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."final_scale_reports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."final_technical_assessments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."finance_daily_closes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."finance_exports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."finance_reconciliation_items"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."finance_reconciliation_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."financial_forecast_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."friction_prioritization_items"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."frontend_polish_tasks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fulfillment_batches" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fulfillment_queue" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."full_funnel_analytics_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."growth_iteration_loop_actions"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."internationalization_locales"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inventory_demand_forecasts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inventory_movements" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."inventory_planning_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."investment_scaling_decisions"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."investor_readiness_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."journey_steps" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."landing_page_conversion_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."landing_sections" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lifecycle_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lifecycle_journeys" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."live_behavior_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."live_operations_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."load_test_scenarios" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."localized_content_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."maintenance_mode_controls" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."marketing_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."marketing_launch_readiness_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."merchandising_rules" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mobile_app_readiness_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mobile_checkout_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mobile_install_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."mobile_offline_catalog_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."mobile_performance_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mobile_pwa_sessions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."mobile_real_device_validations"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mobile_retention_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."mobile_touch_optimization_events"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."mobile_ux_validation_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."monthly_operations_checklist_items"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."monthly_operations_checklists"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."multi_currency_settings" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."newsletter_subscribers" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."nps_csat_surveys" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."operating_cost_summaries" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."operating_system_review_runs"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."operational_anomaly_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."operational_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_incidents" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."order_timeline" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orders" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."organic_traffic_readiness_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."outbound_webhook_deliveries" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."paid_traffic_campaign_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."paid_traffic_campaigns" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."paid_traffic_landing_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."performance_test_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."permission_review_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."permission_review_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."personalization_profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."post_purchase_email_optimizations"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."post_purchase_experience_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."proactive_operations_reports"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_category_copy_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."product_content_completion_items"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_feeds" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_media_assets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_publish_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_v2_roadmap_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."production_content_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projected_stock_alerts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."public_content_pages" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchase_order_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."purchase_orders" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."query_profile_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."railway_optimization_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."real_sales_measurements" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."real_user_feedback_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."real_user_test_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recommendation_engine_rules" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recommendation_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."recurring_customer_conversion_reports"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recurring_review_schedules" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."repeat_purchase_measurements"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."resource_usage_alerts" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."retention_activation_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."returns_requests" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."reusable_component_standards"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."revenue_conversion_risk_notifications"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."revenue_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."revenue_validation_snapshots"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."review_requests" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."risk_cost_control_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sales_channels" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."scale_capacity_assessments" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."scale_decision_records" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."scale_governance_freeze_records"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."scheduled_report_definitions"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."scheduled_report_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."search_intent_optimization_items"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."security_hardening_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sensitive_action_approvals" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seo_content_depth_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."skincare_synonyms" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."slow_query_reports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stores" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."strategic_risk_matrix" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."strategic_roadmap_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."stripe_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."supabase_optimization_checks"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."supplier_catalog_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."supplier_lead_time_logs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."supplier_margin_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."supplier_product_costs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."supplier_replenishment_suggestions"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."suppliers" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_followup_tasks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_messages" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_response_templates" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."support_retention_followup_automations"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_sla_policies" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_ticket_messages" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_tickets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tax_legal_readiness_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."technical_debt_matrix" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."traffic_quality_reports" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."trust_badges" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."unit_economics_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_session_replay_markers" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."users" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."utm_sessions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ux_ui_audit_items" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ux_ui_audit_runs" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."visual_brand_systems" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."visual_consistency_checks" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."visual_regression_snapshots" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."web_push_subscriptions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wishlist_items" TO "anon", "authenticated", "postgres", "service_role";
