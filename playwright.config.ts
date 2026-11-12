import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),

  timeout: 30_000,

  expect: {
    timeout: 5_000,
  },

  retries: 0,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: {
        baseURL: process.env.API_BASE_URL,
      },
    },
    {
      name: 'chromium',
      testMatch: '**/ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WEB_BASE_URL,
      },
    },
  ],
});