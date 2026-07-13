import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'lucilfer@example.com',
    password: 'yungbill',
  });
  console.log(error ? 'Error: ' + error.message : 'Success: ' + data.user.id);
}
run();
