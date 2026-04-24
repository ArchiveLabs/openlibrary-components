import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    port: 4173,
    timeout: 60000,
    reuseExistingServer: false,
  },
});
