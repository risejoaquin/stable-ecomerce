export const SITE_NAME = 'Selfcare Sinners';
export const SITE_URL = 'https://selfcaresinners.com';

export function stripHtml(value?: string | null) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildProductSlug(product: any) {
  const source = product?.slug || product?.name || product?.id || 'producto';
  const slug = String(source)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || String(product?.id || 'producto');
}

export function productCanonicalPath(product: any) {
  if (!product?.id) return '/';
  return `/product/${product.id}/${buildProductSlug(product)}`;
}

export function productJsonLd(product: any, storeName = SITE_NAME) {
  const image = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : `${SITE_URL}/logo.png`;
  const availability = Number(product?.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product?.name,
    description: stripHtml(product?.seo_description || product?.description || product?.long_description),
    image,
    sku: product?.sku || product?.id,
    brand: { '@type': 'Brand', name: product?.brand || storeName },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'MXN',
      price: Number(product?.price || 0).toFixed(2),
      availability,
      url: `${SITE_URL}${productCanonicalPath(product)}`,
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
