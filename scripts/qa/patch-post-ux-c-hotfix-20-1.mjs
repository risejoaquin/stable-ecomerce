import fs from 'node:fs';

const path = 'src/pages/store/ProductDetailPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const gateNeedle = '{secondaryContentReady && (';
if (source.includes(gateNeedle)) {
  console.log('SKIP HOTFIX 20.1 below-fold gate already applied');
  process.exit(0);
}

const similarStart = source.indexOf('{similarProducts.length > 0 && (');
const mobileNavStart = source.indexOf('<MobileEditorialNav ');

if (similarStart < 0) {
  throw new Error('HOTFIX 20.1 similarProducts block start not found');
}
if (mobileNavStart < 0) {
  throw new Error('HOTFIX 20.1 MobileEditorialNav anchor not found');
}
if (mobileNavStart <= similarStart) {
  throw new Error('HOTFIX 20.1 invalid source ordering');
}

const before = source.slice(0, similarStart);
const middle = source.slice(similarStart, mobileNavStart);
const after = source.slice(mobileNavStart);

if (!middle.includes('<LazyReviewList')) {
  throw new Error('HOTFIX 20.1 review list not found in below-fold region');
}
if (!middle.includes('<EditorialFooter')) {
  throw new Error('HOTFIX 20.1 EditorialFooter not found in below-fold region');
}

// Preserve the full existing below-fold markup exactly as-is; only wrap it.
const indent = '        ';
const wrapped =
`${indent}{secondaryContentReady && (
${indent}  <>
${middle.replace(/^/gm, '    ')}
${indent}  </>
${indent})}

${indent}`;

source = before + wrapped + after;

fs.writeFileSync(path, source, 'utf8');

console.log('PATCH HOTFIX 20.1 wrapped existing below-fold PDP DOM behind secondaryContentReady');
console.log('PASS POST-UX C HOTFIX 20.1 patch applied');
