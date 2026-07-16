const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

if (!serverCode.includes("import bcrypt from 'bcryptjs';")) {
  serverCode = "import bcrypt from 'bcryptjs';\nimport crypto from 'crypto';\n" + serverCode;
}

const newAuthCode = `
// --- AUTH ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email,
      password_hash,
      full_name: full_name || ''
    });

    if (insertError) {
      throw insertError;
    }

    if (resend) {
      sendEmail({
        to: email,
        subject: 'Welcome to our store!',
        html: '<p>Welcome ' + (full_name || email) + '!</p>'
      }).catch(console.error);
    }

    res.status(201).json({ message: 'User created' });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      SUPABASE_JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', requireAuth(), async (req: any, res) => {
  try {
    const { data: user } = await supabase.from('users').select('id, email, full_name, created_at').eq('id', req.auth.userId).single();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// --- END AUTH ENDPOINTS ---
`;

if (!serverCode.includes('/api/auth/register')) {
  serverCode = serverCode.replace("app.use(express.json());", "app.use(express.json());\n" + newAuthCode);
  fs.writeFileSync('server.ts', serverCode);
} else {
  console.log("Auth endpoints already injected.");
}
