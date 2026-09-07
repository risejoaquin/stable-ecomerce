-- Selfcare Sinners - Phase D Storefront Completion & Customer Experience
-- Safe to run after 001/002/003/004 migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb;

-- D.0: database-level timeline safety net. This captures real status changes
-- even if the API timeline insert is skipped by schema cache, deployment timing,
-- or future route regressions.
CREATE OR REPLACE FUNCTION public.record_order_status_timeline_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orders_status_timeline_change ON public.orders;
CREATE TRIGGER trg_orders_status_timeline_change
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_order_status_timeline_change();

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_order_timeline_event_type_created_at ON order_timeline(event_type, created_at DESC);

NOTIFY pgrst, 'reload schema';
