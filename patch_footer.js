import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

const newFooter = `
      {/* Footer */}
      <footer className="mt-auto py-10 border-t text-sm" style={{ borderColor: secondaryColor + '30', color: secondaryColor }}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>{config.footerText || \`© \${new Date().getFullYear()} \${currentStore.name}\`}</div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/contact" className="hover:underline">Contact</Link>
            <Link to="/returns" className="hover:underline">Return Policy</Link>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:underline">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
`;

code = code.replace(
  /\{\/\* Footer \*\/\}\s*<footer className="mt-auto py-10 text-center border-t text-sm" style=\{\{ borderColor: secondaryColor \+ '30', color: secondaryColor \}\}>\s*\{config\.footerText \|\| `© \$\{new Date\(\)\.getFullYear\(\)\} \$\{currentStore\.name\}`\}\s*<\/footer>/,
  newFooter
);

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
