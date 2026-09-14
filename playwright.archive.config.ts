import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', testMatch: 'archive-download.spec.ts', timeout: 60_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', launchOptions: { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' } },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175', url: 'http://127.0.0.1:4175',
    env: { ...process.env, VITE_E2E_AUTH_BYPASS: '0', VITE_SUPABASE_URL: 'https://archive-tests.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-only-key' },
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }, { name: 'mobile', use: devices['Pixel 7'] }],
})
