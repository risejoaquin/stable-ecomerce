const fs = require('fs');

let file = fs.readFileSync('src/components/AuthMock.tsx', 'utf-8');

file = file.replace(
  'export const SignInButton = ({ children }: { children: React.ReactNode }) => {',
  'export const SignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {'
);

file = file.replace(
  'export const SignUpButton = ({ children }: { children: React.ReactNode }) => {',
  'export const SignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {'
);

fs.writeFileSync('src/components/AuthMock.tsx', file);
