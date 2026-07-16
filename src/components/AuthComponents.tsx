import React from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthContext();
  if (isLoading) return null;
  if (user) return <>{children}</>;
  return null;
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthContext();
  if (isLoading) return null;
  if (!user) return <>{children}</>;
  return null;
};

export const UserButton = () => {
  const { user, logout } = useAuthContext();
  if (!user) return null;
  return (
    <button onClick={logout} className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-400" title="Sign out">
      {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
    </button>
  );
};

export const RedirectToSignIn = () => {
  return <Navigate to="/login" replace />;
};

export const SignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <Link to="/login">{children}</Link>;
};

export const SignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <Link to="/register">{children}</Link>;
};
