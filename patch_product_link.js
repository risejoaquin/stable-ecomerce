import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

if (!code.includes('import { Link } from')) {
  code = `import { Link } from 'react-router-dom';\n` + code;
}

code = code.replace(
  `<div className="aspect-square bg-gray-50 overflow-hidden relative">`,
  `<Link to={\`/product/\${product.id}\`} className="aspect-square bg-gray-50 overflow-hidden relative block">`
);
code = code.replace(
  `No Image</div>\n        )}\n      </div>`,
  `No Image</div>\n        )}\n      </Link>`
);

code = code.replace(
  `<h3 className="font-bold text-lg mb-1 line-clamp-1" style={{ color: textColor }}>{product.name}</h3>`,
  `<Link to={\`/product/\${product.id}\`}><h3 className="font-bold text-lg mb-1 line-clamp-1 hover:underline cursor-pointer" style={{ color: textColor }}>{product.name}</h3></Link>`
);

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
