import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  'function CheckoutSuccessPage() {\n  const { clearCart } = useCart();\n  \n\n  return (',
  'function CheckoutSuccessPage() {\n  const { clearCart } = useCart();\n\n  useEffect(() => {\n    clearCart();\n  }, [clearCart]);\n\n  return ('
);
fs.writeFileSync('src/App.tsx', code);
