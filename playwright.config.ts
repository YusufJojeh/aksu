import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', timeout: 60_000, fullyParallel: false, workers: 1,
  use: { baseURL: process.env.LIVE_BASE_URL ?? 'http://127.0.0.1:4173', trace: 'retain-on-failure', launchOptions: { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' } },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
