export interface Store {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  config: StoreConfig;
  plan: string;
  status: string;
  createdAt: string;
}

export interface StoreConfig {
  themeColor: string;
  fontFamily: string;
  logoUrl?: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  slug: string;
}

export interface Order {
  id: string;
  storeId: string;
  customerUserId?: string;
  status: 'pendiente' | 'pagado' | 'empacado' | 'enviado' | 'entregado' | 'cancelado';
  total: number;
  stripeSessionId?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Cart {
  storeId: string;
  items: CartItem[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
}
