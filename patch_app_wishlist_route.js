import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('WishlistPage')) {
  code = `import { WishlistPage } from './pages/store/WishlistPage';\n` + code;
  code = code.replace(
    `<Route path="/my-orders" element={<SignedIn><MyOrdersPage /></SignedIn>} />`,
    `<Route path="/my-orders" element={<SignedIn><MyOrdersPage /></SignedIn>} />\n          <Route path="/wishlist" element={<SignedIn><WishlistPage /></SignedIn>} />`
  );
  fs.writeFileSync('src/App.tsx', code);
}
