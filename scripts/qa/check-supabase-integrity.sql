-- Supabase integrity checks for production sign-off.

SELECT 'negative_stock_products' AS check_name, COUNT(*) AS count
FROM products
WHERE stock < 0;

SELECT 'orders_without_items' AS check_name, COUNT(*) AS count
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id);

SELECT 'paid_orders_without_paid_at' AS check_name, COUNT(*) AS count
FROM orders
WHERE status IN ('pagado', 'empacado', 'enviado', 'entregado')
  AND paid_at IS NULL;

SELECT 'inventory_exceptions' AS check_name, COUNT(*) AS count
FROM orders
WHERE status = 'inventory_exception';

SELECT 'unresolved_stripe_events' AS check_name, COUNT(*) AS count
FROM stripe_events
WHERE error_message IS NOT NULL;
