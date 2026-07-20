import fs from 'fs';

let content = fs.readFileSync('src/components/storefront/StoreHeader.tsx', 'utf8');

const oldCheck = `        <Link to="/" className="flex items-center">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt={currentStore.name} className="h-10 object-contain" loading="lazy" />
          ) : (
            <span className="text-2xl font-bold tracking-tight" style={{ color: themeColor }}>{currentStore.name}</span>
          )}
        </Link>`;

const newCheck = `        <Link to="/" className="flex items-center">
          <img src={config.logoUrl || "/logo.png"} alt={currentStore.name} className="h-10 object-contain" loading="lazy" />
        </Link>`;

content = content.replace(oldCheck, newCheck);

fs.writeFileSync('src/components/storefront/StoreHeader.tsx', content);

// Also index.html
let indexContent = fs.readFileSync('index.html', 'utf8');
const indexOld = `<title>Selfcare Sinners</title>`;
const indexNew = `<link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <title>Selfcare Sinners</title>`;
indexContent = indexContent.replace(indexOld, indexNew);
fs.writeFileSync('index.html', indexContent);

console.log('Fixed logo and favicon');
