/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { promises as fs } from 'node:fs';
import { brotliCompress, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import {defineConfig, type Plugin} from 'vite';

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);
const COMPRESSIBLE_ASSET = /\.(?:css|html|js|json|mjs|svg|xml)$/i;
const COMPRESSION_THRESHOLD_BYTES = 1024;

function stableCompressionPlugin(): Plugin {
  return {
    name: 'selfcare-stable-compression',
    apply: 'build',
    async closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');

      async function walk(directory: string): Promise<string[]> {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(directory, entry.name);
            return entry.isDirectory() ? walk(fullPath) : [fullPath];
          }),
        );
        return files.flat();
      }

      let files: string[] = [];
      try {
        files = await walk(distDir);
      } catch (error: any) {
        if (error?.code === 'ENOENT') return;
        throw error;
      }

      await Promise.all(
        files
          .filter((filePath) => COMPRESSIBLE_ASSET.test(filePath))
          .filter((filePath) => !filePath.endsWith('.gz') && !filePath.endsWith('.br'))
          .map(async (filePath) => {
            const input = await fs.readFile(filePath);
            if (input.byteLength < COMPRESSION_THRESHOLD_BYTES) return;

            const [gzipOutput, brotliOutput] = await Promise.all([
              gzipAsync(input, { level: 9 }),
              brotliAsync(input),
            ]);

            await Promise.all([
              fs.writeFile(`${filePath}.gz`, gzipOutput),
              fs.writeFile(`${filePath}.br`, brotliOutput),
            ]);
          }),
      );
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), stableCompressionPlugin()],
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (normalizedId.includes('/node_modules/')) {
              // Keep React, React DOM, React Router and lucide-react inside the same
              // stable vendor chunk. Splitting those libraries separately caused a
              // production-only circular chunk and a blank screen in the browser.
              if (
                normalizedId.includes('/react/') ||
                normalizedId.includes('/react-dom/') ||
                normalizedId.includes('/react-router/') ||
                normalizedId.includes('/react-router-dom/') ||
                normalizedId.includes('/lucide-react/')
              ) {
                return 'vendor';
              }

              if (normalizedId.includes('/@tanstack/')) return 'vendor-query';
              if (
                normalizedId.includes('/recharts/') ||
                normalizedId.includes('/d3-') ||
                normalizedId.includes('/victory-vendor/') ||
                normalizedId.includes('/@reduxjs/toolkit/') ||
                normalizedId.includes('/decimal.js-light/') ||
                normalizedId.includes('/es-toolkit/') ||
                normalizedId.includes('/eventemitter3/') ||
                normalizedId.includes('/immer/') ||
                normalizedId.includes('/react-redux/') ||
                normalizedId.includes('/redux/') ||
                normalizedId.includes('/redux-thunk/') ||
                normalizedId.includes('/reselect/') ||
                normalizedId.includes('/use-sync-external-store/')
              ) return 'vendor-charts';
              if (normalizedId.includes('/@supabase/') || normalizedId.includes('/@stripe/')) return 'vendor-commerce';
              if (normalizedId.includes('/@sentry/')) return 'vendor-observability';
              if (
                normalizedId.includes('/motion/') ||
                normalizedId.includes('/@radix-ui/') ||
                normalizedId.includes('/react-hot-toast/')
              ) return 'vendor-ui';
              return 'vendor';
            }

            // Admin route modules keep their natural lazy-route boundaries.
            // Storefront route modules intentionally keep their natural Vite/Rollup
            // lazy-route boundaries. Do not collapse them into one shared storefront chunk.
            // Admin email modules keep natural Rollup dependency boundaries.
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
  };
});
