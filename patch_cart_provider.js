import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

const syncLogic = `
  const { getToken, isSignedIn } = useAuth();
  
  // Sync to abandoned cart
  useEffect(() => {
    const syncCart = async () => {
      if (!isSignedIn) return; // Only sync if logged in (guests sync at checkout)
      try {
        const token = await getToken();
        await fetch(import.meta.env.VITE_API_URL + '/api/cart/sync' || '/api/cart/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
          },
          body: JSON.stringify({ items })
        });
      } catch (e) {
        console.error('Failed to sync cart', e);
      }
    };
    
    // debounce to avoid too many requests
    const timeout = setTimeout(syncCart, 1000);
    return () => clearTimeout(timeout);
  }, [items, isSignedIn, getToken]);
`;

if (!code.includes('/api/cart/sync')) {
  // Insert inside CartProvider
  code = code.replace(
    /const removeItem = \(id: string\) => \{\s*setItems\(items\.filter\(i => i\.id !== id\)\);\s*\};/,
    `const removeItem = (id: string) => {\n    setItems(items.filter(i => i.id !== id));\n  };\n\n${syncLogic}`
  );
  fs.writeFileSync('src/App.tsx', code);
}
