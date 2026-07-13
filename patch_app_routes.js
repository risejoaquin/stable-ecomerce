import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace SafeSignIn / SafeSignUp with LoginPage / SignUpPage
code = code.replace(
  "import { SafeSignIn, SafeSignUp } from './components/ClerkMock';",
  "import { LoginPage } from './pages/LoginPage';\nimport { SignUpPage } from './pages/SignUpPage';"
);

code = code.replace(
  '<Route path="/sign-in/*" element={<SafeSignIn />} />',
  '<Route path="/sign-in" element={<LoginPage />} />'
);
code = code.replace(
  '<Route path="/sign-up/*" element={<SafeSignUp />} />',
  '<Route path="/sign-up" element={<SignUpPage />} />'
);

// We need to wrap App in AuthProvider
if (!code.includes('AuthProvider')) {
  code = "import { AuthProvider } from './contexts/AuthContext';\n" + code;
  code = code.replace(
    '<HelmetProvider>',
    '<HelmetProvider>\n      <AuthProvider>'
  );
  code = code.replace(
    '</HelmetProvider>',
    '</AuthProvider>\n    </HelmetProvider>'
  );
}

// Remove ClerkProvider
code = code.replace(/<ClerkProvider[^>]*>/, "");
code = code.replace(/<\/ClerkProvider>/, "");
code = code.replace("import { ClerkProvider } from '@clerk/clerk-react';", "");
code = code.replace("const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;", "");
code = code.replace("if (!clerkPubKey) {\n  console.warn(\"Missing Clerk Publishable Key - using mocked auth\");\n}", "");
code = code.replace("{clerkPubKey ? (", "{true ? (");

fs.writeFileSync('src/App.tsx', code);
