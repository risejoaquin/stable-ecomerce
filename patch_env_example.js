import fs from 'fs';
let code = fs.readFileSync('.env.example', 'utf-8');

code = code.replace(
  "# --- AUTHENTICATION (Clerk) ---\n# For frontend components\npk_test_...\n# For backend validation\nsk_test_...",
  "# --- AUTHENTICATION (Supabase) ---\nVITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY="
);

fs.writeFileSync('.env.example', code);
