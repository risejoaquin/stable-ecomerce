DO $$ 
DECLARE 
  target_store_id UUID;
BEGIN
  -- Get the first available store (if you already created one via the app)
  SELECT id INTO target_store_id FROM stores LIMIT 1;

  -- If no store exists, create a dummy one
  IF target_store_id IS NULL THEN
    INSERT INTO stores (owner_user_id, name, slug, description, config) 
    VALUES (
      'dummy_owner_' || substr(md5(random()::text), 1, 10), 
      'Terra & Tide', 
      'terra-and-tide', 
      'Handcrafted artisan goods',
      '{"themeColor": "#6B705C"}'::jsonb
    )
    RETURNING id INTO target_store_id;
  END IF;

  -- Insert dummy products
  INSERT INTO products (store_id, name, description, price, stock, images) VALUES 
  (
    target_store_id, 
    'Ceramic Matcha Bowl', 
    'Hand-thrown ceramic matcha bowl with a beautiful earthy glaze.', 
    35.00, 
    15, 
    ARRAY['https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?auto=format&fit=crop&q=80&w=800']
  ),
  (
    target_store_id, 
    'Linen Apron', 
    '100% pure linen apron in olive green. Perfect for baking or pottery.', 
    48.00, 
    20, 
    ARRAY['https://images.unsplash.com/photo-1581691238965-0453f2bd22e5?auto=format&fit=crop&q=80&w=800']
  ),
  (
    target_store_id, 
    'Beeswax Taper Candles', 
    'Set of 2 hand-dipped beeswax taper candles. Burns clean and bright.', 
    18.50, 
    50, 
    ARRAY['https://images.unsplash.com/photo-1549429712-4a0b22cb33be?auto=format&fit=crop&q=80&w=800']
  ),
  (
    target_store_id, 
    'Wooden Serving Spoon', 
    'Carved from sustainable walnut wood. Each piece is unique.', 
    24.00, 
    10, 
    ARRAY['https://images.unsplash.com/photo-1582293041079-7914e2db9918?auto=format&fit=crop&q=80&w=800']
  );
END $$;
