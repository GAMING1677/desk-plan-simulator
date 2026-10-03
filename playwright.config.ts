import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const localBrowsers = resolve(".cache/playwright");
if (existsSync(localBrowsers))
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= localBrowsers;
export default defineConfig({
  snapshotPathTemplate: process.env.GITHUB_ACTIONS
    ? "{testDir}/{testFilePath}-snapshots/{arg}-windows-ci{ext}"
    : undefined,
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 2,
  timeout: 30000,
  expect: { timeout: 5000, toHaveScreenshot: { maxDiffPixelRatio: 0.001 } },
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 900 },
    browserName: "chromium",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${process.env.E2E_PREVIEW === "1" ? "preview" : ""} --host 127.0.0.1 --port 4173 --strictPort`,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
