import React from 'react';
import { SignedIn, SignedOut, UserButton, RedirectToSignIn } from '@clerk/clerk-react';

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
