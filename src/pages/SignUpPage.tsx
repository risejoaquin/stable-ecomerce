import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StoreHeader } from '../components/storefront/StoreHeader';
import { SEO } from '../components/SEO';
import { toast } from 'react-hot-toast';

export function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to sign up');
      } else {
        toast.success('Account created successfully! Please sign in.');
        navigate('/sign-in');
      }
    } catch (err: any) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans">
      <SEO title="Sign Up" />
      <StoreHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={handleSignUp} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">Sign Up</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#6B705C] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#6B705C] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#6B705C] focus:outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#6B705C] text-white font-bold py-3 rounded-lg hover:bg-opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account? <Link to="/sign-in" className="text-[#6B705C] font-bold hover:underline">Sign In</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
