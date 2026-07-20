import fs from 'fs';
let content = fs.readFileSync('src/components/AuthMock.tsx', 'utf8');

const oldSubmit = \`  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'signin' ? '/api/login' : '/api/register';
    const body = mode === 'signin' 
      ? { email, password } 
      : { email, password, full_name: fullName };

    try {
      // Usamos fetch directamente para evitar dependencias circulares con apiClient
      // o problemas si no está inicializado
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(\\\`\\\${API_URL}\\\${endpoint.replace('/api', '')}\\\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }

      localStorage.setItem('auth_token', data.token);
      if (mode === 'signup' && data.message) {
        alert(data.message);
      }
      window.location.reload(); // Recargamos para que toda la app tome el nuevo estado
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };\`;

const newSubmit = \`  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'forgot-password') {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(\\\`\\\${API_URL}/forgot-password\\\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error enviando el correo');
        }
        alert(data.message || 'Se ha enviado un enlace para restablecer tu contraseña.');
        setMode('signin');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const endpoint = mode === 'signin' ? '/api/login' : '/api/register';
    const body = mode === 'signin' 
      ? { email, password } 
      : { email, password, full_name: fullName };

    try {
      // Usamos fetch directamente para evitar dependencias circulares con apiClient
      // o problemas si no está inicializado
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(\\\`\\\${API_URL}\\\${endpoint.replace('/api', '')}\\\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }

      localStorage.setItem('auth_token', data.token);
      if (mode === 'signup' && data.message) {
        alert(data.message);
      }
      window.location.reload(); // Recargamos para que toda la app tome el nuevo estado
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };\`;

content = content.replace(oldSubmit, newSubmit);
fs.writeFileSync('src/components/AuthMock.tsx', content);
