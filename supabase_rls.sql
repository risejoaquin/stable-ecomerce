-- 1. Ensure owner_user_id is UUID
ALTER TABLE stores ALTER COLUMN owner_user_id TYPE UUID USING owner_user_id::uuid;

-- 2. Ensure customer_user_id in orders is UUID
ALTER TABLE orders ALTER COLUMN customer_user_id TYPE UUID USING customer_user_id::uuid;

-- Enable RLS on tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- STORES POLICIES
-- -------------------------------------------------------------
-- Public can view active stores
CREATE POLICY "Public can view active stores" ON stores
FOR SELECT USING (status = 'active');

-- Owners can CRUD their own store
CREATE POLICY "Owners can view own store" ON stores
FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update own store" ON stores
FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can delete own store" ON stores
FOR DELETE USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can insert own store" ON stores
FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- -------------------------------------------------------------
-- PRODUCTS POLICIES
-- -------------------------------------------------------------
-- Public can view products of active stores
CREATE POLICY "Public can view active store products" ON products
FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.status = 'active')
);

-- Store owners can manage their products
CREATE POLICY "Store owners can insert products" ON products
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_user_id = auth.uid())
);
CREATE POLICY "Store owners can update products" ON products
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_user_id = auth.uid())
);
CREATE POLICY "Store owners can delete products" ON products
FOR DELETE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.owner_user_id = auth.uid())
);

-- -------------------------------------------------------------
-- ORDERS POLICIES
-- -------------------------------------------------------------
-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
FOR SELECT USING (auth.uid() = customer_user_id);

-- Store owners can view orders for their store
CREATE POLICY "Store owners can view their store orders" ON orders
FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_user_id = auth.uid())
);

-- Store owners can update their store orders (e.g. status)
CREATE POLICY "Store owners can update their store orders" ON orders
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.owner_user_id = auth.uid())
);

-- Order creation is typically done via a secure backend, but if client-side:
CREATE POLICY "Users can create orders" ON orders
FOR INSERT WITH CHECK (auth.uid() = customer_user_id);

-- -------------------------------------------------------------
-- REVIEWS POLICIES
-- -------------------------------------------------------------
-- Public can view reviews
CREATE POLICY "Public can view reviews" ON reviews
FOR SELECT USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Users can insert reviews" ON reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Store owners can delete reviews of their products
CREATE POLICY "Store owners can delete reviews" ON reviews
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM products 
    JOIN stores ON stores.id = products.store_id 
    WHERE products.id = reviews.product_id AND stores.owner_user_id = auth.uid()
  )
);

-- -------------------------------------------------------------
-- WISHLIST POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Users can view own wishlist" ON wishlist_items
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own wishlist" ON wishlist_items
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own wishlist" ON wishlist_items
FOR DELETE USING (auth.uid() = user_id);

-- -------------------------------------------------------------
-- COUPONS POLICIES
-- -------------------------------------------------------------
-- Public can view active coupons
CREATE POLICY "Public can view active coupons" ON coupons
FOR SELECT USING (status = 'active');

-- Store owners can manage coupons
CREATE POLICY "Store owners can manage coupons" ON coupons
FOR ALL USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = coupons.store_id AND stores.owner_user_id = auth.uid())
);
