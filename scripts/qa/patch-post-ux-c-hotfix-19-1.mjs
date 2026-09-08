import fs from 'node:fs';

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`HOTFIX 19.1 required file missing: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function write(path, source) {
  fs.writeFileSync(path, source, 'utf8');
}

function replaceRegex(source, regex, replacement, label, alreadyAppliedNeedle) {
  if (alreadyAppliedNeedle && source.includes(alreadyAppliedNeedle)) {
    console.log(`SKIP ${label} already applied`);
    return source;
  }
  if (!regex.test(source)) {
    throw new Error(`HOTFIX 19.1 expected source not found for ${label}`);
  }
  console.log(`PATCH ${label}`);
  return source.replace(regex, replacement);
}

const appPath = 'src/App.tsx';
let app = read(appPath);

// Repair the HOTFIX 19 patcher bug: replacing with "" can never be detected
// by source.includes(to), because every string contains the empty string.
if (/import\s*\{\s*useValidateCoupon\s*\}\s*from\s*['"]\.\/hooks\/useCoupon['"];\s*\r?\n?/.test(app)) {
  console.log('PATCH remove unused eager useValidateCoupon import');
  app = app.replace(
    /import\s*\{\s*useValidateCoupon\s*\}\s*from\s*['"]\.\/hooks\/useCoupon['"];\s*\r?\n?/,
    ''
  );
} else {
  console.log('SKIP unused eager useValidateCoupon import already absent');
}

// Ensure App remains on deferred toast even if HOTFIX 19 partially applied.
app = replaceRegex(
  app,
  /import\s*\{\s*Toaster\s*,\s*toast\s*\}\s*from\s*['"]react-hot-toast['"];\s*\r?\n?/,
  "import { deferredToast as toast } from './lib/deferred-toast';\n",
  'replace eager react-hot-toast import in App',
  "import { deferredToast as toast } from './lib/deferred-toast';"
);

if (!app.includes('const LazyToaster = React.lazy(() =>')) {
  const marker = /function RouteLoadingFallback\(\)\s*\{[\s\S]*?\n\}\r?\n\r?\nexport default function App\(\)\s*\{/;
  const match = app.match(marker);
  if (!match) throw new Error('HOTFIX 19.1 RouteLoadingFallback/App marker not found');

  const original = match[0];
  const fallbackOnly = original.replace(/\r?\n\r?\nexport default function App\(\)\s*\{$/, '');
  const replacement = `${fallbackOnly}

const LazyToaster = React.lazy(() =>
  import('react-hot-toast').then((module) => ({ default: module.Toaster }))
);

function DeferredToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const browser = window as any;
    const activate = () => setReady(true);

    if (typeof browser.requestIdleCallback === 'function') {
      const idleId = browser.requestIdleCallback(activate, { timeout: 2000 });
      return () => browser.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(activate, 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <LazyToaster position="bottom-right" />
    </Suspense>
  );
}

export default function App() {`;

  app = app.replace(original, replacement);
  console.log('PATCH add deferred Toaster mount');
} else {
  console.log('SKIP deferred Toaster mount already applied');
}

if (/<Toaster\s+position=["']bottom-right["']\s*\/>/.test(app)) {
  app = app.replace(/<Toaster\s+position=["']bottom-right["']\s*\/>/, '<DeferredToaster />');
  console.log('PATCH replace eager Toaster render');
} else if (app.includes('<DeferredToaster />')) {
  console.log('SKIP eager Toaster render already replaced');
} else {
  throw new Error('HOTFIX 19.1 neither eager nor deferred Toaster render found');
}

write(appPath, app);

const targets = [
  {
    path: 'src/hooks/useCheckout.ts',
    deferred: "import { deferredToast as toast } from '../lib/deferred-toast';",
    replacement: "import { deferredToast as toast } from '../lib/deferred-toast';\n",
  },
  {
    path: 'src/pages/store/ProductDetailPage.tsx',
    deferred: "import { deferredToast as toast } from '../../lib/deferred-toast';",
    replacement: "import { deferredToast as toast } from '../../lib/deferred-toast';\n",
  },
];

for (const target of targets) {
  let source = read(target.path);

  if (source.includes(target.deferred)) {
    console.log(`SKIP deferred toast import already applied in ${target.path}`);
    continue;
  }

  // Tolerate both:
  //   import { toast } from 'react-hot-toast';
  //   import toast from 'react-hot-toast';
  const named = /import\s*\{\s*toast\s*\}\s*from\s*['"]react-hot-toast['"];\s*\r?\n?/;
  const defaultImport = /import\s+toast\s+from\s*['"]react-hot-toast['"];\s*\r?\n?/;

  if (named.test(source)) {
    source = source.replace(named, target.replacement);
    console.log(`PATCH named eager toast import in ${target.path}`);
  } else if (defaultImport.test(source)) {
    source = source.replace(defaultImport, target.replacement);
    console.log(`PATCH default eager toast import in ${target.path}`);
  } else {
    throw new Error(`HOTFIX 19.1 no supported react-hot-toast import found in ${target.path}`);
  }

  write(target.path, source);
}

const bridgePath = 'src/lib/deferred-toast.ts';
if (!fs.existsSync(bridgePath)) {
  throw new Error('HOTFIX 19.1 deferred-toast bridge missing; extract HOTFIX 19 files first');
}

const finalApp = read(appPath);
const finalCheckout = read('src/hooks/useCheckout.ts');
const finalPdp = read('src/pages/store/ProductDetailPage.tsx');

if (/from\s*['"]react-hot-toast['"]/.test(finalCheckout)) {
  throw new Error('HOTFIX 19.1 checkout still has eager react-hot-toast import');
}
if (/from\s*['"]react-hot-toast['"]/.test(finalPdp)) {
  throw new Error('HOTFIX 19.1 PDP still has eager react-hot-toast import');
}
if (/import\s*\{\s*useValidateCoupon\s*\}/.test(finalApp)) {
  throw new Error('HOTFIX 19.1 App still has unused useValidateCoupon import');
}
if (!finalApp.includes('<DeferredToaster />')) {
  throw new Error('HOTFIX 19.1 DeferredToaster render missing');
}

console.log('PASS POST-UX C HOTFIX 19.1 partial-application repair complete');
