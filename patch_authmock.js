import fs from 'fs';
let content = fs.readFileSync('src/components/AuthMock.tsx', 'utf8');

// Update openAuthModal type
content = content.replace(
  `let openAuthModal: ((mode: 'signin' | 'signup') => void) | null = null;`,
  `let openAuthModal: ((mode: 'signin' | 'signup' | 'forgot-password') => void) | null = null;`
);

// Update setMode state
content = content.replace(
  `const [mode, setMode] = useState<'signin' | 'signup'>('signin');`,
  `const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');`
);

// Update modal title
content = content.replace(
  `{mode === 'signin' ? 'Sign In' : 'Sign Up'}`,
  `{mode === 'signin' ? 'Iniciar Sesión' : mode === 'signup' ? 'Crear Cuenta' : 'Recuperar Contraseña'}`
);

// Update handleSubmit
const oldHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await fetch(\`\${API_URL}\${endpoint.replace('/api', '')}\`, {
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
  };`;

const newHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'forgot-password') {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(\`\${API_URL}/forgot-password\`, {
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
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(\`\${API_URL}\${endpoint.replace('/api', '')}\`, {
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
      window.location.reload(); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };`;

content = content.replace(oldHandleSubmit, newHandleSubmit);

// Update form fields
const oldFormFields = `<form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required 
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-black text-white font-medium py-2 rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Cargando...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>`;

const newFormFields = `<form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {mode !== 'forgot-password' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                    {mode === 'signin' && (
                      <button 
                        type="button" 
                        onClick={() => { setMode('forgot-password'); setError(''); }} 
                        className="text-xs text-[#6B705C] hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <input 
                    type="password" 
                    required 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#6B705C] text-white font-medium py-2 rounded hover:bg-[#5a5f4d] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Cargando...' : (mode === 'signin' ? 'Iniciar Sesión' : mode === 'signup' ? 'Crear Cuenta' : 'Enviar Enlace')}
              </button>
            </form>`;

content = content.replace(oldFormFields, newFormFields);

const oldFooter = `<div className="mt-4 text-center text-sm">
              {mode === 'signin' ? (
                <p>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }} className="text-blue-600 underline">Sign up</button></p>
              ) : (
                <p>Already have an account? <button onClick={() => { setMode('signin'); setError(''); }} className="text-blue-600 underline">Sign in</button></p>
              )}
            </div>`;

const newFooter = `<div className="mt-4 text-center text-sm">
              {mode === 'signin' ? (
                <p>¿No tienes una cuenta? <button onClick={() => { setMode('signup'); setError(''); }} className="text-[#6B705C] font-semibold hover:underline">Regístrate</button></p>
              ) : mode === 'signup' ? (
                <p>¿Ya tienes una cuenta? <button onClick={() => { setMode('signin'); setError(''); }} className="text-[#6B705C] font-semibold hover:underline">Inicia sesión</button></p>
              ) : (
                <p><button onClick={() => { setMode('signin'); setError(''); }} className="text-[#6B705C] font-semibold hover:underline">Volver a Iniciar Sesión</button></p>
              )}
            </div>`;
content = content.replace(oldFooter, newFooter);

fs.writeFileSync('src/components/AuthMock.tsx', content);
