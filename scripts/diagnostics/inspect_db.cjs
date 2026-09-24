const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const tables = ['stores', 'users', 'products', 'orders', 'order_items', 'coupons', 'abandoned_carts', 'reviews'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`\n--- ${table} ---`);
    if (error) {
      console.error(error);
    } else if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No data found, can't infer schema.");
    }
  }
}
inspect();
