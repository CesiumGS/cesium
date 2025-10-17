import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { CesiumPage } from "./CesiumPage.js";

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(new Date("2023-12-25T14:00:00"));
    await use(page);
  },

  cesiumPage: async ({ page }, use) => {
    await use(new CesiumPage(page));
  },
});

export const expect = baseExpect;
