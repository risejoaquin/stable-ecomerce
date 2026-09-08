$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

function Pass([string]$m) { Write-Host "PASS $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

$app = Get-Content '.\src\App.tsx' -Raw
$checkout = Get-Content '.\src\hooks\useCheckout.ts' -Raw
$pdp = Get-Content '.\src\pages\store\ProductDetailPage.tsx' -Raw
$bridge = Get-Content '.\src\lib\deferred-toast.ts' -Raw

foreach ($needle in @(
  "import { deferredToast as toast } from './lib/deferred-toast';",
  'const LazyToaster = React.lazy(() =>',
  "import('react-hot-toast')",
  'function DeferredToaster()',
  'requestIdleCallback',
  '<DeferredToaster />'
)) {
  if ($app.Contains($needle)) { Pass "App deferred toast contract: $needle" } else { Fail "App deferred toast contract: $needle" }
}

if (-not $app.Contains("import { Toaster, toast } from 'react-hot-toast';")) {
  Pass 'App eager react-hot-toast import removed'
} else {
  Fail 'App eager react-hot-toast import removed'
}

if (-not $app.Contains("import { useValidateCoupon } from './hooks/useCoupon';")) {
  Pass 'unused eager useValidateCoupon import removed'
} else {
  Fail 'unused eager useValidateCoupon import removed'
}

foreach ($pair in @(
  @{ Name = 'checkout'; Source = $checkout; Needle = "import { deferredToast as toast } from '../lib/deferred-toast';" },
  @{ Name = 'PDP'; Source = $pdp; Needle = "import { deferredToast as toast } from '../../lib/deferred-toast';" }
)) {
  if ($pair.Source.Contains($pair.Needle)) { Pass "$($pair.Name) uses deferred toast bridge" } else { Fail "$($pair.Name) uses deferred toast bridge" }
  if (-not $pair.Source.Contains("from 'react-hot-toast'")) { Pass "$($pair.Name) eager react-hot-toast import removed" } else { Fail "$($pair.Name) eager react-hot-toast import removed" }
}

foreach ($needle in @(
  "import('react-hot-toast')",
  'toast.success',
  'toast.error',
  'toast.promise',
  'return promise;'
)) {
  if ($bridge.Contains($needle)) { Pass "deferred toast bridge contract: $needle" } else { Fail "deferred toast bridge contract: $needle" }
}

Pass 'POST-UX C HOTFIX 19 source checks'
