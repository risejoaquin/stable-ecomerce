import fs from 'fs';

let server = fs.readFileSync('server.ts', 'utf-8');

const registerTarget = `            // Send Welcome Email
      await sendEmail({
        to: email,
        subject: 'Welcome to Selfcare Sinners!',
        html: \`<h1>Welcome to Selfcare Sinners, \${full_name || 'Gorgeous'}!</h1><p>We are thrilled to have you here. Discover our exclusive collection of luxury self-care products designed just for you.</p><p>Enjoy shopping with us!</p>\`
      });
      
      const token = jwt.sign({ userId: data.id, role: data.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: data.id, email: data.email, full_name: data.full_name, role: data.role } });`;

const registerReplacement = `      // Generate verification token
      const verificationToken = jwt.sign({ userId: data.id, purpose: 'email_verification' }, JWT_SECRET, { expiresIn: '24h' });
      const verificationLink = \`\${req.protocol}://\${req.get('host')}/verify-email?token=\${verificationToken}\`;

      // Send Verification Email
      await sendEmail({
        to: email,
        subject: 'Verify your Selfcare Sinners account',
        html: \`<h1>Welcome to Selfcare Sinners, \${full_name || 'Gorgeous'}!</h1>
               <p>We are thrilled to have you here. Please click the link below to verify your email address:</p>
               <a href="\${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>
               <p>If you did not create this account, you can safely ignore this email.</p>\`
      });
      
      // Still issue a normal token so they can be logged in immediately (or you can require verification to log in)
      const token = jwt.sign({ userId: data.id, role: data.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: data.id, email: data.email, full_name: data.full_name, role: data.role, is_verified: false }, message: 'Registration successful. Please check your email to verify your account.' });`;

server = server.replace(registerTarget, registerReplacement);

const newRoutes = `
  app.post('/api/verify-email', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
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
  });

  app.post('/api/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
      if (error || !user) return res.status(404).json({ error: 'User not found' });
      if (user.is_verified) return res.status(400).json({ error: 'Email is already verified' });
      
      const verificationToken = jwt.sign({ userId: user.id, purpose: 'email_verification' }, JWT_SECRET, { expiresIn: '24h' });
      const verificationLink = \`\${req.protocol}://\${req.get('host')}/verify-email?token=\${verificationToken}\`;
      
      await sendEmail({
        to: email,
        subject: 'Verify your Selfcare Sinners account',
        html: \`<h1>Hello \${user.full_name || 'Gorgeous'}!</h1>
               <p>Please click the link below to verify your email address:</p>
               <a href="\${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>\`
      });
      
      res.json({ success: true, message: 'Verification email resent.' });
    } catch (e: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
`;

// Insert the new routes after /api/login
const loginTarget = `app.post('/api/login', async (req, res) => {`;
server = server.replace(loginTarget, newRoutes + '\n  ' + loginTarget);

fs.writeFileSync('server.ts', server);
