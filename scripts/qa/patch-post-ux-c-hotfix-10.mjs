import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const paths = {
  packageJson: path.join(root, 'package.json'),
  server: path.join(root, 'server.ts'),
  productForm: path.join(root, 'src/components/admin/ProductFormModal.tsx'),
  pdp: path.join(root, 'src/pages/store/ProductDetailPage.tsx'),
  helper: path.join(root, 'src/lib/product-image.ts'),
};

for (const [name, file] of Object.entries(paths)) {
  if (name !== 'helper' && !fs.existsSync(file)) {
    throw new Error(`Required file missing: ${file}`);
  }
}

const pkgRaw = fs.readFileSync(paths.packageJson, 'utf8');
const serverRaw = fs.readFileSync(paths.server, 'utf8');
const formRaw = fs.readFileSync(paths.productForm, 'utf8');
const pdpRaw = fs.readFileSync(paths.pdp, 'utf8');

let pkg = pkgRaw;
let server = serverRaw;
let form = formRaw;
let pdp = pdpRaw;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function replaceOnce(source, oldText, newText, label) {
  if (source.includes(newText)) {
    console.log(`SKIP already applied: ${label}`);
    return source;
  }
  ensure(source.includes(oldText), `Anchor not found for ${label}`);
  console.log(`PATCH ${label}`);
  return source.replace(oldText, newText);
}

// package.json: preserve existing formatting, add only sharp.
if (!/"sharp"\s*:/.test(pkg)) {
  const pgMatch = pkg.match(/^(\s*)"pg"\s*:\s*"([^"]+)"([,\s]*)$/m);
  ensure(pgMatch, 'Unable to find pg dependency anchor in package.json');
  const indent = pgMatch[1];
  const full = pgMatch[0];
  const hasComma = /,\s*$/.test(full);
  const normalized = hasComma ? full.replace(/,\s*$/, ',') : `${full},`;
  pkg = pkg.replace(full, `${normalized}\n${indent}"sharp": "^0.35.4",`);
  console.log('PATCH package.json sharp dependency');
} else {
  console.log('SKIP sharp dependency already present');
}

// server.ts: import sharp.
server = replaceOnce(
  server,
  "import multer from 'multer';",
  "import multer from 'multer';\nimport sharp from 'sharp';",
  'server sharp import'
);

