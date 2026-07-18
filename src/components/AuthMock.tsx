import React, { useState } from 'react';
import { useAuthSafe } from '../hooks/useAuthSafe';

// Un simple store global para el modal de auth
let openAuthModal: ((mode: 'signin' | 'signup') => void) | null = null;

export const AuthModalProvider = ({ children }: { children?: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  openAuthModal = (newMode) => {
    setMode(newMode);
    setIsOpen(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await fetch(`${API_URL}${endpoint.replace('/api', '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }

      localStorage.setItem('auth_token', data.token);
      window.location.reload(); // Recargamos para que toda la app tome el nuevo estado
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">
              {mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </h2>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
            </form>

            <div className="mt-4 text-center text-sm">
              {mode === 'signin' ? (
                <p>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }} className="text-blue-600 underline">Sign up</button></p>
              ) : (
                <p>Already have an account? <button onClick={() => { setMode('signin'); setError(''); }} className="text-blue-600 underline">Sign in</button></p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};


export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuthSafe();
  return isSignedIn ? <>{children}</> : null;
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuthSafe();
  return !isSignedIn ? <>{children}</> : null;
};

export const UserButton = () => {
  return <div onClick={() => {
    localStorage.removeItem('auth_token');
    window.location.reload();
  }} className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 cursor-pointer" title="Sign Out">U</div>;
};

export const RedirectToSignIn = () => {
  // Cuando se monta este componente, podríamos abrir el modal, pero por ahora mostramos un mensaje
  React.useEffect(() => {
    if (openAuthModal) openAuthModal('signin');
  }, []);
  return <div>Please sign in...</div>;
};

export const SignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div className="cursor-pointer" onClick={() => {
    if (openAuthModal) openAuthModal('signin');
  }}>{children}</div>;
};

export const SignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div className="cursor-pointer" onClick={() => {
    if (openAuthModal) openAuthModal('signup');
  }}>{children}</div>;
};

export const SignIn = () => {
  return <div>Sign In Page</div>;
};

export const SignUp = () => {
  return <div>Sign Up Page</div>;
};
