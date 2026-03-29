import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './editor/tests/e2e',
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run editor:dev:web -- --host 127.0.0.1 --port 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
