import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');

const apiImplementation = `
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'fallback_secret';

const apiRouter = express.Router();
apiRouter.use(express.json());

apiRouter.post('/auth/register', async (req, res) => {
  const { email, password, full_name } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email in use' });
    
    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [id, email, hash, full_name]
    );
    const token = jwt.sign({ id, email, full_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email, full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, email: user.email, full_name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await pool.query('SELECT id, email, full_name FROM users WHERE id = $1', [(decoded as any).id]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    res.json(userRes.rows[0]);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

apiRouter.get('/public/store', async (req, res) => {
  try {
    const stores = await pool.query("SELECT * FROM stores WHERE status = 'active' LIMIT 1");
    if (stores.rows.length === 0) return res.json({ store: null, items: [] });
    const store = stores.rows[0];
    const products = await pool.query('SELECT * FROM products WHERE store_id = $1', [store.id]);
    res.json({ store, items: products.rows });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware for protected routes
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

apiRouter.get('/admin/store', requireAuth, async (req, res) => {
  try {
    const stores = await pool.query("SELECT * FROM stores WHERE owner_user_id = $1", [(req as any).user.id]);
    if (stores.rows.length === 0) return res.json({ hasStore: false });
    res.json({ hasStore: true, store: stores.rows[0] });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.get('/admin/products', requireAuth, async (req, res) => {
  try {
    const stores = await pool.query("SELECT id FROM stores WHERE owner_user_id = $1", [(req as any).user.id]);
    if (stores.rows.length === 0) return res.json([]);
    const storeId = stores.rows[0].id;
    const products = await pool.query('SELECT * FROM products WHERE store_id = $1', [storeId]);
    res.json(products.rows);
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

apiRouter.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', apiRouter);
`;

const proxyRegex = /\/\/ --- API PROXY ---[\s\S]*?\}\)\);/;

if (proxyRegex.test(content)) {
  const patched = content.replace(proxyRegex, apiImplementation);
  fs.writeFileSync('server.ts', patched);
  console.log('Patched server.ts successfully.');
} else {
  console.log('Proxy regex not found in server.ts');
}
