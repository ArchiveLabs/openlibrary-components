import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
    rollupOptions: {
      // Multi-page: main app + component catalog
      input: ['index.html', 'catalog.html'],
    },
  },
  server: {
    port: 8090,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
