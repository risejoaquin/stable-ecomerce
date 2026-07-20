import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const {data} = await supabase.from('stores').select('id, owner_user_id, config').limit(1);
  console.log(data);
}
run();
