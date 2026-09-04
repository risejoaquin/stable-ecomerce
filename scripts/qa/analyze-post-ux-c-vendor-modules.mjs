import { build } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, '.tmp', 'post-ux-c-vendor-modules');
await fs.mkdir(outputDir, { recursive: true });

const result = await build({
  configFile: path.join(root, 'vite.config.ts'),
  build: {
    write: false,
    emptyOutDir: false,
  },
});

const outputs = Array.isArray(result) ? result.flatMap((entry) => entry.output ?? []) : (result.output ?? []);
const chunks = outputs.filter((item) => item.type === 'chunk');

const vendorChunk = chunks.find((chunk) =>
  /^assets\/vendor-[^-].*\.js$/.test(chunk.fileName) ||
  /^assets\/vendor--.*\.js$/.test(chunk.fileName)
);

if (!vendorChunk) {
  console.error('FAIL protected vendor chunk not found');
  process.exit(1);
}

function packageNameFromId(id) {
  const normalized = id.replace(/\\/g, '/');
  const marker = '/node_modules/';
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return '(app/local)';

  const rest = normalized.slice(index + marker.length);
  const parts = rest.split('/');

  if (parts[0].startsWith('@') && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0] || '(unknown)';
}

const rows = Object.entries(vendorChunk.modules).map(([id, info]) => ({
  package: packageNameFromId(id),
  moduleId: id.replace(/\\/g, '/'),
  renderedBytes: Number(info.renderedLength ?? 0),
  originalBytes: Number(info.originalLength ?? 0),
}));

const grouped = new Map();
for (const row of rows) {
  const current = grouped.get(row.package) ?? {
    package: row.package,
    renderedBytes: 0,
    originalBytes: 0,
    modules: 0,
  };
  current.renderedBytes += row.renderedBytes;
  current.originalBytes += row.originalBytes;
  current.modules += 1;
  grouped.set(row.package, current);
}

const packages = [...grouped.values()]
  .map((row) => ({
    ...row,
    renderedKB: Number((row.renderedBytes / 1024).toFixed(2)),
    originalKB: Number((row.originalBytes / 1024).toFixed(2)),
    protected:
      row.package === 'react' ||
      row.package === 'react-dom' ||
      row.package === 'react-router' ||
      row.package === 'react-router-dom' ||
      row.package === 'lucide-react',
  }))
  .sort((a, b) => b.renderedBytes - a.renderedBytes);

const moduleRows = rows
  .map((row) => ({
    ...row,
    renderedKB: Number((row.renderedBytes / 1024).toFixed(2)),
    originalKB: Number((row.originalBytes / 1024).toFixed(2)),
  }))
  .sort((a, b) => b.renderedBytes - a.renderedBytes);

const report = {
  vendorChunk: vendorChunk.fileName,
  chunkCodeKB: Number((vendorChunk.code.length / 1024).toFixed(2)),
  packages,
  modules: moduleRows,
};

await fs.writeFile(
  path.join(outputDir, 'post-ux-c-vendor-module-report.json'),
  JSON.stringify(report, null, 2),
  'utf8',
);

const csvHeader = 'package,renderedKB,originalKB,modules,protected\n';
const csvBody = packages
  .map((row) =>
    [
      JSON.stringify(row.package),
      row.renderedKB,
      row.originalKB,
      row.modules,
      row.protected,
    ].join(',')
  )
  .join('\n');

await fs.writeFile(
  path.join(outputDir, 'post-ux-c-vendor-package-summary.csv'),
  csvHeader + csvBody + '\n',
  'utf8',
);

console.log('');
console.log('POST-UX C VENDOR MODULE ANALYSIS COMPLETE');
console.log(`Vendor chunk: ${report.vendorChunk}`);
console.log(`Chunk code:   ${report.chunkCodeKB} KiB`);
console.log(`JSON: ${path.join('.tmp', 'post-ux-c-vendor-modules', 'post-ux-c-vendor-module-report.json')}`);
console.log(`CSV:  ${path.join('.tmp', 'post-ux-c-vendor-modules', 'post-ux-c-vendor-package-summary.csv')}`);
console.log('');
console.log('=== VENDOR PACKAGES BY RENDERED SIZE ===');
console.table(
  packages.map((row) => ({
    package: row.package,
    renderedKB: row.renderedKB,
    modules: row.modules,
    protected: row.protected,
  }))
);
console.log('');
console.log('=== TOP 25 VENDOR MODULES ===');
console.table(
  moduleRows.slice(0, 25).map((row) => ({
    renderedKB: row.renderedKB,
    package: row.package,
    moduleId: row.moduleId,
  }))
);