const endpointMarker = '// POST-UX C HOTFIX 10: responsive product image upload pipeline';
if (!server.includes(endpointMarker)) {
  const uploadRouteMatch = server.match(/^[ \t]*app\.post\(\s*['"]\/api\/upload['"]/m);
  ensure(uploadRouteMatch, "Could not locate existing /api/upload route in server.ts");

  const routeBlock = `${endpointMarker}
const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 8,
    parts: 10
  }
});

app.post(
  '/api/upload/product-image',
  mockAuthMiddleware(),
  requireAdmin(),
  productImageUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!supabase) {
      return res.status(503).json({ error: 'Storage is not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const allowedImageTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ]);

    if (!allowedImageTypes.has(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported image format' });
    }

    const source = sharp(req.file.buffer, { failOn: 'error' }).rotate();
    const metadata = await source.metadata();
    const sourceWidth = Number(metadata.width || 0);
    const sourceHeight = Number(metadata.height || 0);

    if (!sourceWidth || !sourceHeight) {
      return res.status(400).json({ error: 'Unable to read image dimensions' });
    }

    const uploadId = crypto.randomUUID();
    const basePath = \`responsive/\${uploadId}/w\${sourceWidth}\`;
    const uploadedPaths = [];

    const uploadAsset = async (storagePath, buffer, contentType) => {
      const { error } = await supabase.storage
        .from('products')
        .upload(storagePath, buffer, {
          contentType,
          cacheControl: '31536000',
          upsert: false
        });

      if (error) throw error;
      uploadedPaths.push(storagePath);

      const { data } = supabase.storage.from('products').getPublicUrl(storagePath);
      return data.publicUrl;
    };

    try {
      const originalPath = \`\${basePath}/original\`;
      const originalUrl = await uploadAsset(
        originalPath,
        req.file.buffer,
        req.file.mimetype
      );

      const standardWidths = [480, 800, 1200].filter((width) => width <= sourceWidth);
      const targetWidths = standardWidths.length > 0
        ? standardWidths
        : [sourceWidth];

      const variants = [];

      for (const width of targetWidths) {
        const buffer = await sharp(req.file.buffer, { failOn: 'error' })
          .rotate()
          .resize({
            width,
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({
            quality: width <= 480 ? 78 : width <= 800 ? 80 : 82,
            effort: 4
          })
          .toBuffer();

        const variantPath = \`\${basePath}/\${width}.webp\`;
        const url = await uploadAsset(variantPath, buffer, 'image/webp');

        variants.push({
          width,
          url,
          bytes: buffer.length
        });
      }

      const primary = variants[variants.length - 1];

      return res.status(201).json({
        url: primary.url,
        originalUrl,
        responsive: {
          sourceWidth,
          sourceHeight,
          variants
        }
      });
    } catch (error) {
      if (uploadedPaths.length > 0) {
        try {
          await supabase.storage.from('products').remove(uploadedPaths);
        } catch (cleanupError) {
          logger.warn({ err: cleanupError, uploadedPaths }, 'Responsive image cleanup failed');
        }
      }
      throw error;
    }
  })
);

`;

  server = server.replace(uploadRouteMatch[0], `${routeBlock}${uploadRouteMatch[0]}`);
  console.log('PATCH responsive product image endpoint');
} else {
  console.log('SKIP responsive product image endpoint already present');
}

// Product admin uploads product images through the optimized endpoint.
form = replaceOnce(
  form,
  "const res = await fetch('/api/upload', {",
  "const res = await fetch('/api/upload/product-image', {",
  'ProductFormModal optimized upload endpoint'
);

// Add helper import to PDP.
pdp = replaceOnce(
  pdp,
  "import { productCanonicalPath, productJsonLd, stripHtml } from '../../lib/seo';",
  "import { productCanonicalPath, productJsonLd, stripHtml } from '../../lib/seo';\nimport { getResponsiveProductImage } from '../../lib/product-image';",
  'PDP responsive image helper import'
);

// Add resolved main image descriptor after cart item count.
pdp = replaceOnce(
  pdp,
  "  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);",
  "  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);\n  const mainImage = getResponsiveProductImage(product.images?.[selectedImageIndex]);",
  'PDP main image descriptor'
);

// Replace only the primary LCP image line.
const oldPrimary = `{product.images?.[selectedImageIndex] ? <img src={product.images[selectedImageIndex]} alt={product.name} fetchPriority="high" loading="eager" decoding="async" /> : <div className="absolute inset-0 flex items-center justify-center opacity-40">Sin imagen</div>}`;
const newPrimary = `{mainImage ? <img src={mainImage.src} srcSet={mainImage.srcSet} sizes={mainImage.sizes} alt={product.name} fetchPriority="high" loading="eager" decoding="async" onError={(event) => { if (mainImage.fallbackSrc && event.currentTarget.src !== mainImage.fallbackSrc) { event.currentTarget.srcset = ''; event.currentTarget.src = mainImage.fallbackSrc; } }} /> : <div className="absolute inset-0 flex items-center justify-center opacity-40">Sin imagen</div>}`;

pdp = replaceOnce(
  pdp,
  oldPrimary,
  newPrimary,
  'PDP responsive LCP image'
);

const helper = `export type ResponsiveProductImage = {
  src: string;
  srcSet?: string;
  sizes?: string;
  fallbackSrc?: string;
};

const RESPONSIVE_PRODUCT_RE = /^(.*\\/responsive\\/[^/]+\\/w(\\d+)\\/)(\\d+)\\.webp(?:\\?.*)?$/;

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
    .map((width) => \`\${base}\${width}.webp \${width}w\`)
    .join(', ');

  return {
    src: url,
    srcSet: srcSet || undefined,
    sizes: srcSet ? '(max-width: 768px) 100vw, 50vw' : undefined,
    fallbackSrc: \`\${base}original\`
  };
}
`;

if (!fs.existsSync(paths.helper) || fs.readFileSync(paths.helper, 'utf8') !== helper) {
  fs.writeFileSync(paths.helper, helper, 'utf8');
  console.log('PATCH responsive product image helper');
} else {
  console.log('SKIP responsive product image helper already current');
}

// Write only after every anchor was validated.
fs.writeFileSync(paths.packageJson, pkg, 'utf8');
fs.writeFileSync(paths.server, server, 'utf8');
fs.writeFileSync(paths.productForm, form, 'utf8');
fs.writeFileSync(paths.pdp, pdp, 'utf8');

console.log('PASS POST-UX C HOTFIX 10 responsive product image pipeline applied');
