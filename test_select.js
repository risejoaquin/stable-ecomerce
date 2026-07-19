import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) console.log(error);
  // Just print out the keys of a product if any exist, or we can't...
}
run();
