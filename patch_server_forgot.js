import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const forgotEndpoint = `
  app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
      if (error || !user) {
        // Para no revelar si el correo existe o no
        return res.json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });
      }
      
      const resetToken = jwt.sign({ userId: user.id, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
      const resetLink = \`\${req.protocol}://\${req.get('host')}/reset-password?token=\${resetToken}\`;
      
      await sendEmail({
        to: email,
        subject: 'Recuperación de contraseña',
        html: \`
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Recuperación de Contraseña</h2>
            <p>Hola \${user.full_name || 'Usuario'},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="\${resetLink}" style="background-color: #6B705C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
                Restablecer Contraseña
              </a>
            </div>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          </div>
        \`
      });

      res.json({ message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.' });
    } catch (err: any) {
      console.error('Error en forgot-password:', err);
      res.status(500).json({ error: 'Ocurrió un error al procesar tu solicitud.' });
    }
  });

  app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Faltan datos requeridos.' });
    
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.purpose !== 'password_reset') return res.status(400).json({ error: 'Token inválido' });
      
      const password_hash = await bcrypt.hash(newPassword, 10);
      
      const { error } = await supabase.from('users').update({ password_hash }).eq('id', decoded.userId);
      
      if (error) throw error;
      
      res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') return res.status(400).json({ error: 'El enlace ha expirado.' });
      res.status(400).json({ error: 'El enlace es inválido o ha expirado.' });
    }
  });
`;

if (!content.includes('/api/forgot-password')) {
  content = content.replace(
    `app.post('/api/login'`,
    forgotEndpoint + `\n  app.post('/api/login'`
  );
  fs.writeFileSync('server.ts', content);
}
