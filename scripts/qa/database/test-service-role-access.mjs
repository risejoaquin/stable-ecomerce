import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(2);
}

const serviceClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const dummyUuid = '00000000-0000-0000-0000-000000000000';

async function testServiceRole() {
  const res1 = await serviceClient.rpc('finalize_paid_order', {
    order_id_input: dummyUuid,
    stripe_session_id_input: 'test_session',
    stripe_payment_intent_id_input: 'test_pi',
    customer_email_input: 'test@example.com'
  });

  const res2 = await serviceClient.rpc('restock_refunded_order', {
    order_id_input: dummyUuid
  });

  console.log('service_role finalize_paid_order:', res1);
  console.log('service_role restock_refunded_order:', res2);
}

await testServiceRole();
