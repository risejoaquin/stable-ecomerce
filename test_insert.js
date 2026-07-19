import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('products').insert([{
    name: 'Test', price: 10, stock: 10, category: 'cat', brand: 'brand', variants: {a: 1}, images: ['a']
  }]).select();
  console.log(error);
}
run();
