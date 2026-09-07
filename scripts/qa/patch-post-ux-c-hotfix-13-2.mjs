import fs from 'node:fs';

const htmlPath = 'index.html';
const loaderPath = 'public/brand-fonts-loader.js';
const fontUrl = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800;900&display=swap';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let html = read(htmlPath);

// Repair the HOTFIX 13.1 CSP-incompatible inline event handler without relaxing CSP.
const oldLink = `<link rel="stylesheet" href="${fontUrl}" media="print" onload="this.media='all'">`;
const newLink = `<link id="selfcare-brand-fonts" rel="stylesheet" href="${fontUrl}" media="print">`;

if (html.includes(oldLink)) {
  html = html.replace(oldLink, newLink);
  console.log('PATCH replace CSP-blocked inline font onload handler');
} else if (html.includes('onload="this.media=\'all\'"')) {
  throw new Error('Inline brand font onload handler exists but exact HOTFIX 13.1 anchor did not match');
} else if (html.includes('id="selfcare-brand-fonts"') && !html.includes('onload=')) {
  console.log('SKIP CSP-safe brand font link already present');
} else {
  throw new Error('Expected HOTFIX 13.1 brand font stylesheet link was not found in index.html');
}

const scriptTag = '    <script src="/brand-fonts-loader.js" defer></script>\n';
if (!html.includes('/brand-fonts-loader.js')) {
  const noscript = `    <noscript><link rel="stylesheet" href="${fontUrl}"></noscript>\n`;
  if (!html.includes(noscript)) {
    throw new Error('HOTFIX 13.1 noscript font fallback anchor missing');
  }
  html = html.replace(noscript, `${noscript}${scriptTag}`);
  console.log('PATCH add same-origin deferred brand font activation script');
} else {
  console.log('SKIP same-origin brand font activation script already present');
}

write(htmlPath, html);

html = read(htmlPath);
const loader = read(loaderPath);

if (/onload\s*=/.test(html)) {
  throw new Error('Inline onload attribute remains after HOTFIX 13.2');
}
for (const needle of [
  'id="selfcare-brand-fonts"',
  'media="print"',
  '/brand-fonts-loader.js',
  '<noscript><link rel="stylesheet"',
]) {
  if (!html.includes(needle)) throw new Error(`HOTFIX 13.2 HTML contract missing: ${needle}`);
}
for (const needle of [
  "document.getElementById('selfcare-brand-fonts')",
  "link.addEventListener('load', activate, { once: true })",
  "link.media = 'all'",
  'if (link.sheet)',
]) {
  if (!loader.includes(needle)) throw new Error(`HOTFIX 13.2 loader contract missing: ${needle}`);
}

console.log('PASS POST-UX C HOTFIX 13.2 CSP-safe font activation patch applied');
