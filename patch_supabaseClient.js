import fs from 'fs';
let code = fs.readFileSync('src/lib/supabaseClient.ts', 'utf-8');

code = code.replace(
  "const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';",
  "const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';"
);
code = code.replace(
  "const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';",
  "const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key';"
);

fs.writeFileSync('src/lib/supabaseClient.ts', code);
