import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');

const apiRoutes = `
  // --- API ROUTES ---
  app.use(express.json());
  
  app.get('/api/public/store', (req, res) => {
    res.json({ store: { name: 'Terra & Tide', config: {} }, items: [], message: 'Store catalog mock' });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ id: 'mock-id', email: 'test@example.com', fullName: 'Test User' });
  });

  app.post('/api/auth/login', (req, res) => {
    res.json({ token: 'mock-token', user: { id: 'mock-id', email: 'test@example.com' } });
  });
  
  app.post('/api/auth/register', (req, res) => {
    res.json({ token: 'mock-token', user: { id: 'mock-id', email: 'test@example.com' } });
  });

  // Default catch-all for /api
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

`;

const patched = content.replace(/\/\/ --- API PROXY ---[\s\S]*?\}\)\);/, apiRoutes);
fs.writeFileSync('server.ts', patched);
