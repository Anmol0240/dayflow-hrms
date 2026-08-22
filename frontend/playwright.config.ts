import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

import { backendEnvironment, python, repositoryRoot } from "./e2e/environment";

const pnpm = process.env.DAYFLOW_E2E_PNPM ?? "pnpm";
const browserChannel = process.env.DAYFLOW_E2E_BROWSER_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(browserChannel ? { channel: browserChannel } : {}),
  },
  webServer: [
    {
      command: `"${python}" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000`,
      cwd: repositoryRoot,
      url: "http://127.0.0.1:8000/api/v1/health/ready",
      reuseExistingServer: false,
      timeout: 60_000,
      env: backendEnvironment,
    },
    {
      command: `"${pnpm}" run dev -- --host 127.0.0.1 --port 5173`,
      cwd: resolve(repositoryRoot, "frontend"),
      url: "http://127.0.0.1:5173/sign-in",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_BASE_URL: "http://127.0.0.1:8000/api/v1" },
    },
  ],
});
