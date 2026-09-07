import fs from 'node:fs';

const path = 'scripts/qa/smoke-post-ux-c-hotfix-13-1.ps1';
let text = fs.readFileSync(path, 'utf8');

const legacy = "  'onload=\"this.media=''all''\"',\n";
if (text.includes(legacy)) {
  text = text.replace(legacy, '');
  fs.writeFileSync(path, text, 'utf8');
  console.log('PATCH remove obsolete inline-onload requirement from HOTFIX 13.1 smoke');
} else if (text.includes('onload="this.media=')) {
  throw new Error('HOTFIX 13.1 smoke still contains an inline-onload requirement with unexpected formatting');
} else {
  console.log('SKIP obsolete inline-onload requirement already removed');
}

text = fs.readFileSync(path, 'utf8');
if (text.includes('onload="this.media=')) {
  throw new Error('Obsolete CSP-unsafe inline-onload requirement remains in HOTFIX 13.1 smoke');
}
if (!text.includes("'media=\"print\"'")) {
  throw new Error('HOTFIX 13.1 smoke no longer protects non-blocking media=print behavior');
}
if (!text.includes("'<noscript><link rel=\"stylesheet\"'")) {
  throw new Error('HOTFIX 13.1 smoke no longer protects noscript font fallback');
}

console.log('PASS POST-UX C HOTFIX 13.2.1 QA contract repair applied');
