/// <reference types="vitest" />
import viteCompression from 'vite-plugin-compression';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), viteCompression({ algorithm: 'brotliCompress' }), viteCompression({ algorithm: 'gzip' })],
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');

            if (normalizedId.includes('/node_modules/')) {
              // Keep React, React DOM, React Router and lucide-react inside the same
              // stable vendor chunk. Splitting those libraries separately caused a
              // production-only circular chunk in Rollup and a blank screen in the
              // browser with: Cannot set properties of undefined (setting 'Activity').
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
              if (normalizedId.includes('/recharts/')) return 'vendor-charts';
              if (normalizedId.includes('/@supabase/') || normalizedId.includes('/@stripe/')) return 'vendor-commerce';
              return 'vendor';
            }

            if (normalizedId.includes('/src/pages/admin/')) return 'admin-pages';
            if (normalizedId.includes('/src/pages/store/')) return 'storefront-pages';
            if (normalizedId.includes('/src/server/email/') || normalizedId.includes('/src/hooks/useAdminEmail')) return 'email-admin';
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
