import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: users } = await supabase.from('users').select('*').limit(1);
  const { data: orders } = await supabase.from('orders').select('*').limit(1);
  console.log('Users:', users);
  console.log('Orders:', orders);
}
run();
