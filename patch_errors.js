import fs from 'fs';

// Fix server.ts
let serverCode = fs.readFileSync('server.ts', 'utf-8');
serverCode = serverCode.replace(
  'const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);',
  'const decoded: any = jwt.verify(token, SUPABASE_JWT_SECRET);'
);
serverCode = serverCode.replace(
  'const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);',
  'const decoded: any = jwt.verify(token, SUPABASE_JWT_SECRET);'
);
fs.writeFileSync('server.ts', serverCode);

// Fix ClerkMock.tsx
let mockCode = fs.readFileSync('src/components/ClerkMock.tsx', 'utf-8');
mockCode = mockCode.replace(
  'export const SafeSignInButton = ({ children }: { children: React.ReactNode }) => {',
  'export const SafeSignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {'
);
mockCode = mockCode.replace(
  'export const SafeSignUpButton = ({ children }: { children: React.ReactNode }) => {',
  'export const SafeSignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {'
);
fs.writeFileSync('src/components/ClerkMock.tsx', mockCode);

