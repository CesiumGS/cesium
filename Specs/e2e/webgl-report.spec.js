import { test, expect } from "./test.js";

function waitFor(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

const screenshotPath = "Specs/e2e/webgl-check";

const chromeGpu = "chrome://gpu"; // only works for chrome not firefox
const webGlReport1 = "https://webglreport.com/?v=1";
const webGlReport2 = "https://webglreport.com/?v=2";

/**
 * This is used to check how WebGL is running in the testing environment to spot things like
 * not using the correct gpu that may affect performace and run time of the tests themselves
 * Based off of https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/
 */
test.describe("WebGL verification", () => {
  // Check if hardware acceleration is enabled. Without it, our tests will be much slower.
  test("GPU hardware acceleration", async ({ page }) => {
    await page.goto(chromeGpu);
    await waitFor(2000);
    await page.screenshot({
      path: `${screenshotPath}/screenshot_hardware.png`,
      fullPage: true,
    });
  });
  test("webgl report v1", async ({ page }) => {
    await page.goto(webGlReport1);
    await waitFor(2000);
    await page.screenshot({
      path: `${screenshotPath}/screenshot_webgl1.png`,
      fullPage: true,
    });
    const selector =
      "#output > div.report > table > tbody > tr:nth-child(9) > td";
    const renderer = page.locator(selector);
    await expect(renderer).toContainText("NVIDIA", { timeout: 100 });
  });
  test("webgl report v2", async ({ page }) => {
    await page.goto(webGlReport2);
    await waitFor(2000);
    await page.screenshot({
      path: `${screenshotPath}/screenshot_webgl2.png`,
      fullPage: true,
    });
    const selector =
      "#output > div.report > table > tbody > tr:nth-child(9) > td";
    const renderer = page.locator(selector);
    await expect(renderer).toContainText("NVIDIA", { timeout: 100 });
  });
});
