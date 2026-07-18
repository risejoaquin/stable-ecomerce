import React from 'react';
import { useAuthSafe } from '../hooks/useAuthSafe';

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
  return <div>Please sign in</div>;
};

export const SignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div onClick={() => alert("Sign In functionality needs to be integrated with the new JWT auth backend.")}>{children}</div>;
};

export const SignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div onClick={() => alert("Sign Up functionality needs to be integrated with the new JWT auth backend.")}>{children}</div>;
};

export const SignIn = () => {
  return <div>Sign In Page</div>;
};

export const SignUp = () => {
  return <div>Sign Up Page</div>;
};
