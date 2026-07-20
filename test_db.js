import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: row } = await supabase.from('products').select('*').limit(1);
  if (row && row.length > 0) {
    console.log(Object.keys(row[0]));
  } else {
    console.log("No rows");
  }
}
check();
