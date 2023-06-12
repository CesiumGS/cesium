import { defineConfig, devices } from "@playwright/test";
import yargs from "yargs";

const argv = yargs(process.argv).options({
  "update-snapshots": {
    alias: "u",
    description: "Update test snapshots.",
    type: "boolean",
    default: false,
  },
}).argv;

const baseUrl = `http://localhost:3000`;
const updateSnapshots = argv["update-snapshots"];

let reporter = "line";
if (!process.env.CI) {
  reporter = [
    ["html", { open: "never", outputFolder: "../../Build/Specs/e2e/report" }],
    ["list"],
  ];
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: ".",
  outputDir: "../../Build/Specs/e2e/artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: updateSnapshots ? 0 : 2,
  workers: process.env.CI ? 1 : undefined,
  reporter: reporter,
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
    viewport: { width: 320, height: 180 },
  },
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      threshold: 0.4,
      maxDiffPixelRatio: 0.02,
    },
  },
  updateSnapshots: updateSnapshots ? "all" : "missing",

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  ],

  webServer: {
    command: "npm run start -- --production --port 3000",
    url: baseUrl,
    reuseExistingServer: false,
  },
});
