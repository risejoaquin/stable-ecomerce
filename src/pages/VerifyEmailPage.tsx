import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { StoreHeader } from '../components/storefront/StoreHeader';
import { SEO } from '../components/SEO';
import { useApiClient } from '../api/useApiClient';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando...');
  const { get } = useApiClient();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token no proporcionado.');
      return;
    }

    let isMounted = true;
    
    get(\`/auth/verify?token=\${token}\`)
      .then((data) => {
        if (isMounted) {
          setStatus('success');
          setMessage('Correo verificado correctamente. Ya puedes iniciar sesión.');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setStatus('error');
          setMessage(err.message || 'Error al verificar el correo.');
        }
      });
      
    return () => { isMounted = false; };
  }, [token, get]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans">
      <SEO title="Verificar Correo" />
      <StoreHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm w-full max-w-md text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 text-[#6B705C] animate-spin mb-4" />
              <h1 className="text-xl font-bold text-gray-900">{message}</h1>
            </div>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">¡Verificación Exitosa!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link to="/sign-in" className="w-full bg-[#6B705C] text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-opacity inline-block">
                Iniciar Sesión
              </Link>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Error de Verificación</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link to="/" className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors inline-block">
                Volver al Inicio
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
