import React from 'react';

export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  return null;
};

export const UserButton = () => {
  return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">A</div>;
};

export const RedirectToSignIn = () => {
  return <div>Please sign in</div>;
};

export const SignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div onClick={() => alert("Sign in mock")}>{children}</div>;
};

export const SignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div onClick={() => alert("Sign up mock")}>{children}</div>;
};

export const SignIn = () => {
  return <div>Sign In Page (Mock)</div>;
};

export const SignUp = () => {
  return <div>Sign Up Page (Mock)</div>;
};
