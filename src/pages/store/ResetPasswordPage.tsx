import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Lock } from 'lucide-react';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Error al restablecer contraseña');
      
      toast.success('Contraseña actualizada correctamente');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-md w-full text-center">
          <p className="text-red-600 font-medium">Enlace de recuperación inválido o faltante.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-[#6B705C] bg-opacity-10 text-[#6B705C] rounded-full flex items-center justify-center mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-serif text-[#333]">Restablecer Contraseña</h2>
          <p className="text-gray-500 text-sm mt-1 text-center">Ingresa tu nueva contraseña para acceder a tu cuenta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6B705C] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6B705C] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#6B705C] text-white font-bold py-3 rounded-lg hover:bg-[#5a5f4d] disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
