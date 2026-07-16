import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

code = code.replace(
  "<SEO title={currentStore.name} description={currentStore.description} />\n    <div className=\"min-h-screen flex flex-col\"",
  "<>\n      <SEO title={currentStore.name} description={currentStore.description} />\n      <div className=\"min-h-screen flex flex-col\""
);

code = code.replace(
  "<CartDrawer storeId={currentStore?.id} themeColor={themeColor} />\n    </div>\n  );\n}",
  "<CartDrawer storeId={currentStore?.id} themeColor={themeColor} />\n    </div>\n    </>\n  );\n}"
);

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
