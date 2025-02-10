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

const defaultViewport = { width: 960, height: 540 };

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: ".",
  outputDir: "../../Build/Specs/e2e/artifacts",
  forbidOnly: !!process.env.CI,
  retries: updateSnapshots ? 0 : 1,
  fullyParallel: false,
  workers: 1,
  reporter: reporter,
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
    viewport: defaultViewport,
  },
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      threshold: 0.25,
      maxDiffPixelRatio: 0.02,
    },
  },
  updateSnapshots: updateSnapshots ? "all" : "missing",

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: defaultViewport,
        launchOptions: {
          // this forces chrome to use the gpu for webgl which greatly speeds up tests
          args: ["--use-angle=gl"],
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: defaultViewport,
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: defaultViewport,
      },
    },
  ],

  webServer: {
    command: "npm run start -- --production --port 3000",
    url: baseUrl,
    reuseExistingServer: false,
  },
});
