import fs from 'fs';
let code = fs.readFileSync('.env.example', 'utf-8');

code = code.replace("VITE_CLERK_PUBLISHABLE_KEY=", "");
code = code.replace("CLERK_SECRET_KEY=", "");
if (!code.includes('SUPABASE_JWT_SECRET')) {
  code += "\nSUPABASE_JWT_SECRET=";
}
code = code.replace(/^\s*[\r\n]/gm, '');

fs.writeFileSync('.env.example', code);
