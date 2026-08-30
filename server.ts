import crypto from 'crypto';
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
import bcrypt from 'bcryptjs';
import * as Sentry from '@sentry/node';
import pino from 'pino';
import pinoHttp from 'pino-http';
import * as fs from 'fs';
import multer from 'multer';
import { z } from 'zod';
import { getVerificationEmail, getOrderConfirmationEmail, getDiscountCouponEmail, getEmailLayout, getAbandonedCartEmail, getOrderStatusEmail } from './email-templates.js';

// Setup Sentry
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});

// Setup Pino Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      }
    }
  })
});

// Custom AppError
class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async Handler Wrapper
const asyncHandler = (fn: express.RequestHandler) => (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


const isProduction = process.env.NODE_ENV === 'production';
const APP_URL = process.env.VITE_APP_URL || process.env.APP_URL || 'https://selfcaresinners.com';
const API_URL = process.env.VITE_API_URL || process.env.API_URL || APP_URL;
const PRIMARY_STORE_SLUG = process.env.PRIMARY_STORE_SLUG || 'selfcare-sinners';
const JWT_SECRET = process.env.JWT_SECRET || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

const requiredProductionEnv = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'ADMIN_EMAIL',
  'VITE_APP_URL',
  'VITE_API_URL'
];

if (isProduction) {
  const missing = requiredProductionEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

if (!JWT_SECRET && !isProduction) {
  logger.warn('JWT_SECRET is not configured. Using an in-memory development-only fallback.');
}

const effectiveJwtSecret = JWT_SECRET || crypto.randomBytes(32).toString('hex');

function getAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return Array.from(new Set([
    APP_URL,
    API_URL,
    'https://selfcaresinners.com',
    'https://www.selfcaresinners.com',
    ...configured
  ]));
}

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase();
}

function resolveUserRole(user: any) {
  const dbRole = user?.role || user?.user_role || 'user';
  if (ADMIN_EMAIL && normalizeEmail(user?.email) === ADMIN_EMAIL) return 'admin';
  return dbRole;
}

const optionalAuth = () => (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, effectiveJwtSecret) as any;
    req.auth = { userId: decoded.userId, role: decoded.role };
  } catch (_e) {
    // Optional auth intentionally ignores invalid tokens for guest flows.
  }
  next();
};

const requireAuth = () => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, effectiveJwtSecret) as any;
    req.auth = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const mockAuthMiddleware = requireAuth;

const requireAdmin = () => (req, res, next) => {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

async function getPrimaryStoreId() {
  if (!supabase) return null;
  const bySlug = await supabase.from('stores').select('id').eq('slug', PRIMARY_STORE_SLUG).single();
  if (bySlug.data?.id) return bySlug.data.id;
  const first = await supabase.from('stores').select('id').order('created_at', { ascending: true }).limit(1).single();
  return first.data?.id || null;
}

function moneyToCents(value: any) {
  return Math.round(Number(value || 0) * 100);
}

function centsToMoney(value: any) {
  return Number(((Number(value || 0)) / 100).toFixed(2));
}

function isPositiveMoney(value: any) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function getPaymentIntentId(session: any) {
  if (!session?.payment_intent) return null;
  return typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
}

async function readStripeEventState(eventId: string) {
  if (!supabase) return { exists: false, processed: false };
  const { data, error } = await supabase
    .from('stripe_events')
    .select('id, processed_at')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw error;
  return { exists: Boolean(data), processed: Boolean(data?.processed_at) };
}

async function recordStripeEventReceived(event: any) {
  if (!supabase) return;
  const state = await readStripeEventState(event.id);
  if (state.exists) return;

  const insertPayload: any = { id: event.id, type: event.type };
  if (event?.data?.object) insertPayload.payload = event.data.object;

  const { error } = await supabase
    .from('stripe_events')
    .insert(insertPayload);
  if (error && error.code !== '23505') throw error;
}

async function recordStripeEventProcessed(eventId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('stripe_events')
    .update({ processed_at: new Date().toISOString(), error_message: null })
    .eq('id', eventId);
  if (error) logger.warn({ err: error, eventId }, 'Unable to mark Stripe event as processed');
}

async function recordStripeEventFailed(eventId: string, errorMessage: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('stripe_events')
    .update({ error_message: errorMessage, processed_at: null })
    .eq('id', eventId);
  if (error) logger.warn({ err: error, eventId }, 'Unable to mark Stripe event as failed');
}

async function sendPaidOrderEmails(order: any, orderItems: any[], session: any) {
  if (!order) return;
  const customerEmail = session?.customer_details?.email || order.customer_email;

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Paid Order: #${String(order.id).split('-')[0]}`,
    html: `<p>A paid order has been confirmed for $${order.total}.</p><p>Order ID: ${order.id}</p><p>Stripe session: ${order.stripe_session_id || session?.id || 'N/A'}</p>`
  });

  if (customerEmail) {
    const itemsHtml = orderItems.map(item => `
      <div class="order-item">
        <span>${item.quantity}x ${item.products?.name || item.product_snapshot?.name || 'Product'}</span>
        <span>$${item.unit_price}</span>
      </div>
    `).join('');

    await sendEmail({
      to: customerEmail,
      subject: `Order Confirmation: #${String(order.id).split('-')[0]}`,
      html: getOrderConfirmationEmail(order.id, `$${order.total}`, itemsHtml)
    });
  }
}

async function finalizeCheckoutSession(event: any, session: any) {
  if (!supabase) return;
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    logger.warn({ stripeSessionId: session.id }, 'Stripe checkout.session.completed without order_id metadata');
    return;
  }

  const { data: result, error: finalizeError } = await supabase.rpc('finalize_paid_order', {
    order_id_input: orderId,
    stripe_session_id_input: session.id,
    stripe_payment_intent_id_input: getPaymentIntentId(session),
    customer_email_input: session.customer_details?.email || null
  });

  if (finalizeError) {
    logger.error({ err: finalizeError, orderId, stripeSessionId: session.id }, 'Paid order finalization failed');
    throw finalizeError;
  }

  const finalization = Array.isArray(result) ? result[0] : result;
  logger.info({ orderId, finalization }, 'Paid order finalization result');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (orderError) throw orderError;

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*, products(*)')
    .eq('order_id', orderId);

  if (finalization?.final_status === 'inventory_exception') {
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Inventory exception after payment: #${String(orderId).split('-')[0]}`,
        html: `<p>Stripe confirmed payment, but inventory could not be reconciled automatically.</p><p>Order ID: ${orderId}</p><p>Stripe session: ${session.id}</p><p>Message: ${finalization?.message || 'N/A'}</p>`
      });
    } catch (emailError) {
      logger.error({ err: emailError, orderId }, 'Inventory exception email failed');
    }
    return;
  }

  if (!finalization?.success) {
    throw new Error(`Paid order finalization returned unsuccessful status: ${finalization?.final_status || 'unknown'} ${finalization?.message || ''}`.trim());
  }

  try {
    await sendPaidOrderEmails(order, orderItems || [], session);
  } catch (emailError) {
    logger.error({ err: emailError, orderId }, 'Paid order email notification failed');
    // Email delivery must not make the Stripe webhook fail after the payment and order are finalized.
  }
}

async function markCheckoutSessionFailed(session: any, status: 'payment_failed' | 'cancelado') {
  if (!supabase) return;
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const updateData: any = {
    status,
    stripe_session_id: session.id,
    stripe_payment_intent_id: getPaymentIntentId(session),
    updated_at: new Date().toISOString()
  };
  if (session.customer_details?.email) updateData.customer_email = session.customer_details.email;
  if (status === 'cancelado') updateData.cancelled_at = new Date().toISOString();

  await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('status', 'pendiente');
}


const ORDER_STATUSES = [
  'pendiente',
  'pagado',
  'payment_failed',
  'inventory_exception',
  'empacado',
  'enviado',
  'entregado',
  'cancelado',
  'refunded',
  'partially_refunded'
];

