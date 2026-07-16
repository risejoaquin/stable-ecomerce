const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Replace register function
const oldRegister = `app.post('/api/auth/register', async (req, res) => {
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
});`;

const newRegister = `app.post('/api/auth/register', async (req, res) => {
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
    
    // Genera un token aleatorio seguro de 32 bytes (64 caracteres hex)
    const verification_token = crypto.randomBytes(32).toString('hex');

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email,
      password_hash,
      full_name: full_name || '',
      verification_token
    });

    if (insertError) {
      throw insertError;
    }

    if (resend) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationLink = \`\${frontendUrl}/verify?token=\${verification_token}\`;
      
      sendEmail({
        to: email,
        subject: 'Verifica tu correo electrónico',
        html: \`<p>Hola \${full_name || email},</p><p>Gracias por registrarte. Por favor, verifica tu correo electrónico haciendo clic en el siguiente enlace:</p><a href="\${verificationLink}">Verificar correo</a>\`
      }).catch(console.error);
    }

    res.status(201).json({ message: 'User created. Please check your email to verify your account.' });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

serverCode = serverCode.replace(oldRegister, newRegister);

// Replace login function
const oldLogin = `app.post('/api/auth/login', async (req, res) => {
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
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

const newLogin = `app.post('/api/auth/login', async (req, res) => {
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
    
    if (!user.verified_at) {
      return res.status(401).json({ error: 'Email no verificado. Revisa tu correo.' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const { data: user } = await supabase.from('users').select('*').eq('verification_token', token).single();
    if (!user) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    
    const { error: updateError } = await supabase.from('users').update({
      verified_at: new Date().toISOString(),
      verification_token: null
    }).eq('id', user.id);
    
    if (updateError) {
      throw updateError;
    }
    
    res.status(200).json({ message: 'Email verificado con éxito' });
  } catch (err: any) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

serverCode = serverCode.replace(oldLogin, newLogin);

fs.writeFileSync('server.ts', serverCode);
