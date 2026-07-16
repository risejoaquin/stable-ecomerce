import React from 'react';
import { SignedIn, SignedOut, UserButton, RedirectToSignIn, SignInButton, SignUpButton, SignIn, SignUp } from '@clerk/clerk-react';

const isClerkAvailable = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const SafeSignedIn = ({ children }: { children: React.ReactNode }) => {
  if (isClerkAvailable) {
    return <SignedIn>{children}</SignedIn>;
  }
  return <>{children}</>;
};

export const SafeSignedOut = ({ children }: { children: React.ReactNode }) => {
  if (isClerkAvailable) {
    return <SignedOut>{children}</SignedOut>;
  }
  return null;
};

export const SafeUserButton = () => {
  if (isClerkAvailable) {
    return <UserButton afterSignOutUrl="/" />;
  }
  return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">A</div>;
};

export const SafeRedirectToSignIn = () => {
  if (isClerkAvailable) {
    return <RedirectToSignIn />;
  }
  return <div>Please sign in</div>;
};

export const SafeSignInButton = ({ children, mode }: { children: React.ReactNode, mode?: "modal" | "redirect" }) => {
  if (isClerkAvailable) {
    return <SignInButton mode={mode}>{children}</SignInButton>;
  }
  return <div onClick={() => alert("Sign in mock")}>{children}</div>;
};

export const SafeSignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: "modal" | "redirect" }) => {
  if (isClerkAvailable) {
    return <SignUpButton mode={mode}>{children}</SignUpButton>;
  }
  return <div onClick={() => alert("Sign up mock")}>{children}</div>;
};

export const SafeSignIn = () => {
  if (isClerkAvailable) {
    return <div className="flex justify-center p-8"><SignIn routing="path" path="/sign-in" /></div>;
  }
  return <div>Sign In Page (Mock)</div>;
};

export const SafeSignUp = () => {
  if (isClerkAvailable) {
    return <div className="flex justify-center p-8"><SignUp routing="path" path="/sign-up" /></div>;
  }
  return <div>Sign Up Page (Mock)</div>;
};
