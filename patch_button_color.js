import fs from 'fs';

// Patch ProductDetailPage.tsx
let pdCode = fs.readFileSync('src/pages/store/ProductDetailPage.tsx', 'utf-8');
pdCode = pdCode.replace(
  `const textColor = config.textColor || '#333333';`,
  `const textColor = config.textColor || '#333333';\n  const buttonColor = config.buttonColor || themeColor;`
);
pdCode = pdCode.replace(
  `style={{ backgroundColor: themeColor }}`,
  `style={{ backgroundColor: buttonColor }}`
);
pdCode = pdCode.replace(
  `style={{ backgroundColor: themeColor }}`,
  `style={{ backgroundColor: buttonColor }}` // Replace multiple instances if there are (like Add to Cart and Submit Review)
);
pdCode = pdCode.replace(
  `themeColor={themeColor}`,
  `themeColor={buttonColor}` // ReviewList / ReviewForm might use themeColor for their buttons, which is fine, but passing buttonColor could be better.
);
pdCode = pdCode.replace(
  `themeColor={themeColor}`,
  `themeColor={buttonColor}`
);
fs.writeFileSync('src/pages/store/ProductDetailPage.tsx', pdCode);

// Patch CartDrawer to use buttonColor
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
// Find CartDrawer component definition
if (appCode.includes('function CartDrawer({ storeId, themeColor }: { storeId?: string, themeColor: string }) {')) {
    appCode = appCode.replace(
      `function CartDrawer({ storeId, themeColor }: { storeId?: string, themeColor: string }) {`,
      `function CartDrawer({ storeId, themeColor, buttonColor }: { storeId?: string, themeColor: string, buttonColor?: string }) {`
    );
    appCode = appCode.replace(
      `style={{ backgroundColor: themeColor }}`,
      `style={{ backgroundColor: buttonColor || themeColor }}`
    );
    appCode = appCode.replace(
      `CartDrawer storeId={currentStore?.id} themeColor={themeColor}`,
      `CartDrawer storeId={currentStore?.id} themeColor={themeColor} buttonColor={config.buttonColor || themeColor}`
    );
    fs.writeFileSync('src/App.tsx', appCode);
}
