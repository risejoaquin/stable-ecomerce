import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /import \{[^}]*\}\s+from\s+['"]@clerk\/clerk-react['"];/,
  `import { ClerkProvider } from '@clerk/clerk-react';\nimport { SafeSignedIn as SignedIn, SafeSignedOut as SignedOut, SafeRedirectToSignIn as RedirectToSignIn, SafeUserButton as UserButton } from './components/ClerkMock';\nimport { useUserSafe as useUser } from './hooks/useUserSafe';`
);

fs.writeFileSync('src/App.tsx', code);
