import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
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
