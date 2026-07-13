import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';

import jwt from 'jsonwebtoken';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

const requireAuth = () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, SUPABASE_JWT_SECRET);
      req.auth = { userId: decoded.sub, email: decoded.email };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
};

const optionalAuth = () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, SUPABASE_JWT_SECRET);
        req.auth = { userId: decoded.sub, email: decoded.email };
      } catch (err) {
        // Ignore
      }
    }
    next();
  };
};

import multer from 'multer';

// --- CONFIG ---


const PORT = 3000;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Store <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  if (!resend) {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Lazy initialization of clients to avoid crashing if env vars are missing
let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });
}


const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
    }
  }
});


async function startServer() {
  const app = express();

  app.use(cors());

  app.use(helmet({
    contentSecurityPolicy: false, // Too restrictive for preview envs, but basic protections apply
  }));

  const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many orders created, please try again later.' });
  const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many checkout attempts, please try again later.' });
  const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: 'Too many contact messages, please try again later.' });


  // Stripe webhook needs raw body
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send('Stripe not configured');
    }
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    console.log(`Received Stripe event: ${event.type}`);

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
             subject: `New Order Received: #${order.id.split('-')[0]}`,
             html: `<p>A new order has been placed for ${order.total}.</p><p>Order ID: ${order.id}</p>`
           });

           // Customer Confirmation
           if (customerEmail) {
             const itemsHtml = orderItems ? orderItems.map(item => `<li>${item.quantity}x ${item.products?.name} - ${item.unit_price}</li>`).join('') : '';
             await sendEmail({
               to: customerEmail,
               subject: `Order Confirmation: #${order.id.split('-')[0]}`,
               html: `<h1>Thank you for your order!</h1><p>We have received your order and it is now being processed.</p><ul>${itemsHtml}</ul><p>Total: ${order.total}</p>`
             });
           }
        }
      }
    }

    res.json({received: true});
  });

  // Regular JSON middleware for other routes
  app.use(express.json());

  // Clerk middleware (optional auth on /api routes, use requireAuth() on specific routes to enforce)
  app.use('/api', optionalAuth());

  
  app.get('/api/orders/my', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('customer_user_id', req.auth.userId).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.get('/api/orders/track', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
      const email = req.query.email as string;
      const orderId = req.query.order_id as string;
      if (!email || !orderId) return res.status(400).json({ error: 'Email and order_id required' });

      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(name, images))').eq('id', orderId).ilike('customer_email', email).single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Order not found' });
      
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

