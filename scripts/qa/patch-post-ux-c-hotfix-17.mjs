import fs from 'node:fs';

const appPath = 'src/App.tsx';
const seoPath = 'src/components/SEO.tsx';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content, 'utf8'); }

let app = read(appPath);

if (app.includes("import { HelmetProvider } from 'react-helmet-async';")) {
  app = app.replace("import { HelmetProvider } from 'react-helmet-async';\n", '');
  app = app.replace(
`  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>`,
`  return (
    <QueryClientProvider client={queryClient}>`
  );
  app = app.replace(
`      </QueryClientProvider>
    </HelmetProvider>
  );`,
`    </QueryClientProvider>
  );`
  );
  write(appPath, app);
  console.log('PATCH remove global HelmetProvider from App critical path');
} else {
  console.log('SKIP global HelmetProvider already removed');
}

let seo = read(seoPath);

if (seo.includes("import { Helmet } from 'react-helmet-async';")) {
  const replacement = `import React, { useEffect } from 'react';

type JsonLd = Record<string, unknown>;

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  canonicalPath?: string;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  jsonLd?: JsonLd | JsonLd[];
}

const SITE_NAME = 'Selfcare Sinners';
const DEFAULT_TITLE = 'Selfcare Sinners | Skincare consciente';
const DEFAULT_DESC = 'Skincare curado para rutinas simples, seguras y efectivas. Compra segura, inventario real y rastreo de pedidos.';
const DEFAULT_IMAGE = '/logo.png';
const SEO_MARKER = 'data-selfcare-seo';

function resolveAbsoluteUrl(pathOrUrl?: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://selfcaresinners.com';
  if (!pathOrUrl) return origin;
  if (/^https?:\\/\\//i.test(pathOrUrl)) return pathOrUrl;
  return \`\${origin}\${pathOrUrl.startsWith('/') ? pathOrUrl : \`/\${pathOrUrl}\`}\`;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
  element.setAttribute(SEO_MARKER, 'true');
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
  element.setAttribute(SEO_MARKER, 'true');
}

export function SEO({
  title,
  description,
  image,
  canonicalPath,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const finalTitle = title?.includes(SITE_NAME) ? title : title ? \`\${title} | \${SITE_NAME}\` : DEFAULT_TITLE;
  const finalDescription = description || DEFAULT_DESC;
  const canonicalUrl = resolveAbsoluteUrl(canonicalPath || (typeof window !== 'undefined' ? window.location.pathname : '/'));
  const imageUrl = resolveAbsoluteUrl(image || DEFAULT_IMAGE);
  const structuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  useEffect(() => {
    document.title = finalTitle;

    upsertMeta('meta[name="description"]', { name: 'description', content: finalDescription });
    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'
    });
    upsertCanonical(canonicalUrl);

    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: finalTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: finalDescription });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'es_MX' });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: finalTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: finalDescription });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });

    document.head
      .querySelectorAll<HTMLScriptElement>(\`script[type="application/ld+json"][\${SEO_MARKER}]\`)
      .forEach((node) => node.remove());

    structuredData.forEach((data) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(data);
      script.setAttribute(SEO_MARKER, 'true');
      document.head.appendChild(script);
    });
  }, [
    finalTitle,
    finalDescription,
    canonicalUrl,
    imageUrl,
    type,
    noindex,
    JSON.stringify(structuredData)
  ]);

  return null;
}
`;
  seo = replacement;
  write(seoPath, seo);
  console.log('PATCH replace react-helmet-async SEO runtime with native head management');
} else {
  console.log('SKIP SEO already free of react-helmet-async');
}

app = read(appPath);
seo = read(seoPath);

if (app.includes('HelmetProvider') || app.includes('react-helmet-async')) {
  throw new Error('HOTFIX 17 App still references react-helmet-async');
}
if (seo.includes('Helmet') || seo.includes('react-helmet-async')) {
  throw new Error('HOTFIX 17 SEO still references Helmet');
}

for (const needle of [
  "import React, { useEffect } from 'react';",
  "const SEO_MARKER = 'data-selfcare-seo';",
  "document.title = finalTitle;",
  "meta[name=\"description\"]",
  "link[rel=\"canonical\"]",
  "script[type=\"application/ld+json\"]"
]) {
  if (!seo.includes(needle)) throw new Error(`HOTFIX 17 SEO contract missing: ${needle}`);
}

console.log('PASS POST-UX C HOTFIX 17 native SEO head management patch applied');
