import fs from 'fs';

function replaceInFile(filePath, depth) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf-8');
  let relPath = '../hooks/useAuthSafe';
  if (depth === 2) relPath = '../../hooks/useAuthSafe';
  if (depth === 3) relPath = '../../../hooks/useAuthSafe';
  
  if (code.includes("@clerk/clerk-react")) {
    // If it's the only import from clerk:
    code = code.replace(
      `import { useAuth } from '@clerk/clerk-react';`,
      `import { useAuthSafe as useAuth } from '${relPath}';`
    );
    // If it's mixed:
    code = code.replace(
      /import\s+\{\s*([^}]*?)\s*useAuth([^}]*?)\}\s+from\s+['"]@clerk\/clerk-react['"]/g,
      (match, p1, p2) => {
        let others = [p1.trim(), p2.trim()].filter(Boolean).join(', ').replace(/,\s*,/g, ',');
        if (others.endsWith(',')) others = others.slice(0, -1).trim();
        if (others.startsWith(',')) others = others.slice(1).trim();
        
        let res = `import { useAuthSafe as useAuth } from '${relPath}';\n`;
        if (others) {
          res += `import { ${others} } from '@clerk/clerk-react';`;
        }
        return res;
      }
    );
  } else if (code.includes('useAuth')) {
      code = code.replace(
          `import { useAuth } from "@clerk/clerk-react";`,
          `import { useAuthSafe as useAuth } from '${relPath}';`
      )
  }
  
  fs.writeFileSync(filePath, code);
}

replaceInFile('src/api/useApiClient.ts', 1);
replaceInFile('src/pages/store/ProductDetailPage.tsx', 2);
replaceInFile('src/pages/admin/AdminSettingsPage.tsx', 2);
replaceInFile('src/components/admin/ProductFormModal.tsx', 2);

