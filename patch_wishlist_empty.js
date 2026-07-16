import fs from 'fs';

let code = fs.readFileSync('src/pages/store/WishlistPage.tsx', 'utf-8');

if (!code.includes('<EmptyState')) {
  code = `import { EmptyState } from '../../components/EmptyState';\n` + code;
  code = code.replace(
    `<div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">\n            <h2 className="text-xl font-medium mb-2">Your wishlist is empty</h2>\n            <p className="text-gray-500 mb-6">Save items you like and they will appear here.</p>\n            <Link to="/" className="inline-block px-6 py-3 text-white rounded-lg font-bold" style={{ backgroundColor: themeColor }}>\n              Explore Products\n            </Link>\n          </div>`,
    `<EmptyState title="Your wishlist is empty" description="Save items you like and they will appear here." actionText="Explore Products" actionLink="/" />`
  );
  fs.writeFileSync('src/pages/store/WishlistPage.tsx', code);
}
