import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import multer from 'multer';

// --- CONFIG ---
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
}

const PORT = process.env.PORT || 3000;
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

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();

  app.use(cors());

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
        await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
        
        // Decrement stock
        const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);
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
      }
    }

    res.json({received: true});
  });

  // Regular JSON middleware for other routes
  app.use(express.json());

  // Clerk middleware (optional auth on /api routes, use requireAuth() on specific routes to enforce)
  app.use('/api', clerkMiddleware());

  // API Routes
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

  app.post('/api/orders', async (req, res) => {
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

      // @ts-ignore
      const { data: order, error: orderError } = await supabase.from('orders').insert([{
        store_id: storeId,
        status: 'pending',
        total
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

  app.post('/api/checkout', async (req, res) => {
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
    if (!supabase) return res.json([]);
    try {
      const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
      if (!store) return res.json([]);
      const { data, error } = await supabase.from('orders').select('*').eq('store_id', store.id).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
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
  app.get('/api/products', async (req, res) => {
    if (!supabase) return res.json([]);
    try {
      const storeSlug = req.query.store_slug;
      if (!storeSlug) return res.json([]);
      
      const { data: store, error: storeError } = await supabase.from('stores').select('id').eq('slug', storeSlug).single();
      if (storeError || !store) return res.status(404).json({ error: 'Store not found' });
      
      const { data: products, error } = await supabase.from('products').select('*').eq('store_id', store.id);
      if (error) throw error;
      res.json(products || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/store', async (req, res) => {
    if (!supabase) return res.json({ store: { name: 'Terra & Tide', config: { themeColor: '#6B705C' } }, products: [] });
    try {
      // Just grab the first store for demo purposes, or based on host
      const { data: store, error } = await supabase.from('stores').select('*').limit(1).single();
      if (error || !store) return res.json({ store: { name: 'Terra & Tide', config: { themeColor: '#6B705C' } }, products: [] });

      const { data: products } = await supabase.from('products').select('*').eq('store_id', store.id);
      res.json({ store, products: products || [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
