import React from 'react';
import { useSupabaseAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const SafeSignedIn = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useSupabaseAuth();
  if (isLoading) return null;
  if (user) return <>{children}</>;
  return null;
};

export const SafeSignedOut = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useSupabaseAuth();
  if (isLoading) return null;
  if (!user) return <>{children}</>;
  return null;
};

export const SafeUserButton = () => {
  const { user, signOut } = useSupabaseAuth();
  if (!user) return null;
  return (
    <button onClick={signOut} className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-400" title="Sign out">
      {user.email?.charAt(0).toUpperCase()}
    </button>
  );
};

export const SafeRedirectToSignIn = () => {
  return <Navigate to="/sign-in" replace />;
};

export const SafeSignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <Link to="/sign-in">{children}</Link>;
};

export const SafeSignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <Link to="/sign-up">{children}</Link>;
};
