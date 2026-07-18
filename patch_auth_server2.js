import fs from 'fs';

let server = fs.readFileSync('server.ts', 'utf-8');

const loginRegisterRoutes = `
  // --- AUTH ROUTES ---
  app.post('/api/register', async (req, res) => {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
      const password_hash = await bcrypt.hash(password, 10);
      const { data, error } = await supabase
        .from('users')
        .insert([{ email, password_hash, full_name }])
        .select()
        .single();
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        throw error;
      }
      const token = jwt.sign({ userId: data.id, role: data.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: data.id, email: data.email, full_name: data.full_name, role: data.role } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/login', async (req, res) => {
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
      
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

`;

if (!server.includes("'/api/register'")) {
  server = server.replace(
    "  app.get('/api/health', async (req, res) => {",
    loginRegisterRoutes + "  app.get('/api/health', async (req, res) => {"
  );
  fs.writeFileSync('server.ts', server);
}
