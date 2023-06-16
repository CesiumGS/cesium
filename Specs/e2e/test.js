import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { CesiumPage } from "./CesiumPage.js";
import path from "node:path";

export const test = baseTest.extend({
  cesiumPage: async ({ page }, use) => {
    await use(new CesiumPage(page));
  },
});

test.beforeEach(async ({ page }) => {
  // Mock the current system time - Always use the exact same time
  await page.addInitScript({
    path: path.join("node_modules/sinon/pkg/sinon.js"),
  });
  await page.addInitScript(() => {
    /* global sinon */
    window.__clock = sinon.useFakeTimers({
      now: 1703530800000, // 2023-12-25 14:00:00
      shouldAdvanceTime: false,
      toFake: ["Date", "hrtime", "performance"],
    });
  });
});

export const expect = baseExpect;
