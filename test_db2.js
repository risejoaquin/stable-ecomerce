import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users } = await supabase.from('users').select('*');
  console.log("Users:", users);
}
check();
