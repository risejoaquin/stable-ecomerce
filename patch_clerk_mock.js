import fs from 'fs';
let code = fs.readFileSync('src/components/ClerkMock.tsx', 'utf-8');

if (!code.includes('SafeSignInButton')) {
  code = code.replace(
    "import { SignedIn, SignedOut, UserButton, RedirectToSignIn } from '@clerk/clerk-react';",
    "import { SignedIn, SignedOut, UserButton, RedirectToSignIn, SignInButton, SignUpButton, SignIn, SignUp } from '@clerk/clerk-react';"
  );
  
  code += `
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
`;
  fs.writeFileSync('src/components/ClerkMock.tsx', code);
}
