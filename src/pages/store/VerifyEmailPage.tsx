import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { StoreHeader } from '../../components/storefront/StoreHeader';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        if (response.ok) {
          setStatus('success');
          setTimeout(() => navigate('/'), 3000);
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Verification failed');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('An unexpected error occurred.');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans flex flex-col">
      <StoreHeader />
      <main className="flex-1 flex flex-col items-center justify-center p-4 mt-20">
        <div className="max-w-md w-full bg-white p-12 text-center rounded-xl shadow-sm">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-gray-900 animate-spin" />
              <h2 className="text-xl font-medium tracking-tight">Verifying Email...</h2>
              <p className="text-gray-500">Please wait while we verify your account.</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h2 className="text-xl font-medium tracking-tight">Email Verified!</h2>
              <p className="text-gray-500">Your account has been verified successfully. Redirecting you to the store...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <XCircle className="h-12 w-12 text-red-600" />
              <h2 className="text-xl font-medium tracking-tight">Verification Failed</h2>
              <p className="text-gray-500">{errorMessage}</p>
              <button 
                onClick={() => navigate('/')}
                className="mt-4 px-6 py-3 bg-black text-white text-sm font-medium tracking-wide uppercase hover:bg-gray-900 transition-colors"
              >
                Return to Store
              </button>
            </div>
          )}
        </div>
      </main>
      <footer className="bg-white border-t border-gray-100 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Selfcare Sinners. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