const ALLOWED_ORDER_TRANSITIONS: Record<string, string[]> = {
  pendiente: ['cancelado'],
  pagado: ['empacado', 'cancelado'],
  inventory_exception: ['pagado', 'cancelado'],
  empacado: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
  payment_failed: ['cancelado'],
  refunded: [],
  partially_refunded: ['refunded']
};

function isValidOrderStatus(status: string) {
  return ORDER_STATUSES.includes(status);
}

function canTransitionOrderStatus(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;
  return (ALLOWED_ORDER_TRANSITIONS[currentStatus] || []).includes(nextStatus);
}

async function writeAuditLog({ actorUserId, action, entityType, entityId, metadata }: { actorUserId?: string | null, action: string, entityType: string, entityId?: string | null, metadata?: any }) {
  if (!supabase) return;
  try {
    await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {}
    });
  } catch (err) {
    logger.error({ err, action, entityType, entityId }, 'Audit log write failed');
  }
}

async function writeOrderTimeline({ orderId, actorUserId, eventType, fromStatus, toStatus, metadata }: { orderId: string, actorUserId?: string | null, eventType: string, fromStatus?: string | null, toStatus?: string | null, metadata?: any }) {
  if (!supabase) return;
  try {
    await supabase.from('order_timeline').insert({
      order_id: orderId,
      actor_user_id: actorUserId || null,
      event_type: eventType,
      from_status: fromStatus || null,
      to_status: toStatus || null,
      metadata: metadata || {}
    });
  } catch (err) {
    // order_timeline is introduced in Phase C. The API should keep working if the migration has not been applied yet.
    logger.warn({ err, orderId, eventType }, 'Order timeline write skipped');
  }
}

function normalizeVariantInput(variants: any[] | undefined) {
  if (!Array.isArray(variants)) return [];
  return variants.map((variant, index) => ({
    id: variant?.id || `${Date.now()}-${index}`,
    name: String(variant?.name || '').trim(),
    sku: variant?.sku ? String(variant.sku).trim() : null,
    price: Number.isFinite(Number(variant?.price)) ? Number(variant.price) : null,
    stock: Number.isFinite(Number(variant?.stock)) ? Math.max(0, Math.floor(Number(variant.stock))) : 0,
    attributes: variant?.attributes && typeof variant.attributes === 'object' ? variant.attributes : {}
  })).filter((variant) => variant.name.length > 0);
}




const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  name: z.string().optional(),
  variantName: z.string().optional().nullable(),
  sku: z.string().optional().nullable()
});

const OrderInputSchema = z.object({
  storeId: z.string().uuid().or(z.string().min(1)).optional().nullable(),
  items: z.array(OrderItemSchema).min(1),
  couponCode: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable()
});

const ProductInputSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  status: z.string().optional(),
  variants: z.array(z.any()).optional(),
  categories: z.array(z.string()).optional()
});



const PORT = Number(process.env.PORT || 3000);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Store <onboarding@resend.dev>';


async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  if (!resend) {
    logger.info(`[Email Mock] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const { data, error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    if (error) {
      logger.error({ err: error }, 'Resend API Error:');
    } else {
      logger.info({ data: data }, `Email sent to ${to}`);
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to send email:');
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
  
  app.use(pinoHttp({ logger }));

  app.use(cors({
    origin(origin, callback) {
      if (!origin || !isProduction || getAllowedOrigins().includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true
  }));

  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "style-src-elem": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "connect-src": ["'self'", APP_URL, API_URL, "https://*.supabase.co", "https://api.stripe.com", "https://*.sentry.io", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        "frame-src": ["https://js.stripe.com", "https://hooks.stripe.com"],
        "frame-ancestors": ["'none'"]
      }
    } : false,
    crossOriginEmbedderPolicy: false
  }));

  const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many orders created, please try again later.' });
  const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many checkout attempts, please try again later.' });
  const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: 'Too many contact messages, please try again later.' });


  // Stripe webhook needs raw body. This route intentionally runs before express.json().
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.warn({ err: err?.message }, 'Invalid Stripe webhook signature');
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info({ eventId: event.id, eventType: event.type }, 'Received Stripe event');

    if (supabase) {
      const state = await readStripeEventState(event.id);
      if (state.processed) {
        logger.info({ eventId: event.id }, 'Stripe event already processed. Skipping.');
        return res.json({ received: true, duplicate: true });
      }
      await recordStripeEventReceived(event);
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await finalizeCheckoutSession(event, event.data.object as Stripe.Checkout.Session);
      }

      if (event.type === 'checkout.session.expired') {
        await markCheckoutSessionFailed(event.data.object as Stripe.Checkout.Session, 'cancelado');
      }

      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent: any = event.data.object;
        const orderId = paymentIntent?.metadata?.order_id;
        if (orderId && supabase) {
          await supabase
            .from('orders')
            .update({
              status: 'payment_failed',
              stripe_payment_intent_id: paymentIntent.id,
              notes: paymentIntent.last_payment_error?.message || 'Stripe payment failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('status', 'pendiente');
        }
      }

      await recordStripeEventProcessed(event.id);
      return res.json({ received: true });
    } catch (err: any) {
      logger.error({ err, eventId: event.id, eventType: event.type }, 'Stripe webhook processing failed');
      await recordStripeEventFailed(event.id, err?.message || 'Webhook processing failed');
      // Do not mark processed; Stripe can retry, and our handler is idempotent.
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }));

  // Regular JSON middleware for other routes
  app.use(express.json());

  // Mock Auth middleware (optional auth on /api routes, use requireAuth() on specific routes to enforce)
  // app.use('/api', mockAuthMiddleware());

  
  app.get('/api/orders/my', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json([]);
          try {
            const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('customer_user_id', req.auth.userId).order('created_at', { ascending: false });
            if (error) throw error;
            res.json(data || []);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));


  app.get('/api/orders/track', asyncHandler(async (req, res) => {
          if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
          try {
            const email = String(req.query.email || '').trim().toLowerCase();
            const orderId = String(req.query.order_id || '').trim();
            if (!email || !orderId) return res.status(400).json({ error: 'Email and order_id required' });

            // Do not use .single() with the email filter here. PostgREST returns
            // PGRST116 / "Cannot coerce the result to a single JSON object" when
            // the email does not match or the order has a null legacy customer_email.
            // Fetch by order id, then compare the normalized email in application code
            // so the public API returns a clean 404 instead of a 500.
            const { data, error } = await supabase
              .from('orders')
              .select('*, order_items(*, products(name, images, sku))')
              .eq('id', orderId)
              .maybeSingle();
            if (error) throw error;

            const storedEmail = String(data?.customer_email || '').trim().toLowerCase();
            if (!data || !storedEmail || storedEmail !== email) {
              return res.status(404).json({ error: 'Order not found' });
            }

            const timelineResult = await supabase
              .from('order_timeline')
              .select('*')
              .eq('order_id', orderId)
              .order('created_at', { ascending: true });

            res.json({
              ...data,
              timeline: timelineResult.error ? [] : (timelineResult.data || [])
            });
          } catch (e: any) {
            logger.error({ err: e, orderId: req.query.order_id }, 'Public order tracking failed');
            res.status(500).json({ error: 'Order tracking failed' });
          }
        }));

// API Routes
  
  app.post('/api/contact', contactLimiter, asyncHandler(async (req, res) => {
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
        }));


  // --- AUTH ROUTES ---
  app.post('/api/register', asyncHandler(async (req, res) => {
          const { email, password, full_name } = req.body;
          if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
          try {
            const password_hash = await bcrypt.hash(password, 10);
            const { data, error } = await supabase
              .from('users')
              .insert([{ id: crypto.randomUUID(), email, password_hash, full_name }])
              .select()
              .single();
            if (error) {
              if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
              throw error;
            }
            // Generate verification token
            const verificationToken = jwt.sign({ userId: data.id, purpose: 'email_verification' }, effectiveJwtSecret, { expiresIn: '24h' });
            const baseUrl = req.headers.origin || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
            const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

            // Send Verification Email
            await sendEmail({
              to: email,
              subject: 'Verify your Selfcare Sinners account',
              html: getVerificationEmail(full_name, verificationLink)
            });
            
            // Still issue a normal token so they can be logged in immediately (or you can require verification to log in)
            const userRole = resolveUserRole(data);
            const token = jwt.sign({ userId: data.id, role: userRole }, effectiveJwtSecret, { expiresIn: '7d' });
            res.json({ token, user: { id: data.id, email: data.email, full_name: data.full_name, role: userRole, is_verified: false }, message: 'Registration successful. Please check your email to verify your account.' });
          } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal server error' });
          }
        }));

  
  app.post('/api/verify-email', asyncHandler(async (req, res) => {
          const { token } = req.body;
          if (!token) return res.status(400).json({ error: 'Token is required' });
          
          try {
            const decoded = jwt.verify(token, effectiveJwtSecret) as any;
            if (decoded.purpose !== 'email_verification') {
              return res.status(400).json({ error: 'Invalid token purpose' });
            }
            
            // Update user as verified in database
            const { data, error } = await supabase
              .from('users')
              .update({ is_verified: true })
              .eq('id', decoded.userId)
              .select()
              .single();
              
            if (error) {
              // If column doesn't exist yet, just ignore for now to prevent crash
              if (error.code === 'PGRST204' || error.message.includes('Could not find')) {
                  return res.json({ success: true, message: 'Verified (DB column missing)' });
              }
              throw error;
            }
            
            res.json({ success: true, user: data });
          } catch (e: any) {
            return res.status(400).json({ error: 'Invalid or expired token' });
          }
        }));

  app.post('/api/resend-verification', asyncHandler(async (req, res) => {
          const { email } = req.body;
          if (!email) return res.status(400).json({ error: 'Email is required' });
          
          try {
            const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
            if (error || !user) return res.status(404).json({ error: 'User not found' });
            if (user.is_verified) return res.status(400).json({ error: 'Email is already verified' });
            
            const verificationToken = jwt.sign({ userId: user.id, purpose: 'email_verification' }, effectiveJwtSecret, { expiresIn: '24h' });
            const baseUrl = req.headers.origin || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
            const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
            
            await sendEmail({
              to: email,
              subject: 'Verify your Selfcare Sinners account',
              html: getVerificationEmail(user.full_name, verificationLink)
            });
            
            res.json({ success: true, message: 'Verification email resent.' });
          } catch (e: any) {
            res.status(500).json({ error: 'Internal server error' });
          }
        }));

  
  app.post('/api/forgot-password', asyncHandler(async (req, res) => {
          const { email } = req.body;
          if (!email) return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
          try {
            const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
            if (error || !user) {
              // Para no revelar si el correo existe o no
              return res.json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });
            }
            
            const resetToken = jwt.sign({ userId: user.id, purpose: 'password_reset' }, effectiveJwtSecret, { expiresIn: '1h' });
            const baseUrl = req.headers.origin || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
            const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
            
            await sendEmail({
              to: email,
              subject: 'Recuperación de contraseña',
              html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Recuperación de Contraseña</h2>
            <p>Hola ${user.full_name || 'Usuario'},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #6B705C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                Restablecer Contraseña
              </a>
            </div>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          </div>
        `
            });

            res.json({ message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.' });
          } catch (err: any) {
            logger.error({ err: err }, 'Error en forgot-password:');
            res.status(500).json({ error: 'Ocurrió un error al procesar tu solicitud.' });
          }
        }));

  app.post('/api/reset-password', asyncHandler(async (req, res) => {
          const { token, newPassword } = req.body;
          if (!token || !newPassword) return res.status(400).json({ error: 'Faltan datos requeridos.' });
          
          try {
            const decoded: any = jwt.verify(token, effectiveJwtSecret);
            if (decoded.purpose !== 'password_reset') return res.status(400).json({ error: 'Token inválido' });
            
            const password_hash = await bcrypt.hash(newPassword, 10);
            
            const { error } = await supabase.from('users').update({ password_hash }).eq('id', decoded.userId);
            
            if (error) throw error;
            
            res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
          } catch (err: any) {
            if (err.name === 'TokenExpiredError') return res.status(400).json({ error: 'El enlace ha expirado.' });
            res.status(400).json({ error: 'El enlace es inválido o ha expirado.' });
          }
        }));

  app.post('/api/login', asyncHandler(async (req, res) => {
          const { email, password } = req.body;
          if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
          try {
            const { data: user, error } = await supabase
              .from('users')
              .select('*')
              .eq('email', email)
              .single();
            if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
            
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
            
            const userRole = resolveUserRole(user);
            const token = jwt.sign({ userId: user.id, role: userRole }, effectiveJwtSecret, { expiresIn: '7d' });
            res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: userRole } });
          } catch (error) {
            logger.error(error);
            res.status(500).json({ error: 'Internal server error' });
          }
        }));

  app.post('/api/log-error', express.json(), (req, res) => {
  fs.appendFileSync('frontend-error.log', req.body.error + '\n\n');
  res.json({ ok: true });
});

