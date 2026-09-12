import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  preserveOutput: 'always',
  use: {
    baseURL: 'http://127.0.0.1:3108',
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start -- -p 3108',
    url: 'http://127.0.0.1:3108/admin',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
