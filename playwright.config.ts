import { defineConfig } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // Uses installed Microsoft Edge locally; CI installs Chromium and sets PW_CHANNEL=chromium.
    channel: process.env.PW_CHANNEL ?? "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    // Serves the production build against the dedicated test database.
    command: `next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      COOKIE_SECURE: "false",
    },
  },
});
