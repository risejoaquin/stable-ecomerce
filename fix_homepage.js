import fs from 'fs';
let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

code = code.replace("import { useCart } from '../../App';", "import { useCart, CartDrawer } from '../../App';");
code = code.replace("</div>\n    </div>\n  );\n}", "  <CartDrawer storeId={currentStore?.id} themeColor={themeColor} />\n    </div>\n  );\n}");

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
