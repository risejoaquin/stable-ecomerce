import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

const cssPath = 'src/styles/uix-soft-premium-system.css';
const htmlPath = 'index.html';
const fontUrl = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800;900&display=swap';
const asyncMarker = 'POST-UX C HOTFIX 13: non-blocking brand fonts';

// HOTFIX 13 may already have removed the CSS import before its HTML anchor failed.
let css = read(cssPath);
const googleFontImportRe = /^\s*@import\s+url\((['"]?)https:\/\/fonts\.googleapis\.com\/css2\?family=Archivo\+Black[^\r\n]*\1\);?\s*\r?\n?/im;
if (googleFontImportRe.test(css)) {
  css = css.replace(googleFontImportRe, '');
  write(cssPath, css);
  console.log('PATCH remove blocking Archivo Black/Inter @import');
} else {
  console.log('SKIP blocking Archivo Black/Inter @import already removed');
}

let html = read(htmlPath);
const asyncBlock =
  `    <!-- ${asyncMarker} -->\n` +
  `    <link rel="preload" as="style" href="${fontUrl}">\n` +
  `    <link rel="stylesheet" href="${fontUrl}" media="print" onload="this.media='all'">\n` +
  `    <noscript><link rel="stylesheet" href="${fontUrl}"></noscript>\n`;

if (html.includes(asyncMarker)) {
  console.log('SKIP non-blocking Archivo Black/Inter loader already present');
} else {
  // Prefer insertion after the existing fonts.gstatic.com preconnect, regardless of
  // whitespace, CRLF/LF, or whether the tag is self-closing.
  const preconnectRe = /(^[ \t]*<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.gstatic\.com["'][^>]*>\s*\r?\n)/im;
  const preconnectMatch = html.match(preconnectRe);

  if (preconnectMatch) {
    html = html.replace(preconnectRe, `$1${asyncBlock}`);
    console.log('PATCH add non-blocking Archivo Black/Inter loader after fonts.gstatic preconnect');
  } else {
    // Safe fallback for the current document contract: insert immediately before title.
    const titleRe = /(^[ \t]*<title>)/im;
    if (!titleRe.test(html)) {
      throw new Error('HOTFIX 13.1 could not find fonts.gstatic preconnect or <title> fallback anchor in index.html');
    }
    html = html.replace(titleRe, `${asyncBlock}$1`);
    console.log('PATCH add non-blocking Archivo Black/Inter loader before title fallback');
  }
  write(htmlPath, html);
}

css = read(cssPath);
html = read(htmlPath);

if (/^\s*@import\s+url\([^\r\n]*fonts\.googleapis\.com/im.test(css)) {
  throw new Error('Blocking Google Fonts @import remains in active UIX CSS after HOTFIX 13.1');
}
if (!html.includes(asyncMarker)) {
  throw new Error('Non-blocking brand font marker missing after HOTFIX 13.1');
}
for (const needle of [
  'rel="preload" as="style"',
  fontUrl,
  'media="print"',
  'onload="this.media=\'all\'"',
  '<noscript><link rel="stylesheet"'
]) {
  if (!html.includes(needle)) {
    throw new Error(`Non-blocking Google Fonts loader contract missing: ${needle}`);
  }
}
if (!css.includes('font-family: Inter') || !css.includes("font-family: 'Archivo Black'")) {
  throw new Error('Brand font-family declarations were unexpectedly removed');
}

console.log('PASS POST-UX C HOTFIX 13.1 patch applied');
