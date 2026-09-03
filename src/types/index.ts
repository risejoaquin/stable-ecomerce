export interface Store {
  id: string;
  name: string;
  slug: string;
  ownerUserId?: string;
  owner_user_id?: string;
  config: StoreConfig;
  plan?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

export interface StoreConfig {
  themeColor: string;
  fontFamily: string;
  logoUrl?: string;
  logo_url?: string;
  buttonColor?: string;
  button_color?: string;
  [key: string]: unknown;
}

export interface ProductVariant {
  id?: string;
  name: string;
  stock: number;
  price?: number;
  sku?: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  storeId?: string;
  store_id?: string;
  name: string;
  slug?: string;
  description?: string;
  long_description?: string;
  price: number;
  stock: number;
  brand?: string;
  category?: string;
  categories?: string[];
  categoryIds?: string[];
  category_ids?: string[];
  subcategory?: string;
  variants?: ProductVariant[];
  status?: string;
  images: string[];
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Category {
  id: string;
  storeId?: string;
  store_id?: string;
  name: string;
  slug: string;
}

export interface Order {
  id: string;
  storeId?: string;
  store_id?: string;
  customerUserId?: string;
  customer_user_id?: string;
  status: 'pendiente' | 'pagado' | 'empacado' | 'enviado' | 'entregado' | 'cancelado' | string;
  total: number;
  stripeSessionId?: string;
  stripe_session_id?: string;
  createdAt?: string;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  order_id?: string;
  productId?: string;
  product_id?: string;
  quantity: number;
  unitPrice?: number;
  unit_price?: number;
}

export interface CartItem {
  productId: string;
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Cart {
  storeId?: string;
  store_id?: string;
  items: CartItem[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  role?: string;
}
