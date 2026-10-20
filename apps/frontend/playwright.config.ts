import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');
const FRONTEND_PORT = Number(env.FRONTEND_PORT ?? 5173);
const API_URL = env.API_PROXY_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: `uv run uvicorn app.main:app --port ${new URL(API_URL).port || 8000}`,
      cwd: '../backend',
      url: `${API_URL}/health/ready`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx vite',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
