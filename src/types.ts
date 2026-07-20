export interface StoreConfig {
  themeColor: string;
  fontFamily: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  brand?: string;
  category?: string;
  categories?: string[];
  subcategory?: string;
  variants?: { name: string; stock: number }[];
  status: string;
  images: string[];
}
