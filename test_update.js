import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('stores')
        .update({ config: { test: 1 } })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select().single();
  console.log("Error:", error);
}
check();
