import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

// Add imports
if (!code.includes("import helmet")) {
  code = `import helmet from 'helmet';\nimport rateLimit from 'express-rate-limit';\n` + code;
}

// Add security headers and rate limit config
const securityConfig = `
  app.use(helmet({
    contentSecurityPolicy: false, // Too restrictive for preview envs, but basic protections apply
  }));

  const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many orders created, please try again later.' });
  const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many checkout attempts, please try again later.' });
  const contactLimiter = rateLimit({ windowMs: 60 * 1000, max: 3, message: 'Too many contact messages, please try again later.' });
`;

if (!code.includes('helmet(')) {
  code = code.replace(
    `const app = express();\n\n  app.use(cors());`,
    `const app = express();\n\n  app.use(cors());\n${securityConfig}`
  );
}

// Add caching to GET products
code = code.replace(
  `app.get('/api/products', async (req, res) => {`,
  `app.get('/api/products', async (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');`
);
code = code.replace(
  `app.get('/api/products/:id', async (req: any, res) => {`,
  `app.get('/api/products/:id', async (req: any, res) => {
    res.set('Cache-Control', 'public, max-age=60');`
);

// Apply rate limits
code = code.replace(
  `app.post('/api/orders', requireAuth(), async (req: any, res) => {`,
  `app.post('/api/orders', requireAuth(), orderLimiter, async (req: any, res) => {`
);
code = code.replace(
  `app.post('/api/checkout', requireAuth(), async (req: any, res) => {`,
  `app.post('/api/checkout', requireAuth(), checkoutLimiter, async (req: any, res) => {`
);

// Enhance health check
code = code.replace(
  `app.get('/api/health', async (req, res) => {
    res.json({ status: 'ok' });
  });`,
  `app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    if (supabase) {
      try {
        const { data, error } = await supabase.from('stores').select('id').limit(1);
        dbStatus = error ? 'error' : 'connected';
      } catch (e) {
        dbStatus = 'error';
      }
    }
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      stripe: stripe ? 'configured' : 'missing',
      resend: resend ? 'configured' : 'missing'
    });
  });`
);

// Add contact endpoint
const contactEndpoint = `
  app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });
      
      const html = \`
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> \${name}</p>
        <p><strong>Email:</strong> \${email}</p>
        <p><strong>Message:</strong><br/>\${message}</p>
      \`;
      
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: \`Contact from \${name}\`,
        html
      });
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
`;

if (!code.includes('/api/contact')) {
  code = code.replace(
    `app.get('/api/health'`,
    contactEndpoint + `\n  app.get('/api/health'`
  );
}

fs.writeFileSync('server.ts', code);
