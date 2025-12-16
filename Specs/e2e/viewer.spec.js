import { test, expect } from "./test.js";

test("Viewer renders", async ({ cesiumPage }) => {
  await cesiumPage.goto();

  await cesiumPage.page.evaluate(() => {
    const viewer = new Cesium.Viewer("cesiumContainer");
  });

  await cesiumPage.page.waitForLoadState("networkidle");
  await expect(cesiumPage.page).toHaveScreenshot();
});
