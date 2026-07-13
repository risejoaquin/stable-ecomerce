import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { StoreHeader } from '../components/storefront/StoreHeader';
import { SEO } from '../components/SEO';
import { toast } from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged in successfully');
      navigate('/');
    }
    setLoading(false);
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
