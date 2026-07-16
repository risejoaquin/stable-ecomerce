import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  `export function CartDrawer({ storeId, themeColor, buttonColor }: { storeId?: string, themeColor: string, buttonColor?: string }) {\n  const { items, removeItem, updateQuantity, total, isCartOpen, setIsCartOpen } = useCart();`,
  `export function CartDrawer({ storeId, themeColor, buttonColor }: { storeId?: string, themeColor: string, buttonColor?: string }) {\n  const { items, removeItem, updateQuantity, total, isCartOpen, setIsCartOpen } = useCart();\n  const { isSignedIn } = useAuth();`
);

fs.writeFileSync('src/App.tsx', code);
