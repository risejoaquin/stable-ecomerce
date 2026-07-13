import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: stores } = await supabase.from('stores').select('*').limit(1);
  const store = stores[0];

  await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('wishlist_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().eq('store_id', store.id);

  const products = [
    {
      store_id: store.id,
      name: "Jordan 1 Triple White",
      description: "Classic Jordan 1s in an all-white colorway. Timeless, versatile, and essential for any sneaker rotation.",
      price: 150,
      stock: 50,
      images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"]
    },
    {
      store_id: store.id,
      name: "Muha Meds Habibi Wax Pen",
      description: "Premium wax pen featuring the exclusive Habibi flavor blend. Smooth and robust.",
      price: 45,
      stock: 100,
      images: ["https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?auto=format&fit=crop&w=800&q=80"]
    },
    {
      store_id: store.id,
      name: "Purple Label Denim Pants",
      description: "High-quality denim pants from Purple Label. Features a modern fit, premium wash, and comfortable construction.",
      price: 250,
      stock: 30,
      images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80"]
    }
  ];

  const { error } = await supabase.from('products').insert(products);
  if (error) console.error('Insert error:', error);
  else console.log('Products inserted');
}
run();
