import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('stores').select('*');
  console.log('Stores:', JSON.stringify({ data, error }, null, 2));
}
run();
