import fs from 'fs';
let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

code = code.replace("        )}\n        <CartDrawer", "        )}\n      </div>\n      <CartDrawer");

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
