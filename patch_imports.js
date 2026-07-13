import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  "import { SafeSignedIn as SignedIn, SafeSignedOut as SignedOut, SafeRedirectToSignIn as RedirectToSignIn, SafeUserButton as UserButton } from './components/ClerkMock';",
  "import { SafeSignedIn, SafeSignedOut, SafeRedirectToSignIn, SafeUserButton as UserButton } from './components/ClerkMock';"
);
fs.writeFileSync('src/App.tsx', code);
