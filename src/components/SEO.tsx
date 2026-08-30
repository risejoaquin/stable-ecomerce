import React from 'react';
import { Helmet } from 'react-helmet-async';

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

function resolveAbsoluteUrl(pathOrUrl?: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://selfcaresinners.com';
  if (!pathOrUrl) return origin;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
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
  const finalTitle = title?.includes(SITE_NAME) ? title : title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const finalDescription = description || DEFAULT_DESC;
  const canonicalUrl = resolveAbsoluteUrl(canonicalPath || (typeof window !== 'undefined' ? window.location.pathname : '/'));
  const imageUrl = resolveAbsoluteUrl(image || DEFAULT_IMAGE);
  const structuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content="es_MX" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={imageUrl} />

      {structuredData.map((data, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
