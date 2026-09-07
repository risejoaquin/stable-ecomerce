import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, value) {
  fs.writeFileSync(path, value, 'utf8');
}

function replaceOnce(path, source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count === 0) throw new Error(`Missing patch anchor for ${label} in ${path}`);
  if (count > 1) throw new Error(`Ambiguous patch anchor for ${label} in ${path}: ${count} matches`);
  const next = source.replace(from, to);
  write(path, next);
  console.log(`PATCH ${label}`);
  return next;
}

const indexPath = 'index.html';
let index = read(indexPath);

const bootstrapMarker = 'POST-UX C HOTFIX 11: early PDP product discovery';
if (!index.includes(bootstrapMarker)) {
  const moduleScript = '    <script type="module" src="/src/main.tsx"></script>';
  const earlyBootstrap = `    <script>
      // POST-UX C HOTFIX 11: early PDP product discovery
      (() => {
        const match = window.location.pathname.match(/^\\/product\\/([0-9a-f-]{36})(?:\\/|$)/i);
        if (!match) return;

        const id = match[1];
        const promise = fetch(\`/api/products/\${encodeURIComponent(id)}\`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'same-origin'
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(\`Early product fetch failed with HTTP \${response.status}\`);
          }
          return response.json();
        });

        // Keep the original rejecting promise for React Query while marking it handled
        // until the application attaches its consumer.
        promise.catch(() => {});

        window.__SELFCARE_EARLY_PRODUCT__ = {
          id,
          promise,
          startedAt: performance.now()
        };
      })();
    </script>
${moduleScript}`;
  index = replaceOnce(indexPath, index, moduleScript, earlyBootstrap, 'index early product bootstrap');
} else {
  console.log('SKIP index early product bootstrap already present');
}

const pdpPath = 'src/pages/store/ProductDetailPage.tsx';
let pdp = read(pdpPath);

const globalMarker = '__SELFCARE_EARLY_PRODUCT__';
if (!pdp.includes('type EarlyProductBootstrap')) {
  const marker = `const LazyReviewForm = lazy(() =>
  import('../../components/reviews/ReviewForm').then((module) => ({ default: module.ReviewForm }))
);
`;
  const replacement = `${marker}
type EarlyProductBootstrap = {
  id: string;
  promise: Promise<any>;
  startedAt: number;
};

declare global {
  interface Window {
    __SELFCARE_EARLY_PRODUCT__?: EarlyProductBootstrap;
  }
}
`;
  pdp = replaceOnce(pdpPath, pdp, marker, replacement, 'PDP early bootstrap window contract');
} else {
  console.log('SKIP PDP early bootstrap window contract already present');
}

if (!pdp.includes('const consumeEarlyProduct = async')) {
  const marker = `  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.get(\`/products/\${id}\`),
    enabled: !!id
  });
`;
  const replacement = `  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);

  const consumeEarlyProduct = async () => {
    const early = window.__SELFCARE_EARLY_PRODUCT__;
    if (early?.id === id) {
      try {
        return await early.promise;
      } finally {
        if (window.__SELFCARE_EARLY_PRODUCT__ === early) {
          delete window.__SELFCARE_EARLY_PRODUCT__;
        }
      }
    }

    return apiClient.get(\`/products/\${id}\`);
  };

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: consumeEarlyProduct,
    enabled: !!id,
    staleTime: 30_000
  });
`;
  pdp = replaceOnce(pdpPath, pdp, marker, replacement, 'PDP consume early product promise');
} else {
  console.log('SKIP PDP consume early product promise already present');
}

console.log('PASS POST-UX C HOTFIX 11 patch applied');
