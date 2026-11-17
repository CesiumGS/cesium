import { defineConfig, devices } from "@playwright/test";

const baseUrl = "http://localhost:8080";
const defaultViewport = { width: 960, height: 540 };

let reporter = "line";
if (!process.env.CI) {
  reporter = [
    [
      "html",
      {
        open: "never",
        outputFolder: "../../../Build/Specs/e2e/artifact-smoke-report",
      },
    ],
    ["list"],
  ];
}

export default defineConfig({
  testDir: ".",
  testMatch: "artifact.spec.js",
  globalTeardown: "./globalTeardown.js",
  outputDir: "../../../Build/Specs/e2e/artifact-smoke-results",
  forbidOnly: !!process.env.CI,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter,
  use: {
    baseURL: baseUrl,
    trace: "retain-on-failure",
    viewport: defaultViewport,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        viewport: defaultViewport,
        launchOptions: {
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
});
