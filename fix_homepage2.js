import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

code = code.replace(
    "return (\n    <SEO title={currentStore.name} description={currentStore.description} />",
    "return (\n    <>\n      <SEO title={currentStore.name} description={currentStore.description} />"
);

code = code.replace(
    "      <CartDrawer storeId={currentStore?.id} themeColor={themeColor} />\n    </div>\n  );",
    "      <CartDrawer storeId={currentStore?.id} themeColor={themeColor} />\n    </div>\n    </>\n  );"
);

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
