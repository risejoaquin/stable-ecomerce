import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { StoreHeader } from '../components/storefront/StoreHeader';
import { SEO } from '../components/SEO';
import { toast } from 'react-hot-toast';
import { useAuthContext } from '../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthContext();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.error === 'Email no verificado. Revisa tu correo.') {
          toast.error(data.error);
        } else {
          toast.error(data.error || 'Failed to login');
        }
      } else {
        login(data.token, data.user);
        toast.success('Logged in successfully');
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans">
      <SEO title="Sign In" />
      <StoreHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">Sign In</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#6B705C] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#6B705C] focus:outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#6B705C] text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <p className="text-center text-sm text-gray-600 mt-4">
              Don't have an account? <Link to="/sign-up" className="text-[#6B705C] font-bold hover:underline">Sign Up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