app.get('/api/health', asyncHandler(async (req, res) => {
    if (req.query.error) {
      console.error('FRONTEND ERROR LOGGED:', req.query.error);
    }

    // Check Supabase connection if configured
    let dbStatus = 'unconfigured';
    if (supabase) {
      try {
        const { error } = await supabase.from('stores').select('id').limit(1);
        dbStatus = error ? 'error' : 'connected';
      } catch (e) {
        dbStatus = 'error';
      }
    }
    res.json({ status: 'ok', database: dbStatus });
  }));

  app.post('/api/orders', optionalAuth(), orderLimiter, asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ id: 'dummy_order_' + Date.now(), total: 100 });

          try {
            const parsedBody = OrderInputSchema.parse(req.body);
            let { items, storeId, couponCode, customerEmail } = parsedBody as any;
            if (!storeId) {
              storeId = await getPrimaryStoreId();
            }
            if (!storeId) return res.status(500).json({ error: 'Primary store is not configured' });

            let total = 0;
            const orderItems = [];

            for (const item of items) {
              let actualProductId = item.productId;
              const uuidMatch = actualProductId.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
              if (uuidMatch) {
                actualProductId = uuidMatch[1];
              }

              const { data: product } = await supabase.from('products').select('*').eq('id', actualProductId).single();
              if (!product) throw new Error(`Product ${item.productId} not found`);
              
              const variants = Array.isArray(product.variants) ? product.variants : [];
              const variantMatch = variants.find((v: any) =>
                ((item as any).variantName && String(v.name).toLowerCase() === String((item as any).variantName).toLowerCase()) ||
                ((item as any).name && String((item as any).name).toLowerCase().includes(String(v.name).toLowerCase())) ||
                ((item as any).sku && v.sku && String(v.sku).toLowerCase() === String((item as any).sku).toLowerCase())
              );
              const selectedPrice = Number(variantMatch?.price || product.price);
              const selectedSku = variantMatch?.sku || product.sku || null;
              const stockToCheck = Number(variantMatch ? variantMatch.stock : product.stock);
              
              if (stockToCheck < item.quantity) throw new Error(`Not enough stock for ${(item as any).name || product.name}`);
              
              total += selectedPrice * item.quantity;
              orderItems.push({
                product_id: product.id,
                quantity: item.quantity,
                unit_price: selectedPrice,
                name: (item as any).name || product.name,
                product_snapshot: {
                  id: product.id,
                  name: (item as any).name || product.name,
                  baseName: product.name,
                  variantName: variantMatch?.name || (item as any).variantName || null,
                  price: selectedPrice,
                  sku: selectedSku,
                  images: product.images || []
                }
              });
            }

            let finalTotal = total;
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
                  
              } else {
                  couponCode = null; // invalid
              }
            }

            // @ts-ignore
            const { data: order, error: orderError } = await supabase.from('orders').insert([{
              store_id: storeId,
              customer_user_id: req.auth?.userId || null,
              customer_email: customerEmail || req.body.customerEmail || null,
              status: 'pendiente',
              subtotal: total,
              total: finalTotal,
              currency: 'mxn',
              coupon_code: couponCode,
              discount_amount: discountAmount
            }] as any[]).select().single();

            if (orderError) throw orderError;

            const itemsToInsert = orderItems.map(item => ({
              order_id: order.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              product_snapshot: item.product_snapshot
            }));
            
            // @ts-ignore
            await supabase.from('order_items').insert(itemsToInsert as any[]);

            res.json({ id: order.id, total: finalTotal, subtotal: total, discountAmount });
          } catch (e: any) {
            if (e instanceof z.ZodError) {
              return res.status(400).json({ error: 'Validation Error', details: (e as any).errors });
            }
            res.status(500).json({ error: e.message });
          }
        }));

  app.post('/api/checkout', checkoutLimiter, asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    try {
      let order: any = null;
      let orderItems: any[] = [];

      if (supabase) {
        const storeId = await getPrimaryStoreId();
        if (!storeId) return res.status(500).json({ error: 'Primary store is not configured' });

        const orderResult = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('store_id', storeId)
          .single();

        if (orderResult.error || !orderResult.data) return res.status(404).json({ error: 'Order not found' });
        order = orderResult.data;

        if (order.status !== 'pendiente') {
          return res.status(409).json({ error: `Order is not payable. Current status: ${order.status}` });
        }

        if (!isPositiveMoney(order.total) || moneyToCents(order.total) < 50) {
          return res.status(400).json({ error: 'Order total must be at least $0.50 MXN to start Stripe Checkout' });
        }

        const itemsResult = await supabase
          .from('order_items')
          .select('*, products(name, sku, stock)')
          .eq('order_id', orderId);
        if (itemsResult.error) throw itemsResult.error;
        orderItems = itemsResult.data || [];
        if (orderItems.length === 0) return res.status(400).json({ error: 'Order has no items' });

        for (const item of orderItems) {
          const stock = Number(item.products?.stock ?? 0);
          if (stock < Number(item.quantity)) {
            return res.status(409).json({ error: `Not enough stock for ${item.products?.name || item.product_id}` });
          }
        }
      } else {
        order = { id: orderId, total: 20, customer_email: null };
      }

      const orderSummary = supabase
        ? orderItems.map((item) => `${item.quantity}x ${item.products?.name || item.product_snapshot?.name || 'Product'}`).join(', ')
        : 'Selfcare Sinners order';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'mxn',
            product_data: {
              name: 'Selfcare Sinners Order',
              description: orderSummary.slice(0, 500)
            },
            unit_amount: moneyToCents(order.total),
          },
          quantity: 1
        }],
        mode: 'payment',
        customer_email: order.customer_email || undefined,
        shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'MX'] },
        success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/`,
        metadata: {
          order_id: orderId,
          store_slug: PRIMARY_STORE_SLUG,
          source: 'selfcare_sinners_checkout'
        },
        payment_intent_data: {
          metadata: {
            order_id: orderId,
            store_slug: PRIMARY_STORE_SLUG
          }
        }
      });

      if (supabase && orderId) {
        await supabase
          .from('orders')
          .update({
            stripe_session_id: session.id,
            stripe_payment_intent_id: getPaymentIntentId(session),
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .eq('status', 'pendiente');
      }

      res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      logger.error({ err, orderId }, 'Checkout session creation failed');
      res.status(500).json({ error: err.message });
    }
  }));

  app.post('/api/stores', requireAuth(), asyncHandler(async (req: any, res) => {
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
        }));

  app.get('/api/profile', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({});
          try {
            let { data, error } = await supabase.from('users').select('email, full_name, phone, shipping_address, billing_address').eq('id', req.auth.userId).single();
            
            if (error) {
              try {
                // Fallback if columns don't exist yet
                const fallback = await supabase.from('users').select('email, full_name').eq('id', req.auth.userId).single();
                if (fallback.error) throw fallback.error;
                data = fallback.data;
              } catch (fallbackError) {
                throw error; // throw original error if fallback fails
              }
            }
            res.json(data || {});
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.put('/api/profile', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ success: true });
          try {
            const { email, fullName, phone, shippingAddress, billingAddress } = req.body;
            
            let updatePayload: any = {
              email,
              full_name: fullName,
              phone,
              shipping_address: shippingAddress,
              billing_address: billingAddress
            };

            let { error } = await supabase.from('users').update(updatePayload).eq('id', req.auth.userId);
            
            if (error) {
                try {
                  // Fallback update
                  updatePayload = { email, full_name: fullName };
                  const fallback = await supabase.from('users').update(updatePayload).eq('id', req.auth.userId);
                  if (fallback.error) throw fallback.error;
                } catch (fallbackError) {
                  throw error; // throw original error if fallback fails
                }
            }
            
            res.json({ success: true });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.get('/api/admin/store', requireAuth(), asyncHandler(async (req: any, res) => {
          const isAdmin = req.auth.role === 'admin';
          
          if (!isAdmin) {
            return res.status(403).json({ error: 'Only admins can manage stores', hasStore: false });
          }

          if (!supabase) return res.json({ hasStore: false, role: 'admin' });
          
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.json({ hasStore: false, role: 'admin' });
            const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).single();
            if (error) throw error;
            res.json({ hasStore: true, store: data, role: 'admin' });
          } catch (err: any) {
            res.status(500).json({ error: err.message });
          }
        }));

  app.get('/api/me', requireAuth(), (req: any, res) => {
    // Test auth route
    res.json({ userId: req.auth.userId });
  });

  app.use('/api/admin', requireAuth(), requireAdmin());

  // Admin operations dashboard: operational health, exceptions and audit visibility.
  app.get('/api/admin/operations/summary', asyncHandler(async (req: any, res) => {
    if (!supabase) return res.json({ orders: {}, payments: {}, inventory: {}, alerts: [], recentStripeEvents: [], recentAuditLogs: [] });
    try {
      const storeId = await getPrimaryStoreId();
      if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

      const paidStatuses = ['pagado', 'empacado', 'enviado', 'entregado', 'partially_refunded'];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [ordersResult, todayOrdersResult, lowStockResult, stripeEventsResult, auditResult, inventoryResult] = await Promise.all([
        supabase.from('orders').select('id, status, total, created_at, notes').eq('store_id', storeId).order('created_at', { ascending: false }).limit(250),
        supabase.from('orders').select('id, status, total, created_at').eq('store_id', storeId).gte('created_at', todayStart.toISOString()),
        supabase.from('products').select('id, name, stock, status').eq('store_id', storeId).lte('stock', 5).neq('status', 'archived').order('stock', { ascending: true }).limit(20),
        supabase.from('stripe_events').select('id, type, processed_at, error_message, created_at').order('created_at', { ascending: false }).limit(15),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('inventory_movements').select('*, products(name)').order('created_at', { ascending: false }).limit(15)
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (todayOrdersResult.error) throw todayOrdersResult.error;
      if (lowStockResult.error) throw lowStockResult.error;
      if (stripeEventsResult.error) throw stripeEventsResult.error;
      if (auditResult.error) throw auditResult.error;
      if (inventoryResult.error) throw inventoryResult.error;

      const orders = ordersResult.data || [];
      const todayOrders = todayOrdersResult.data || [];
      const statusCounts = orders.reduce((acc: Record<string, number>, order: any) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});
      const revenueToday = todayOrders
        .filter((order: any) => paidStatuses.includes(order.status))
        .reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
      const revenue7d = orders
        .filter((order: any) => paidStatuses.includes(order.status) && new Date(order.created_at) >= sevenDaysAgo)
        .reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
      const failedStripeEvents = (stripeEventsResult.data || []).filter((event: any) => !event.processed_at || event.error_message);

      const alerts = [
        ...(statusCounts.inventory_exception ? [{ level: 'critical', code: 'inventory_exception', message: `${statusCounts.inventory_exception} paid order(s) need inventory reconciliation.` }] : []),
        ...(failedStripeEvents.length ? [{ level: 'critical', code: 'stripe_webhook_errors', message: `${failedStripeEvents.length} recent Stripe event(s) are unprocessed or have errors.` }] : []),
        ...((lowStockResult.data || []).length ? [{ level: 'warning', code: 'low_stock', message: `${(lowStockResult.data || []).length} product(s) are at low stock.` }] : [])
      ];

      res.json({
        orders: {
          totalRecent: orders.length,
          statusCounts,
          pending: statusCounts.pendiente || 0,
          paid: statusCounts.pagado || 0,
          packing: statusCounts.empacado || 0,
          shipped: statusCounts.enviado || 0,
          delivered: statusCounts.entregado || 0,
          cancelled: statusCounts.cancelado || 0,
          inventoryExceptions: statusCounts.inventory_exception || 0
        },
        payments: {
          revenueToday,
          revenue7d,
          failedStripeEvents: failedStripeEvents.length
        },
        inventory: {
          lowStockProducts: lowStockResult.data || [],
          recentMovements: inventoryResult.data || []
        },
        alerts,
        recentStripeEvents: stripeEventsResult.data || [],
        recentAuditLogs: auditResult.data || []
      });
    } catch (e: any) {
      logger.error({ err: e }, 'Admin operations summary failed');
      res.status(500).json({ error: e.message });
    }
  }));

  app.get('/api/admin/audit-logs', asyncHandler(async (req: any, res) => {
    if (!supabase) return res.json({ data: [], total: 0 });
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.page_size as string) || 50, 100);
      const entityType = req.query.entity_type as string;
      let query = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (entityType && entityType !== 'all') query = query.eq('entity_type', entityType);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      res.json({ data: data || [], total: count || 0, page, pageSize });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }));

  app.get('/api/admin/stripe-events', asyncHandler(async (req: any, res) => {
    if (!supabase) return res.json({ data: [], total: 0 });
    try {
      const status = (req.query.status as string) || 'all';
      let query = supabase.from('stripe_events').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100);
      if (status === 'failed') query = query.not('error_message', 'is', null);
      if (status === 'unprocessed') query = query.is('processed_at', null);
      const { data, error, count } = await query;
      if (error) throw error;
      res.json({ data: data || [], total: count || 0 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }));

  app.get('/api/admin/inventory/movements', asyncHandler(async (req: any, res) => {
    if (!supabase) return res.json({ data: [], total: 0 });
    try {
      const productId = req.query.product_id as string;
      let query = supabase.from('inventory_movements').select('*, products(name, sku)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100);
      if (productId) query = query.eq('product_id', productId);
      const { data, error, count } = await query;
      if (error) throw error;
      res.json({ data: data || [], total: count || 0 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }));

  // Admin orders
  
  app.get('/api/admin/orders', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });

            const status = req.query.status as string;
            const search = (req.query.search as string || '').trim();
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);

            let query = supabase.from('orders').select('*, order_items(*)', { count: 'exact' }).eq('store_id', storeId);
            
            if (status && status !== 'all') {
              query = query.eq('status', status);
            }
            if (search) {
              query = query.or(`id.eq.${search},customer_email.ilike.%${search}%,stripe_session_id.ilike.%${search}%`);
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
        }));

  app.get('/api/admin/orders/:id', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
          try {
            const { id } = req.params;
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const { data: order, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('id', id).eq('store_id', storeId).single();
            if (error) throw error;
            const { data: timeline } = await supabase
              .from('order_timeline')
              .select('*')
              .eq('order_id', id)
              .order('created_at', { ascending: false });
            let customerDetails = null;
            let shippingDetails = null;

            if (stripe && order.stripe_session_id) {
              try {
                 const session: any = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
                 customerDetails = session.customer_details;
                 shippingDetails = session.shipping_details;
              } catch(e) {
                 logger.error({ err: e }, "Failed to fetch stripe session");
              }
            }

            res.json({ ...order, customerDetails, shippingDetails, timeline: timeline || [] });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.put('/api/admin/orders/:id/status', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
          try {
            const { id } = req.params;
            const { status } = req.body;
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });
            if (!isValidOrderStatus(status)) return res.status(400).json({ error: 'Invalid order status' });

            const { data: currentOrder, error: currentError } = await supabase
              .from('orders')
              .select('*')
              .eq('id', id)
              .eq('store_id', storeId)
              .single();
            if (currentError) throw currentError;
            if (!canTransitionOrderStatus(currentOrder.status, status)) {
              return res.status(409).json({ error: `Invalid status transition from ${currentOrder.status} to ${status}` });
            }

            const updatePayload: any = { status, updated_at: new Date().toISOString() };
            if (status === 'cancelado') updatePayload.cancelled_at = new Date().toISOString();
            const { data, error } = await supabase.from('orders').update(updatePayload).eq('id', id).eq('store_id', storeId).select().single();
            if (error) throw error;

            await writeAuditLog({ actorUserId: req.auth.userId, action: 'order_status_updated', entityType: 'order', entityId: id, metadata: { from: currentOrder.status, to: status } });
            await writeOrderTimeline({ orderId: id, actorUserId: req.auth.userId, eventType: 'status_changed', fromStatus: currentOrder.status, toStatus: status });
            
            // Send Email Notification on Status Update. Email failure must not roll back the operational state change.
            if (['enviado', 'cancelado', 'entregado'].includes(status)) {
               try {
                 let customerEmail = data.customer_email;
                 if (stripe && data.stripe_session_id && !customerEmail) {
                    try {
                      const session: any = await stripe.checkout.sessions.retrieve(data.stripe_session_id);
                      customerEmail = session.customer_details?.email;
                    } catch(e) {}
                 }
                 
                 if (customerEmail) {
                   const statusText = status === 'enviado' ? 'has been shipped' : status === 'entregado' ? 'has been delivered' : 'has been cancelled';
                   const trackingInfo = status === 'enviado' && data.tracking_number ? `<p style="margin:0;">Tracking Number: <strong>${data.tracking_number}</strong></p>` : '';
                   await sendEmail({
                     to: customerEmail,
                     subject: `Order Update: #${data.id.split('-')[0]} ${statusText}`,
                     html: getOrderStatusEmail(data.id, statusText, trackingInfo)
                   });
                 }
               } catch (emailError) {
                 logger.error({ err: emailError, orderId: id, status }, 'Order status email failed');
               }
            }
            
            res.json(data);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  
  app.put('/api/admin/orders/:id/tracking', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
          try {
            const { id } = req.params;
            const { tracking_number, tracking_url, notes } = req.body;
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });
            
            const { data, error } = await supabase.from('orders').update({ tracking_number, tracking_url: tracking_url || null, notes, updated_at: new Date().toISOString() }).eq('id', id).eq('store_id', storeId).select().single();
            if (error) throw error;
            await writeAuditLog({ actorUserId: req.auth.userId, action: 'order_tracking_updated', entityType: 'order', entityId: id, metadata: { tracking_number, tracking_url: tracking_url || null } });
            await writeOrderTimeline({ orderId: id, actorUserId: req.auth.userId, eventType: 'tracking_updated', metadata: { tracking_number, tracking_url: tracking_url || null, has_notes: Boolean(notes) } });
            res.json(data);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.post('/api/admin/orders/:id/resend-confirmation', asyncHandler(async (req: any, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
      const { id } = req.params;
      const storeId = await getPrimaryStoreId();
      if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

      const { data: order, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('id', id)
        .eq('store_id', storeId)
        .single();
      if (error) throw error;
      if (!order || !['pagado', 'empacado', 'enviado', 'entregado', 'partially_refunded'].includes(order.status)) {
        return res.status(409).json({ error: 'Only paid or fulfilled orders can receive confirmation email.' });
      }

      const fakeSession = { id: order.stripe_session_id, customer_details: { email: order.customer_email } };
      await sendPaidOrderEmails(order, order.order_items || [], fakeSession);
      await writeAuditLog({ actorUserId: req.auth.userId, action: 'order_confirmation_resent', entityType: 'order', entityId: id });
      await writeOrderTimeline({ orderId: id, actorUserId: req.auth.userId, eventType: 'confirmation_resent' });
      res.json({ success: true });
    } catch (e: any) {
      logger.error({ err: e, orderId: req.params.id }, 'Confirmation resend failed');
      res.status(500).json({ error: e.message });
    }
  }));

