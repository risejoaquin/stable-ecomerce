export type ResponsiveProductImage = {
  src: string;
  srcSet?: string;
  sizes?: string;
  fallbackSrc?: string;
};

const RESPONSIVE_PRODUCT_RE = /^(.*\/responsive\/[^/]+\/w(\d+)\/)(\d+)\.webp(?:\?.*)?$/;

export function getResponsiveProductImage(url?: string | null): ResponsiveProductImage | null {
  if (!url) return null;

  const match = url.match(RESPONSIVE_PRODUCT_RE);
  if (!match) {
    return { src: url };
  }

  const base = match[1];
  const sourceWidth = Number(match[2]);
  const currentWidth = Number(match[3]);

  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0) {
    return { src: url };
  }

  const widths = [480, 800, 1200].filter((width) => width <= sourceWidth);
  if (widths.length === 0 && Number.isFinite(currentWidth) && currentWidth > 0) {
    widths.push(currentWidth);
  }

  const srcSet = Array.from(new Set(widths))
    .sort((a, b) => a - b)
    .map((width) => `${base}${width}.webp ${width}w`)
    .join(', ');

  return {
    src: url,
    srcSet: srcSet || undefined,
    sizes: srcSet ? '(max-width: 768px) 100vw, 50vw' : undefined,
    fallbackSrc: `${base}original`
  };
}
