import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

const resendImport = `import { Resend } from 'resend';\n`;
if (!code.includes("import { Resend }")) {
    code = code.replace("import Stripe from 'stripe';", "import Stripe from 'stripe';\n" + resendImport);
}

const emailInit = `
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Store <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  if (!resend) {
    console.log(\`[Email Mock] To: \${to} | Subject: \${subject}\`);
    return;
  }
  try {
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    console.log(\`Email sent to \${to}\`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}
`;

if (!code.includes("const RESEND_API_KEY =")) {
    code = code.replace("const PORT = process.env.PORT || 3000;", "const PORT = process.env.PORT || 3000;\n" + emailInit);
}

// Modify webhook to send emails
const webhookCode = `
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId && supabase) {
        // Update order status to paid
        const { data: order, error } = await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId).select().single();
        
        // Decrement stock
        const { data: orderItems } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderId);
        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            // Fetch current product to safely decrement stock
            const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
            if (product && typeof product.stock === 'number') {
              const newStock = Math.max(0, product.stock - item.quantity);
              await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
            }
          }
        }

        // Send Email Notifications
        if (order && !error) {
           const customerEmail = session.customer_details?.email || order.customer_email;
           
           // Admin Notification
           await sendEmail({
             to: ADMIN_EMAIL,
             subject: \`New Order Received: #\${order.id.split('-')[0]}\`,
             html: \`<p>A new order has been placed for $\${order.total}.</p><p>Order ID: \${order.id}</p>\`
           });

           // Customer Confirmation
           if (customerEmail) {
             const itemsHtml = orderItems ? orderItems.map(item => \`<li>\${item.quantity}x \${item.products?.name} - $\${item.unit_price}</li>\`).join('') : '';
             await sendEmail({
               to: customerEmail,
               subject: \`Order Confirmation: #\${order.id.split('-')[0]}\`,
               html: \`<h1>Thank you for your order!</h1><p>We have received your order and it is now being processed.</p><ul>\${itemsHtml}</ul><p>Total: $\${order.total}</p>\`
             });
           }
        }
      }
    }
`;

const webhookRegex = /if \(event\.type === 'checkout\.session\.completed'\) \{[\s\S]*?res\.json\(\{received: true\}\);/m;
code = code.replace(webhookRegex, webhookCode.trim() + '\n\n    res.json({received: true});');


// Modify put order status
const putStatusRegex = /const \{ data, error \} = await supabase\.from\('orders'\)\.update\(\{ status \}\)\.eq\('id', id\)\.eq\('store_id', store\.id\)\.select\(\)\.single\(\);\n\s*if \(error\) throw error;\n\s*res\.json\(data\);/m;
const putStatusNewCode = `
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).eq('store_id', store.id).select().single();
      if (error) throw error;
      
      // Send Email Notification on Status Update
      if (['shipped', 'cancelled'].includes(status)) {
         let customerEmail = data.customer_email;
         if (stripe && data.stripe_session_id && !customerEmail) {
            try {
              const session: any = await stripe.checkout.sessions.retrieve(data.stripe_session_id);
              customerEmail = session.customer_details?.email;
            } catch(e) {}
         }
         
         if (customerEmail) {
           const statusText = status === 'shipped' ? 'has been shipped' : 'has been cancelled';
           await sendEmail({
             to: customerEmail,
             subject: \`Order Update: #\${data.id.split('-')[0]} \${statusText}\`,
             html: \`<p>Your order #\${data.id.split('-')[0]} \${statusText}.</p>\`
           });
         }
      }
      
      res.json(data);
`;
code = code.replace(putStatusRegex, putStatusNewCode.trim());


fs.writeFileSync('server.ts', code);