// API Routes
  
  app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });
      
      const html = `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/>${message}</p>
      `;
      
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Contact from ${name}`,
        html
      });
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/health', async (req, res) => {
    // Check Supabase connection if configured
    let dbStatus = 'unconfigured';
    if (supabase) {
      try {
        const { error } = await supabase.from('_dummy').select('*').limit(1);
        dbStatus = 'connected';
      } catch (e) {
        dbStatus = 'error';
      }
    }
    res.json({ status: 'ok', database: dbStatus });
  });

  app.post('/api/orders', optionalAuth(), orderLimiter, async (req: any, res) => {
    const { items, storeId } = req.body;
    if (!supabase) return res.json({ id: 'dummy_order_' + Date.now(), total: 100 });

    try {
      if (!items || !items.length || !storeId) {
        return res.status(400).json({ error: 'Missing items or storeId' });
      }

      let total = 0;
      const orderItems = [];

      for (const item of items) {
        const { data: product } = await supabase.from('products').select('*').eq('id', item.productId).single();
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);
        
        total += product.price * item.quantity;
        orderItems.push({
          product_id: product.id,
          quantity: item.quantity,
          unit_price: product.price,
          name: product.name 
        });
      }

      let finalTotal = total;
      let couponCode = req.body.couponCode;
      let discountAmount = 0;
      
      if (couponCode) {
        const { data: coupon } = await supabase.from('coupons').select('*').eq('code', couponCode).eq('store_id', storeId).eq('is_active', true).single();
        if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) && (!coupon.max_uses || coupon.current_uses < coupon.max_uses) && (!coupon.min_order_amount || total >= coupon.min_order_amount)) {
            if (coupon.discount_type === 'percentage') {
                discountAmount = (total * coupon.discount_value) / 100;
            } else {
                discountAmount = coupon.discount_value;
            }
            finalTotal = total - discountAmount;
            if (finalTotal < 0) finalTotal = 0;
            
            await supabase.from('coupons').update({ current_uses: coupon.current_uses + 1 }).eq('id', coupon.id);
        } else {
            couponCode = null; // invalid
        }
      }

      // @ts-ignore
      const { data: order, error: orderError } = await supabase.from('orders').insert([{
        store_id: storeId,
        customer_user_id: req.auth?.userId || null,
        status: 'pending',
        total: finalTotal,
        coupon_code: couponCode,
        discount_amount: discountAmount
      }] as any[]).select().single();

      if (orderError) throw orderError;

      const itemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));
      
      // @ts-ignore
      await supabase.from('order_items').insert(itemsToInsert as any[]);

      res.json({ id: order.id, total });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/checkout', checkoutLimiter, async (req, res) => {
    const { orderId } = req.body;
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    try {
      let lineItems: any[] = [];
      let cancelUrl = `${req.protocol}://${req.get('host')}/`;
      
      if (supabase) {
        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (!order) throw new Error('Order not found');
        
        const { data: store } = await supabase.from('stores').select('slug').eq('id', order.store_id).single();
        if (store && store.slug) {
            cancelUrl = `${req.protocol}://${req.get('host')}/store/${store.slug}`;
        }

        const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);
        
        for (const item of orderItems || []) {
           const { data: product } = await supabase.from('products').select('name').eq('id', item.product_id).single();
           lineItems.push({
             price_data: {
               currency: 'usd',
               product_data: { name: product?.name || 'Product' },
               unit_amount: Math.round(item.unit_price * 100),
             },
             quantity: item.quantity
           });
        }
      } else {
        lineItems = [{
          price_data: { currency: 'usd', product_data: { name: 'Test Product' }, unit_amount: 2000 },
          quantity: 1
        }];
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'MX'] },
        success_url: `${req.protocol}://${req.get('host')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          order_id: orderId
        }
      });
      
      if (supabase && orderId) {
        await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', orderId);
      }

      res.json({ url: session.url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stores', requireAuth(), async (req: any, res) => {
    const userId = req.auth.userId;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    if (!supabase) {
      // Mock store creation for testing without Supabase
      return res.json({ id: 'store_' + Date.now(), name, slug: name.toLowerCase().replace(/ /g, '-'), ownerUserId: userId });
    }

    try {
      const slug = name.toLowerCase().replace(/ /g, '-');
      // @ts-ignore
      const { data, error } = await supabase.from('stores').insert([{
        name,
        slug,
        owner_user_id: userId,
        status: 'active',
        config: { themeColor: '#6B705C', fontFamily: 'sans-serif' }
      }] as any[]).select().single();

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/store', requireAuth(), async (req: any, res) => {
    const userId = req.auth.userId;
    
    // Simulate admin role check (in real app, check req.auth.sessionClaims.metadata.role)
    const isAdmin = true; // Assuming all authenticated users can access for now or check custom claim
    
    if (!supabase) return res.json({ hasStore: false, role: isAdmin ? 'admin' : 'user' });
    
    try {
      const { data, error } = await supabase.from('stores').select('*').eq('owner_user_id', userId).single();
      if (error) return res.json({ hasStore: false, role: isAdmin ? 'admin' : 'user' });
      res.json({ hasStore: true, store: data, role: isAdmin ? 'admin' : 'user' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/me', requireAuth(), (req: any, res) => {
    // Test auth route
    res.json({ userId: req.auth.userId });
  });

  // Admin orders
  
  app.get('/api/admin/orders', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ data: mockProducts, total: mockProducts.length, page: 1, pageSize: 20 });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });

      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);

      let query = supabase.from('orders').select('*, order_items(*)', { count: 'exact' }).eq('store_id', store.id);
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw error;
      res.json({ data: data || [], total: count || 0, page, pageSize });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/orders/:id', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: order, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('id', id).eq('store_id', store.id).single();
      if (error) throw error;
      let customerDetails = null;
      let shippingDetails = null;

      if (stripe && order.stripe_session_id) {
        try {
           const session: any = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
           customerDetails = session.customer_details;
           shippingDetails = session.shipping_details;
        } catch(e) {
           console.error("Failed to fetch stripe session", e);
        }
      }

      res.json({ ...order, customerDetails, shippingDetails });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/orders/:id/status', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const { status } = req.body;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });
      
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
             subject: `Order Update: #${data.id.split('-')[0]} ${statusText}`,
             html: `<p>Your order #${data.id.split('-')[0]} ${statusText}.</p>${status === 'shipped' && data.tracking_number ? `<p>Tracking Number: <strong>${data.tracking_number}</strong></p>` : ''}`
           });
         }
      }
      
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  
  app.put('/api/admin/orders/:id/tracking', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const { tracking_number, notes } = req.body;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });
      
      const { data, error } = await supabase.from('orders').update({ tracking_number, notes }).eq('id', id).eq('store_id', store.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

app.post('/api/admin/orders/:id/refund', requireAuth(), async (req: any, res) => {
    if (!supabase || !stripe) return res.status(500).json({ error: 'Not configured' });
    try {
      const { id } = req.params;
      const { amount } = req.body; // optional amount
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });
      
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', id).eq('store_id', store.id).single();
      if (error) throw error;
      if (!order || !order.stripe_session_id) return res.status(400).json({ error: 'Cannot refund this order' });

      const session: any = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (!session.payment_intent) return res.status(400).json({ error: 'No payment intent found' });
      
      const refundParams: any = {
        payment_intent: session.payment_intent as string,
      };
      if (amount) {
         refundParams.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundParams);
      
      // Update status to refunded
      const newStatus = amount && amount < order.total ? 'partially_refunded' : 'refunded';
      const { data: updatedOrder } = await supabase.from('orders').update({ status: newStatus }).eq('id', id).select().single();

      res.json(updatedOrder);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Product CRUD
  app.get('/api/admin/products', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.json([]);
      const { data, error } = await supabase.from('products').select('*').eq('store_id', store.id);
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/products', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ id: Date.now().toString(), ...req.body });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(404).json({ error: 'Store not found' });
      
      const newProduct = {
        ...req.body,
        store_id: store.id
      };
      // @ts-ignore
      const { data, error } = await supabase.from('products').insert([newProduct] as any[]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/products/:id', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ id: req.params.id, ...req.body });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(404).json({ error: 'Store not found' });
      
      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.store_id;

      const { data, error } = await supabase.from('products')
        .update(updateData)
        .eq('id', req.params.id)
        .eq('store_id', store.id)
        .select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/products/:id', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(404).json({ error: 'Store not found' });

      const { error } = await supabase.from('products')
        .delete()
        .eq('id', req.params.id)
        .eq('store_id', store.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Store config update
  app.put('/api/admin/store/config', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { data, error } = await supabase.from('stores')
        .update({ config: req.body })
        .eq('owner_user_id', req.auth.userId)
        .select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Image Upload Endpoint
  app.post('/api/upload', requireAuth(), upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!supabase) {
      // Return a dummy image URL for local testing
      return res.json({ url: `https://placehold.co/600x400?text=${encodeURIComponent(req.file.originalname)}` });
    }
    try {
      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${req.auth.userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('products').getPublicUrl(filePath);
      res.json({ url: data.publicUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Public Store Info
  app.get('/api/stores/:slug', async (req, res) => {
    if (!supabase) return res.json({ id: 'dummy', name: req.params.slug, config: {} });
    try {
      const { data, error } = await supabase.from('stores')
        .select('*')
        .eq('slug', req.params.slug)
        .single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(404).json({ error: 'Store not found' });
    }
  });


  // Products route for Tanstack Query hook (GET /api/products?store_slug=...)
  
  const mockProducts = [
  {
    id: "prod_1",
    store_id: "store_mock",
    name: "Jordan 1 Triple White",
    slug: "jordan-1-triple-white",
    description: "Classic Jordan 1s in an all-white colorway. Timeless and versatile.",
    price: 150,
    stock: 50,
    status: 'active',
    images: ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "prod_2",
    store_id: "store_mock",
    name: "Muha Meds Habibi Wax Pen",
    slug: "muha-meds-habibi",
    description: "Premium wax pen with an exclusive Habibi flavor blend.",
    price: 45,
    stock: 100,
    status: 'active',
    images: ["https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?auto=format&fit=crop&w=800&q=80"]
  },
  {
    id: "prod_3",
    store_id: "store_mock",
    name: "Purple Label Denim Pants",
    slug: "purple-label-denim",
    description: "High-quality denim pants from Purple Label, featuring a modern fit and premium wash.",
    price: 250,
    stock: 30,
    status: 'active',
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80"]
  }
];

  app.get('/api/products/:id', async (req: any, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    const prod = mockProducts.find(p => p.id === req.params.id);
    if (prod) return res.json(prod);
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(404).json({ error: 'Product not found' });
    }
  });

  app.get('/api/products', async (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ data: mockProducts, total: mockProducts.length, page: 1, pageSize: 20 });
    try {
      const storeSlug = req.query.store_slug;
      if (!storeSlug) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
      
      const { data: store, error: storeError } = await supabase.from('stores').select('id').eq('slug', storeSlug).single();
      if (storeError || !store) return res.status(404).json({ error: 'Store not found' });
      
      const search = req.query.search as string;
      const minPrice = req.query.min_price;
      const maxPrice = req.query.max_price;
      const sortBy = (req.query.sort_by as string) || 'created_at';
      const order = (req.query.order as string) || 'desc';
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);

      let query = supabase.from('products').select('*', { count: 'exact' }).eq('store_id', store.id);
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (minPrice) query = query.gte('price', minPrice);
      if (maxPrice) query = query.lte('price', maxPrice);
      
      query = query.order(sortBy, { ascending: order === 'asc' });
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: products, error, count } = await query;
      
      if (error) throw error;
      res.json({ data: products || [], total: count || 0, page, pageSize });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  
  // --- REVIEWS ---
  app.get('/api/products/:productId/reviews', async (req: any, res) => {
    if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      res.json({ data: data || [], total: count || 0, page, pageSize });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/products/:productId/rating', async (req: any, res) => {
    if (!supabase) return res.json({ average: 0, count: 0 });
    try {
      const { productId } = req.params;
      const { data, count, error } = await supabase
        .from('reviews')
        .select('rating', { count: 'exact' })
        .eq('product_id', productId);
      
      if (error) throw error;
      
      let average = 0;
      if (data && data.length > 0) {
        const sum = data.reduce((acc: number, cur: any) => acc + cur.rating, 0);
        average = sum / data.length;
      }
      res.json({ average, count: count || 0 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/products/:productId/reviews', optionalAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      if (!req.auth || !req.auth.userId) return res.status(401).json({ error: 'Unauthorized' });
      const { productId } = req.params;
      const { rating, comment } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Invalid rating' });
      }

      const { data, error } = await supabase.from('reviews').insert([{
        product_id: productId,
        user_id: req.auth.userId,
        rating,
        comment
      }] as any[]).select().single();
      
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- COUPONS ---
  app.get('/api/admin/coupons', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data, error } = await supabase.from('coupons').select('*').eq('store_id', store.id).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/coupons', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const coupon = { ...req.body, store_id: store.id };
      const { data, error } = await supabase.from('coupons').insert([coupon] as any[]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/coupons/:id', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ success: true });
    try {
      const { id } = req.params;
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { error } = await supabase.from('coupons').delete().eq('id', id).eq('store_id', store.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/coupons/validate', async (req: any, res) => {
    if (!supabase) return res.json({ valid: true, discountAmount: 10 });
    try {
      const { code, storeId, orderTotal } = req.body;
      const { data: coupon, error } = await supabase.from('coupons')
        .select('*')
        .eq('code', code)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        return res.status(400).json({ error: 'Invalid coupon code' });
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Coupon expired' });
      }

      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return res.status(400).json({ error: 'Coupon usage limit reached' });
      }

      if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) {
        return res.status(400).json({ error: `Minimum order amount is ${coupon.min_order_amount}` });
      }

      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = (orderTotal * coupon.discount_value) / 100;
      } else {
        discountAmount = coupon.discount_value;
      }

      res.json({ valid: true, discountAmount, coupon });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- ANALYTICS ---
  app.get('/api/admin/analytics/sales', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json({ total_revenue: 0, total_orders: 0, average_order_value: 0, sales_by_day: [] });
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      // Get last 30 days of paid orders
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders, error } = await supabase.from('orders')
        .select('total, created_at')
        .eq('store_id', store.id)
        .eq('status', 'paid')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      let total_revenue = 0;
      let total_orders = orders ? orders.length : 0;
      
      const sales_by_day_map: Record<string, { revenue: number, orders: number }> = {};
      
      if (orders) {
        orders.forEach((o: any) => {
          total_revenue += o.total;
          const date = new Date(o.created_at).toISOString().split('T')[0];
          if (!sales_by_day_map[date]) {
            sales_by_day_map[date] = { revenue: 0, orders: 0 };
          }
          sales_by_day_map[date].revenue += o.total;
          sales_by_day_map[date].orders += 1;
        });
      }

      const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;
      
      const sales_by_day = Object.keys(sales_by_day_map).map(date => ({
        date,
        revenue: sales_by_day_map[date].revenue,
        orders: sales_by_day_map[date].orders
      })).sort((a, b) => a.date.localeCompare(b.date));

      res.json({ total_revenue, total_orders, average_order_value, sales_by_day });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/analytics/top_products', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('quantity, unit_price, product_id, orders!inner(store_id, status), products(name)')
        .eq('orders.store_id', store.id)
        .eq('orders.status', 'paid');
      
      if (error) throw error;

      const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};
      if (orderItems) {
         orderItems.forEach((item: any) => {
           if (!productStats[item.product_id]) {
             productStats[item.product_id] = { name: item.products?.name || 'Unknown', quantity: 0, revenue: 0 };
           }
           productStats[item.product_id].quantity += item.quantity;
           productStats[item.product_id].revenue += item.quantity * item.unit_price;
         });
      }

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      res.json(topProducts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/analytics/recent_orders', requireAuth(), async (req: any, res) => {
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.status(403).json({ error: 'Unauthorized' });

      const { data: orders, error } = await supabase.from('orders')
        .select('id, total, status, created_at, customer_email')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      res.json(orders || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/store', async (req, res) => {
    if (!supabase) return res.json({ store: { name: 'Terra & Tide', slug: 'terra-and-tide', config: { themeColor: '#6B705C' } }, products: mockProducts });
    try {
      // Just grab the first store for demo purposes, or based on host
      const { data: store, error } = await supabase.from('stores').select('*').limit(1).single();
      if (error || !store) return res.json({ store: { name: 'Terra & Tide', slug: 'terra-and-tide', config: { themeColor: '#6B705C' } }, products: mockProducts });

      const { data: products } = await supabase.from('products').select('*').eq('store_id', store.id);
      res.json({ store, products: products || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  
  // --- WISHLIST ENDPOINTS ---
  app.get('/api/wishlist', requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('product_id, products(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      res.json(data.map((d: any) => d.products));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/wishlist', requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { product_id } = req.body;
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert([{ user_id: userId, product_id }])
        .select();
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/wishlist/:productId', requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const { productId } = req.params;
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .match({ user_id: userId, product_id: productId });
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- ABANDONED CART ENDPOINTS ---
  app.post('/api/cart/sync', async (req: any, res) => {
    try {
      // allow unauthenticated if email provided (for guest checkout step)
      let userId = null;
      try {
        if (req.auth?.userId) userId = req.auth.userId;
      } catch (e) {}
      
      const { email, items } = req.body;
      
      if (!userId && !email) {
        return res.json({ success: false, message: 'No user info' });
      }

      // Check if cart exists
      let query = supabase.from('abandoned_carts').select('id');
      if (userId) query = query.eq('user_id', userId);
      else query = query.eq('email', email);
      
      const { data: existing } = await query.single();
      
      if (existing) {
        await supabase
          .from('abandoned_carts')
          .update({ items, updated_at: new Date().toISOString(), reminder_sent: false })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('abandoned_carts')
          .insert([{ user_id: userId, email, items }]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/cart/recover', async (req, res) => {
    try {
      const { token } = req.query; // cart id
      if (!token) return res.status(400).json({ error: 'Missing token' });
      
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('id', token)
        .single();
        
      if (error || !data) throw new Error('Cart not found');
      res.json({ items: data.items });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- CRON JOB ABANDONED CART ---
  setInterval(async () => {
    try {
      if (!supabase || !resend) return;
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: carts, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('reminder_sent', false)
        .not('email', 'is', null)
        .lt('updated_at', twoHoursAgo);
        
      if (error) {
        console.error('Error fetching abandoned carts:', error);
        return;
      }
      
      for (const cart of carts || []) {
        if (!cart.items || cart.items.length === 0) continue;
        
        // Ensure email is valid
        if (!cart.email || !cart.email.includes('@')) continue;

        const recoverUrl = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/recover?token=${cart.id}`;
        
        const html = `
          <h2>Did you forget something?</h2>
          <p>We saved your cart for you.</p>
          <ul>
            ${cart.items.map((i: any) => `<li>${i.name} - ${i.price} (x${i.quantity})</li>`).join('')}
          </ul>
          <a href="${recoverUrl}" style="padding: 10px 20px; background: #6B705C; color: white; text-decoration: none; border-radius: 5px;">Recover Cart</a>
        `;
        
        await sendEmail({
          to: cart.email,
          subject: 'Complete your purchase',
          html
        });
        
        await supabase
          .from('abandoned_carts')
          .update({ reminder_sent: true })
          .eq('id', cart.id);
      }
    } catch (e) {
      console.error('Cron job error:', e);
    }
  }, 60 * 60 * 1000); // run every hour


  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

