import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY are required.');
  process.exit(2);
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const dummyUuid = '00000000-0000-0000-0000-000000000000';

async function testAccess() {
  const results = {};

  // 1. finalize_paid_order via anon
  const res1 = await anonClient.rpc('finalize_paid_order', {
    order_id_input: dummyUuid,
    stripe_session_id_input: 'test',
    stripe_payment_intent_id_input: 'test',
    customer_email_input: 'test@example.com'
  });
  results.finalize_paid_order = {
    error: res1.error ? { code: res1.error.code, message: res1.error.message } : null,
    blocked: !!res1.error
  };

  // 2. restock_refunded_order via anon
  const res2 = await anonClient.rpc('restock_refunded_order', {
    order_id_input: dummyUuid
  });
  results.restock_refunded_order = {
    error: res2.error ? { code: res2.error.code, message: res2.error.message } : null,
    blocked: !!res2.error
  };

  // 3. decrement_stock via anon (should not exist / 404)
  const res3 = await anonClient.rpc('decrement_stock', {
    product_id: dummyUuid,
    quantity: 1
  });
  results.decrement_stock = {
    error: res3.error ? { code: res3.error.code, message: res3.error.message } : null,
    blocked: !!res3.error
  };

  // 4. consume_coupon_after_payment via anon (should not exist / 404)
  const res4 = await anonClient.rpc('consume_coupon_after_payment', {
    coupon_code_input: 'TEST',
    store_id_input: dummyUuid
  });
  results.consume_coupon_after_payment = {
    error: res4.error ? { code: res4.error.code, message: res4.error.message } : null,
    blocked: !!res4.error
  };

  console.log(JSON.stringify(results, null, 2));
}

await testAccess();
