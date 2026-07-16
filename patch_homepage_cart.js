import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

code = code.replace(
  `<CartDrawer storeId={currentStore?.id} themeColor={themeColor} />`,
  `<CartDrawer storeId={currentStore?.id} themeColor={themeColor} buttonColor={config.buttonColor || themeColor} />`
);

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
