import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/<SignedIn>/g, '<SafeSignedIn>');
code = code.replace(/<\/SignedIn>/g, '</SafeSignedIn>');
code = code.replace(/<SignedOut>/g, '<SafeSignedOut>');
code = code.replace(/<\/SignedOut>/g, '</SafeSignedOut>');
code = code.replace(/<RedirectToSignIn \/>/g, '<SafeRedirectToSignIn />');
fs.writeFileSync('src/App.tsx', code);
