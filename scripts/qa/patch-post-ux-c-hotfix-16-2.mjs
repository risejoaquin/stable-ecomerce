import fs from 'node:fs';

const smoke15 = 'scripts/qa/smoke-post-ux-c-hotfix-15.ps1';
const smoke151 = 'scripts/qa/smoke-post-ux-c-hotfix-15-1.ps1';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let s15 = read(smoke15);
let s151 = read(smoke151);

if (!s15.includes("POST-UX C HOTFIX 16.2: HOTFIX 15 successor-aware QA contract")) {
  s15 = s15.replace(
`foreach ($needle in @(
  'POST-UX C HOTFIX 15: server-assisted PDP LCP image preload',
  ".select('images')",
  'data-selfcare-server-pdp-lcp-preload',`,
`# POST-UX C HOTFIX 16.2: HOTFIX 15 successor-aware QA contract
if ($server.Contains(".select('images')") -or $server.Contains(".select('*')")) {
  Pass "server-assisted PDP preload product lookup retained via images-only or full-product successor"
} else {
  Fail "server-assisted PDP preload product lookup retained via images-only or full-product successor"
}

foreach ($needle in @(
  'POST-UX C HOTFIX 15: server-assisted PDP LCP image preload',
  'data-selfcare-server-pdp-lcp-preload',`
  );
  write(smoke15, s15);
  console.log('PATCH HOTFIX 15 smoke accepts HOTFIX 16 full-product successor');
} else {
  console.log('SKIP HOTFIX 15 smoke already successor-aware');
}

if (!s151.includes("POST-UX C HOTFIX 16.2: HOTFIX 15.1 successor-aware QA contract")) {
  const old = `foreach ($needle in @(
  'POST-UX C HOTFIX 15.1: cache PDP LCP image lookup',
  'pdpLcpImageCache',
  'PDP_LCP_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpLcpImageUrl',
  'data-selfcare-server-pdp-lcp-preload'
)) {
  if ($server.Contains($needle)) { Pass $needle } else { Fail $needle }
}`;

  const replacement = `# POST-UX C HOTFIX 16.2: HOTFIX 15.1 successor-aware QA contract
$legacyCache = @(
  'POST-UX C HOTFIX 15.1: cache PDP LCP image lookup',
  'pdpLcpImageCache',
  'PDP_LCP_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpLcpImageUrl'
)

$successorCache = @(
  'POST-UX C HOTFIX 16: server bootstrap full PDP product',
  'pdpProductCache',
  'PDP_PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000',
  'getCachedPdpProduct'
)

$legacyPass = ($legacyCache | Where-Object { -not $server.Contains($_) }).Count -eq 0
$successorPass = ($successorCache | Where-Object { -not $server.Contains($_) }).Count -eq 0

if ($legacyPass -or $successorPass) {
  Pass 'HOTFIX 15.1 cache intent retained via legacy image cache or HOTFIX 16 product cache successor'
} else {
  Fail 'HOTFIX 15.1 cache intent retained via legacy image cache or HOTFIX 16 product cache successor'
}

if ($server.Contains('data-selfcare-server-pdp-lcp-preload')) {
  Pass 'data-selfcare-server-pdp-lcp-preload'
} else {
  Fail 'data-selfcare-server-pdp-lcp-preload'
}`;

  if (!s151.includes(old)) {
    throw new Error('HOTFIX 16.2 HOTFIX 15.1 smoke anchor not found');
  }
  s151 = s151.replace(old, replacement);
  write(smoke151, s151);
  console.log('PATCH HOTFIX 15.1 smoke accepts HOTFIX 16 product-cache successor');
} else {
  console.log('SKIP HOTFIX 15.1 smoke already successor-aware');
}

console.log('PASS POST-UX C HOTFIX 16.2 QA contract repair applied');
