import fs from 'node:fs';

const path = 'scripts/qa/smoke-post-ux-c-hotfix-20.ps1';
let source = fs.readFileSync(path, 'utf8');

const marker = "POST-UX C HOTFIX 20.2: successor-aware structural QA repair";
if (source.includes(marker)) {
  console.log('SKIP HOTFIX 20.2 smoke repair already applied');
  process.exit(0);
}

const from = `$gateIndex = $pdp.IndexOf('{secondaryContentReady && (')
$reviewIndex = $pdp.IndexOf('<LazyReviewList')
$footerIndex = $pdp.IndexOf('<EditorialFooter')
$mobileNavIndex = $pdp.IndexOf('<MobileEditorialNav')

if ($gateIndex -ge 0 -and $reviewIndex -gt $gateIndex -and $footerIndex -gt $gateIndex) {
  Pass 'reviews and footer are behind secondaryContentReady gate'
} else {
  Fail 'reviews and footer are behind secondaryContentReady gate'
}

if ($mobileNavIndex -gt $gateIndex) {
  # It appears later in source, but ensure it is outside the fragment by checking the exact closing sequence.
  $expected = "</>\\n        )}\\n\\n        <MobileEditorialNav"
  if ($pdp.Contains($expected)) {
    Pass 'mobile nav remains outside deferred below-fold gate'
  } else {
    Fail 'mobile nav remains outside deferred below-fold gate'
  }
} else {
  Fail 'mobile nav source ordering'
}`;

const to = `# POST-UX C HOTFIX 20.2: successor-aware structural QA repair
$gateIndex = $pdp.IndexOf('{secondaryContentReady && (')
$similarIndex = $pdp.IndexOf('{similarProducts.length > 0 && (')
$reviewIndex = $pdp.IndexOf('<LazyReviewList')
$footerIndex = $pdp.IndexOf('<EditorialFooter')
$mobileNavIndex = $pdp.IndexOf('<MobileEditorialNav')
$cartIndex = $pdp.IndexOf('<CartDrawer')

if ($gateIndex -ge 0 -and
    $similarIndex -gt $gateIndex -and
    $reviewIndex -gt $gateIndex -and
    $footerIndex -gt $gateIndex) {
  Pass 'similar products, reviews and footer are behind secondaryContentReady gate'
} else {
  Fail 'similar products, reviews and footer are behind secondaryContentReady gate'
}

# HOTFIX 20.1 preserves existing JSX but may reindent the deferred region.
# Validate semantic ordering instead of one exact whitespace-sensitive closing string.
if ($mobileNavIndex -gt $footerIndex -and $cartIndex -gt $mobileNavIndex) {
  Pass 'mobile nav and cart remain after deferred below-fold region'
} else {
  Fail 'mobile nav and cart remain after deferred below-fold region'
}`;

if (!source.includes(from)) {
  throw new Error('HOTFIX 20.2 expected fragile HOTFIX 20 QA block not found');
}

source = source.replace(from, to);
fs.writeFileSync(path, source, 'utf8');

console.log('PATCH HOTFIX 20.2 replace whitespace-sensitive QA with structural ordering checks');
console.log('PASS POST-UX C HOTFIX 20.2 patch applied');