app.post('/api/admin/orders/:id/refund', requireAuth(), asyncHandler(async (req: any, res) => {
  if (!supabase || !stripe) return res.status(500).json({ error: 'Not configured' });
  try {
    const { id } = req.params;
    const { amount, reason, restock } = req.body || {};
    const storeId = await getPrimaryStoreId();
    if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('store_id', storeId)
      .single();
    if (error) throw error;
    if (!order || !order.stripe_session_id) return res.status(400).json({ error: 'Cannot refund this order' });
    if (!['pagado', 'empacado', 'enviado', 'entregado', 'partially_refunded'].includes(order.status)) {
      return res.status(409).json({ error: `Order status ${order.status} cannot be refunded` });
    }

    const alreadyRefunded = Number(order.refunded_amount || 0);
    const orderTotal = Number(order.total || 0);
    const requestedAmount = amount === undefined || amount === null || amount === ''
      ? orderTotal - alreadyRefunded
      : Number(amount);

    if (!isPositiveMoney(requestedAmount)) return res.status(400).json({ error: 'Refund amount must be greater than zero' });
    if (requestedAmount + alreadyRefunded > orderTotal) {
      return res.status(400).json({ error: 'Refund amount exceeds remaining refundable total' });
    }

    const paymentIntentId = order.stripe_payment_intent_id || getPaymentIntentId(await stripe.checkout.sessions.retrieve(order.stripe_session_id));
    if (!paymentIntentId) return res.status(400).json({ error: 'No payment intent found' });

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: moneyToCents(requestedAmount),
      reason: ['duplicate', 'fraudulent', 'requested_by_customer'].includes(reason) ? reason : 'requested_by_customer',
      metadata: {
        order_id: id,
        store_slug: PRIMARY_STORE_SLUG
      }
    } as any);

    const newRefundedAmount = Number((alreadyRefunded + requestedAmount).toFixed(2));
    const newStatus = newRefundedAmount >= orderTotal ? 'refunded' : 'partially_refunded';
    const updatePayload: any = {
      status: newStatus,
      refunded_amount: newRefundedAmount,
      stripe_refund_id: refund.id,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single();
    if (updateError) throw updateError;

    if (restock === true && Array.isArray(order.order_items)) {
      for (const item of order.order_items) {
        await supabase.from('products')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', item.product_id);
        await supabase.rpc('restock_refunded_item', {
          product_id_input: item.product_id,
          quantity_input: item.quantity,
          order_id_input: id
        });
      }
    }

    await supabase.from('audit_logs').insert({
      actor_user_id: req.auth.userId,
      action: 'order_refund_created',
      entity_type: 'order',
      entity_id: id,
      metadata: { refund_id: refund.id, amount: requestedAmount, status: newStatus, restock: restock === true }
    });

    res.json(updatedOrder);
  } catch (e: any) {
    logger.error({ err: e, orderId: req.params.id }, 'Refund failed');
    res.status(500).json({ error: e.message });
  }
}));

  // Product CRUD
  app.get('/api/admin/products', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json([]);
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.json([]);
            const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId);
            if (error) throw error;
            res.json(data || []);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.post('/api/admin/products', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ id: Date.now().toString(), ...req.body });
          try {
            const parsedBody = ProductInputSchema.parse(req.body);

            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(404).json({ error: 'Primary store is not configured' });
            
            const newProduct = {
              ...parsedBody,
              variants: normalizeVariantInput(parsedBody.variants),
              store_id: storeId
            };
            // @ts-ignore
            const { data, error } = await supabase.from('products').insert([newProduct] as any[]).select().single();
            if (error) throw error;
            await writeAuditLog({ actorUserId: req.auth.userId, action: 'product_created', entityType: 'product', entityId: data.id, metadata: { name: data.name, stock: data.stock, variants: data.variants } });
            res.json(data);
          } catch (e: any) {
            if (e instanceof z.ZodError) {
              return res.status(400).json({ error: 'Validation Error', details: (e as any).errors });
            }
            res.status(500).json({ error: e.message });
          }
        }));

  app.put('/api/admin/products/:id', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ id: req.params.id, ...req.body });
          try {
            const parsedBody = ProductInputSchema.parse(req.body);

            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(404).json({ error: 'Primary store is not configured' });
            
            const updateData: any = { ...parsedBody };
            updateData.variants = normalizeVariantInput(parsedBody.variants);
            delete updateData.id;
            delete updateData.store_id;
            updateData.updated_at = new Date().toISOString();

            const { data, error } = await supabase.from('products')
              .update(updateData)
              .eq('id', req.params.id)
              .eq('store_id', storeId)
              .select().single();
            if (error) throw error;
            await writeAuditLog({ actorUserId: req.auth.userId, action: 'product_updated', entityType: 'product', entityId: req.params.id, metadata: { name: data.name, stock: data.stock, variants: data.variants } });
            res.json(data);
          } catch (e: any) {
            if (e instanceof z.ZodError) {
              return res.status(400).json({ error: 'Validation Error', details: (e as any).errors });
            }
            res.status(500).json({ error: e.message });
          }
        }));

  app.delete('/api/admin/products/:id', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ success: true });
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(404).json({ error: 'Primary store is not configured' });

            const { error } = await supabase.from('products')
              .delete()
              .eq('id', req.params.id)
              .eq('store_id', storeId);
              
            if (error) {
              if (error.code === '23503' || error.message.includes('foreign key constraint')) {
                return res.status(400).json({ 
                  error: 'Cannot delete this product because it has been ordered by customers. Please hide or archive the product instead.' 
                });
              }
              throw error;
            }
            res.json({ success: true });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  // Store config update
  app.put('/api/admin/store/config', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ success: true });
          try {
            // update config
            const { data: storeToUpdate } = await supabase.from('stores').select('id').limit(1).single();
            if (!storeToUpdate) throw new Error("Store not found");
            const { data, error } = await supabase.from('stores')
              .update({ config: req.body })
              .eq('id', storeToUpdate.id)
              .select().single();
            if (error) throw error;
            res.json(data);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  // Image Upload Endpoint
  app.post('/api/upload', requireAuth(), upload.single('file'), asyncHandler(async (req: any, res) => {
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
        }));

  // Public Store Info
  app.get('/api/stores/:slug', asyncHandler(async (req, res) => {
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
        }));


  // --- SEO / DISCOVERY ROUTES ---
  const xmlEscape = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const slugify = (value: any) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'producto';

  const productPublicPath = (product: any) => `/product/${product.id}/${slugify(product.slug || product.name || product.id)}`;

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/',
      'Disallow: /checkout/',
      'Disallow: /reset-password',
      'Disallow: /verify-email',
      '',
      `Sitemap: ${APP_URL.replace(/\/$/, '')}/sitemap.xml`,
      ''
    ].join('\n'));
  });

  app.get('/sitemap.xml', asyncHandler(async (_req, res) => {
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=900');
    const base = APP_URL.replace(/\/$/, '');
    const staticPages = ['/', '/faq', '/track', '/contact', '/privacy', '/terms', '/returns'];
    let productRows: any[] = [];

    if (supabase) {
      const storeId = await getPrimaryStoreId();
      if (storeId) {
        const { data, error } = await supabase
          .from('products')
          .select('id,name,slug,updated_at,created_at,status')
          .eq('store_id', storeId)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(500);
        if (!error) productRows = data || [];
      }
    }

    const urls = [
      ...staticPages.map((pathName) => ({ loc: `${base}${pathName}`, priority: pathName === '/' ? '1.0' : '0.7', changefreq: pathName === '/' ? 'daily' : 'weekly' })),
      ...productRows.map((product) => ({
        loc: `${base}${productPublicPath(product)}`,
        lastmod: product.updated_at || product.created_at,
        priority: '0.8',
        changefreq: 'weekly',
      })),
    ];

    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url: any) => `  <url>\n    <loc>${xmlEscape(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${xmlEscape(new Date(url.lastmod).toISOString())}</lastmod>` : ''}\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`).join('\n')}\n</urlset>`);
  }));

  app.get('/api/seo/products', asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    if (!supabase) return res.json({ data: [] });
    const storeId = await getPrimaryStoreId();
    if (!storeId) return res.json({ data: [] });
    const { data, error } = await supabase
      .from('products')
      .select('id,name,slug,seo_title,seo_description,description,images,price,stock,updated_at,status')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({
      data: (data || []).map((product: any) => ({
        ...product,
        canonical_path: productPublicPath(product),
      }))
    });
  }));


  // Products route for Tanstack Query hook (GET /api/products?store_slug=...)
  
  app.get('/api/products/:id', asyncHandler(async (req: any, res) => {
          res.set('Cache-Control', 'public, max-age=60');
          if (!supabase) return res.json(null);
          try {
            const { id } = req.params;
            const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
            if (error) throw error;
            res.json(data);
          } catch (e: any) {
            res.status(404).json({ error: 'Product not found' });
          }
        }));

  app.get('/api/products', asyncHandler(async (req, res) => {
          res.set('Cache-Control', 'public, max-age=60');
          if (!supabase) return res.json({ data: [], total: 0, page: 1, pageSize: 20 });
          try {
            const storeSlug = (req.query.store_slug as string) || PRIMARY_STORE_SLUG;
            
            const { data: store, error: storeError } = await supabase.from('stores').select('id').eq('slug', storeSlug).single();
            if (storeError || !store) return res.status(404).json({ error: 'Store not found' });
            const storeId = store.id;
            
            const search = req.query.search as string;
            const minPrice = req.query.min_price;
            const maxPrice = req.query.max_price;
            const sortBy = (req.query.sort_by as string) || 'created_at';
            const order = (req.query.order as string) || 'desc';
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = Math.min(parseInt(req.query.page_size as string) || 20, 100);

            const category = req.query.category as string;
            const subcategory = req.query.subcategory as string;
            let query = supabase.from('products').select('*', { count: 'exact' }).eq('store_id', storeId).eq('status', 'active');
            
            if (search) {
              query = query.ilike('name', `%${search}%`);
            }
            if (minPrice) query = query.gte('price', minPrice);
            if (maxPrice) query = query.lte('price', maxPrice);
            if (category && category !== 'all') {
              query = query.or(`category.eq."${category}",categories.cs.["${category}"]`);
            }
            if (subcategory && subcategory !== 'all') query = query.eq('subcategory', subcategory);
            
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
        }));

  
  // --- REVIEWS ---
  app.get('/api/products/:productId/reviews', asyncHandler(async (req: any, res) => {
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
        }));

  app.get('/api/products/:productId/rating', asyncHandler(async (req: any, res) => {
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
        }));

  app.post('/api/products/:productId/reviews', mockAuthMiddleware(), asyncHandler(async (req: any, res) => {
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
        }));

  // --- COUPONS ---
  app.get('/api/admin/coupons', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json([]);
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const { data, error } = await supabase.from('coupons').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
            if (error) throw error;
            res.json(data || []);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.post('/api/admin/coupons', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ success: true });
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const coupon = { ...req.body, store_id: storeId };
            if (coupon.code) coupon.code = String(coupon.code).trim().toUpperCase();
            const { data, error } = await supabase.from('coupons').insert([coupon] as any[]).select().single();
            if (error) throw error;
            await writeAuditLog({ actorUserId: req.auth.userId, action: 'coupon_created', entityType: 'coupon', entityId: data.id, metadata: { code: data.code, discount_type: data.discount_type, discount_value: data.discount_value } });
            res.json(data);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.put('/api/admin/coupons/:id', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ success: true });
          try {
            const { id } = req.params;
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });
            const allowed = ['code', 'discount_type', 'discount_value', 'min_order_amount', 'max_uses', 'expires_at', 'is_active'];
            const updatePayload = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
            if (updatePayload.code) updatePayload.code = String(updatePayload.code).trim().toUpperCase();
            updatePayload.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from('coupons').update(updatePayload).eq('id', id).eq('store_id', storeId).select().single();
            if (error) throw error;
            await writeAuditLog({ actorUserId: req.auth.userId, action: 'coupon_updated', entityType: 'coupon', entityId: id, metadata: updatePayload });
            res.json(data);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.delete('/api/admin/coupons/:id', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ success: true });
          try {
            const { id } = req.params;
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const { error } = await supabase.from('coupons').delete().eq('id', id).eq('store_id', storeId);
            if (error) throw error;
            res.json({ success: true });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.post('/api/admin/coupons/:id/send', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
          try {
            const { id } = req.params;
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });

            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const { data: coupon, error } = await supabase.from('coupons').select('*').eq('id', id).eq('store_id', storeId).single();
            if (error || !coupon) return res.status(404).json({ error: 'Coupon not found' });
            
            const discountText = coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`;
            const expiryDate = coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : undefined;

            await sendEmail({
              to: email,
              subject: 'A special gift just for you!',
              html: getDiscountCouponEmail(coupon.code, discountText, expiryDate)
            });

            res.json({ success: true, message: 'Coupon sent successfully' });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.post('/api/coupons/validate', asyncHandler(async (req: any, res) => {
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

            if (coupon.expires_at) {
              const expiry = new Date(coupon.expires_at);
              // Expiration is at the end of the chosen day (UTC)
              expiry.setUTCHours(23, 59, 59, 999);
              if (expiry.getTime() < new Date().getTime()) {
                return res.status(400).json({ error: 'Coupon expired' });
              }
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
        }));

  // --- ANALYTICS ---
  
  app.get('/api/admin/customers', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json([]);
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            // Get all registered users
            const { data: allUsers } = await supabase.from('users').select('id, email, full_name, created_at');

            // Get all-time paid orders
            const { data: allOrders, error } = await supabase.from('orders')
              .select('total, created_at, customer_email, customer_user_id')
              .eq('store_id', storeId)
              .in('status', ['paid', 'pagado', 'empacado', 'enviado', 'entregado']);

            if (error) throw error;

            const customersMap: Record<string, { id: string, email: string, name: string, orders_count: number, total_spent: number, last_order_date: string | null }> = {};

            // First add all registered users
            if (allUsers) {
              allUsers.forEach((u: any) => {
                customersMap[u.id] = {
                  id: u.id,
                  email: u.email,
                  name: u.full_name || '',
                  orders_count: 0,
                  total_spent: 0,
                  last_order_date: null // No orders yet
                };
                
                // Also index by email for guest orders linking
                if (u.email && !customersMap[u.email]) {
                   customersMap[u.email] = customersMap[u.id];
                }
              });
            }

            // Then add/aggregate orders
            if (allOrders) {
              allOrders.forEach((o: any) => {
                let customerRef = null;
                
                if (o.customer_user_id && customersMap[o.customer_user_id]) {
                  customerRef = customersMap[o.customer_user_id];
                } else if (o.customer_email && customersMap[o.customer_email]) {
                  customerRef = customersMap[o.customer_email];
                }
                
                // If guest order not linked to user, create a temporary entry
                if (!customerRef) {
                  const id = o.customer_email || 'Invitado-' + Math.random();
                  customerRef = {
                    id,
                    email: o.customer_email || 'Sin correo',
                    name: 'Invitado',
                    orders_count: 0,
                    total_spent: 0,
                    last_order_date: null
                  };
                  customersMap[id] = customerRef;
                }
                
                customerRef.orders_count += 1;
                customerRef.total_spent += o.total;
                
                if (!customerRef.last_order_date || new Date(o.created_at) > new Date(customerRef.last_order_date)) {
                  customerRef.last_order_date = o.created_at;
                }
              });
            }

            // Deduplicate by taking unique object references
            const uniqueCustomers = Array.from(new Set(Object.values(customersMap)));
            
            const customersList = uniqueCustomers.sort((a, b) => {
              // Sort by total spent, then by orders count, then by email
              if (b.total_spent !== a.total_spent) return b.total_spent - a.total_spent;
              if (b.orders_count !== a.orders_count) return b.orders_count - a.orders_count;
              return a.email.localeCompare(b.email);
            });

            res.json(customersList);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.get('/api/admin/customers/:id', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.status(404).json({ error: 'Supabase not configured' });
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });
            const { id } = req.params;
            const decodedId = decodeURIComponent(id);
            const isEmail = decodedId.includes('@');

            let user: any = null;
            if (!isEmail) {
              const userResult = await supabase.from('users').select('id, email, full_name, phone, created_at, shipping_address, billing_address').eq('id', decodedId).maybeSingle();
              if (!userResult.error) user = userResult.data;
            } else {
              const userResult = await supabase.from('users').select('id, email, full_name, phone, created_at, shipping_address, billing_address').ilike('email', decodedId).maybeSingle();
              if (!userResult.error) user = userResult.data;
            }

            let ordersQuery = supabase.from('orders').select('*, order_items(*, products(name, images))').eq('store_id', storeId).order('created_at', { ascending: false });
            if (user?.id) ordersQuery = ordersQuery.or(`customer_user_id.eq.${user.id},customer_email.ilike.${user.email}`);
            else ordersQuery = ordersQuery.ilike('customer_email', decodedId);
            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            const paidOrders = (orders || []).filter((order: any) => ['pagado', 'empacado', 'enviado', 'entregado', 'partially_refunded'].includes(order.status));
            const totalSpent = paidOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
            res.json({
              customer: user || { id: decodedId, email: decodedId, full_name: 'Invitado' },
              summary: { orders_count: paidOrders.length, total_spent: totalSpent, last_order_date: paidOrders[0]?.created_at || null },
              orders: orders || []
            });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.get('/api/admin/analytics/sales', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json({ total_revenue: 0, total_orders: 0, average_order_value: 0, sales_by_day: [], sales_by_month: [] });
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            // Get all-time paid orders
            const { data: allOrders, error } = await supabase.from('orders')
              .select('total, created_at, customer_email, customer_user_id')
              .eq('store_id', storeId)
              .in('status', ['paid', 'pagado', 'empacado', 'enviado', 'entregado']);

            if (error) throw error;

            let total_revenue = 0;
            let total_orders = allOrders ? allOrders.length : 0;
            let unique_customers = new Set();
            
            const sales_by_day_map: Record<string, { revenue: number, orders: number }> = {};
            const sales_by_month_map: Record<string, { revenue: number, orders: number }> = {};
            
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            if (allOrders) {
              allOrders.forEach((o: any) => {
                total_revenue += o.total;
                
                if (o.customer_email) unique_customers.add(o.customer_email);
                else if (o.customer_user_id) unique_customers.add(o.customer_user_id);
                
                const createdDate = new Date(o.created_at);
                
                // Monthly
                const monthStr = createdDate.toISOString().slice(0, 7); // YYYY-MM
                if (!sales_by_month_map[monthStr]) {
                  sales_by_month_map[monthStr] = { revenue: 0, orders: 0 };
                }
                sales_by_month_map[monthStr].revenue += o.total;
                sales_by_month_map[monthStr].orders += 1;
                
                // Daily (only last 30 days)
                if (createdDate >= thirtyDaysAgo) {
                    const dateStr = createdDate.toISOString().split('T')[0];
                    if (!sales_by_day_map[dateStr]) {
                      sales_by_day_map[dateStr] = { revenue: 0, orders: 0 };
                    }
                    sales_by_day_map[dateStr].revenue += o.total;
                    sales_by_day_map[dateStr].orders += 1;
                }
              });
            }

            const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;
            
            const sales_by_day = Object.keys(sales_by_day_map).map(date => ({
              date,
              revenue: sales_by_day_map[date].revenue,
              orders: sales_by_day_map[date].orders
            })).sort((a, b) => a.date.localeCompare(b.date));
            
            const sales_by_month = Object.keys(sales_by_month_map).map(month => ({
              month,
              revenue: sales_by_month_map[month].revenue,
              orders: sales_by_month_map[month].orders
            })).sort((a, b) => a.month.localeCompare(b.month));

            res.json({ total_revenue, total_orders, average_order_value, sales_by_day, sales_by_month, total_customers: unique_customers.size });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.get('/api/admin/analytics/top_products', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json([]);
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const { data: orderItems, error } = await supabase
              .from('order_items')
              .select('quantity, unit_price, product_id, orders!inner(store_id, status), products(name)')
              .eq('orders.store_id', storeId)
              .in('orders.status', ['paid', 'pagado', 'empacado', 'enviado', 'entregado']);
            
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
        }));

  
  app.get('/api/admin/analytics/coupons', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json([]);
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const { data: coupons, error } = await supabase.from('coupons')
              .select('code, discount_type, discount_value, current_uses')
              .eq('store_id', storeId)
              .order('current_uses', { ascending: false });

            if (error) throw error;
            res.json(coupons || []);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.get('/api/admin/analytics/recent_orders', requireAuth(), asyncHandler(async (req: any, res) => {
          if (!supabase) return res.json([]);
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.status(403).json({ error: 'Primary store is not configured' });

            const { data: orders, error } = await supabase.from('orders')
              .select('id, total, status, created_at, customer_email')
              .eq('store_id', storeId)
              .order('created_at', { ascending: false })
              .limit(5);

            if (error) throw error;
            res.json(orders || []);
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  app.get('/api/public/store', asyncHandler(async (req, res) => {
          if (!supabase) return res.json({ store: { name: 'Terra & Tide', config: { themeColor: '#6B705C' } }, products: [] });
          try {
            const storeId = await getPrimaryStoreId();
            if (!storeId) return res.json({ store: { name: 'Selfcare Sinners', config: { themeColor: '#6B705C' } }, products: [] });
            const { data: store, error } = await supabase.from('stores').select('*').eq('id', storeId).single();
            if (error || !store) return res.json({ store: { name: 'Selfcare Sinners', config: { themeColor: '#6B705C' } }, products: [] });

            const { data: products } = await supabase.from('products').select('*').eq('store_id', storeId);
            res.json({ store, products: products || [] });
          } catch (e: any) {
            res.status(500).json({ error: e.message });
          }
        }));

  // Vite middleware for development
  
  // --- WISHLIST ENDPOINTS ---
  app.get('/api/wishlist', requireAuth(), asyncHandler(async (req: any, res) => {
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
        }));

  app.post('/api/wishlist', requireAuth(), asyncHandler(async (req: any, res) => {
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
        }));

  app.delete('/api/wishlist/:productId', requireAuth(), asyncHandler(async (req: any, res) => {
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
        }));

  // --- ABANDONED CART ENDPOINTS ---
  app.post('/api/cart/sync', asyncHandler(async (req: any, res) => {
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
        }));

  app.get('/api/cart/recover', asyncHandler(async (req, res) => {
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
        }));

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
        logger.error({ err: error }, 'Error fetching abandoned carts:');
        return;
      }
      
      for (const cart of carts || []) {
        if (!cart.items || cart.items.length === 0) continue;
        
        // Ensure email is valid
        if (!cart.email || !cart.email.includes('@')) continue;

        const recoverUrl = `\${process.env.VITE_APP_URL || 'http://localhost:3000'}/recover?token=\${cart.id}`;
        
        const itemsHtml = cart.items.map((i: any) => `
          <div class="order-item">
            <span>\${i.quantity}x \${i.name}</span>
            <span>\${i.price}</span>
          </div>
        `).join('');
        
        await sendEmail({
          to: cart.email,
          subject: 'Complete your purchase',
          html: getAbandonedCartEmail(recoverUrl, itemsHtml)
        });
        
        await supabase
          .from('abandoned_carts')
          .update({ reminder_sent: true })
          .eq('id', cart.id);
      }
    } catch (e) {
      logger.error({ err: e }, 'Cron job error:');
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

  // Sentry Error Handler
  Sentry.setupExpressErrorHandler(app);

  // Global Error Handling Middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled Error');
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: (err as any).errors });
    }
    const statusCode = err.status || err.statusCode || (err instanceof AppError ? err.statusCode : 500);
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({
      error: message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

startServer();

