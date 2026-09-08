import fs from 'node:fs';

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) {
    console.log(`SKIP ${label} already applied`);
    return source;
  }
  if (!source.includes(from)) {
    throw new Error(`HOTFIX 19 expected source not found for ${label}`);
  }
  console.log(`PATCH ${label}`);
  return source.replace(from, to);
}

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

app = replaceOnce(
  app,
  "import { useValidateCoupon } from './hooks/useCoupon';\n",
  "",
  'remove unused eager useValidateCoupon import',
);

app = replaceOnce(
  app,
  "import { Toaster, toast } from 'react-hot-toast';\n",
  "import { deferredToast as toast } from './lib/deferred-toast';\n",
  'replace eager react-hot-toast import in App',
);

const fallbackMarker = `function RouteLoadingFallback() {
  return (
    <div className="uix-route-loading" role="status" aria-live="polite">
      <span className="uix-route-loading__mark">SS</span>
      <p>Cargando experiencia...</p>
    </div>
  );
}

export default function App() {`;

const deferredBlock = `function RouteLoadingFallback() {
  return (
    <div className="uix-route-loading" role="status" aria-live="polite">
      <span className="uix-route-loading__mark">SS</span>
      <p>Cargando experiencia...</p>
    </div>
  );
}

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

app = replaceOnce(
  app,
  fallbackMarker,
  deferredBlock,
  'add deferred Toaster mount',
);

app = replaceOnce(
  app,
  '          <Toaster position="bottom-right" />\n',
  '          <DeferredToaster />\n',
  'replace eager Toaster render',
);

fs.writeFileSync(appPath, app, 'utf8');

for (const file of [
  'src/hooks/useCheckout.ts',
  'src/pages/store/ProductDetailPage.tsx',
]) {
  let source = fs.readFileSync(file, 'utf8');
  source = replaceOnce(
    source,
    "import { toast } from 'react-hot-toast';\n",
    file.includes('hooks/')
      ? "import { deferredToast as toast } from '../lib/deferred-toast';\n"
      : "import { deferredToast as toast } from '../../lib/deferred-toast';\n",
    `replace eager toast import in ${file}`,
  );
  fs.writeFileSync(file, source, 'utf8');
}

console.log('PASS POST-UX C HOTFIX 19 deferred toast critical-path patch applied');
