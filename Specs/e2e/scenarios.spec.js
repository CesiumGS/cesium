import { readFile } from "node:fs/promises";
import { test, expect } from "./test.js";
import { globbySync } from "globby";
import { dirname, join } from "path";
import { fileURLToPath } from "node:url";
import { basename } from "node:path";

const scenarioFiles = globbySync("Specs/e2e/scenarios/**/*.js");

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Build an in-memory representation of a standalone sandcastle page for use in the test
 *
 * @param {string} testPath
 */
async function buildPage(testPath) {
  const jsFile = await readFile(testPath, "utf-8");

  let scaffold = await readFile(
    join(__dirname, "scenarios/scaffold.html"),
    "utf-8",
  );

  scaffold = scaffold.replace("// TEST_CODE_HERE", jsFile);

  return scaffold;
}

for (const example of scenarioFiles) {
  const slug = basename(example, ".js");

  test(`${slug} renders`, async ({ page }) => {
    test.setTimeout(100000);

    const pageHtml = await buildPage(example);

    // serve the new page at a fake route to fully mimic loading the page
    const fakePageRoute = `/${slug}-wrapper.html`;
    await page.route(fakePageRoute, (route) =>
      route.fulfill({
        status: 200,
        body: pageHtml,
      }),
    );
    await page.goto(fakePageRoute);

    // await page.clock.pauseAt(new Date("2023-12-25T14:00:00"));

    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    await page.waitForLoadState("networkidle");

    await page.waitForFunction("window.specReady");

    await expect(page).toHaveScreenshot({
      timeout: 20000,
    });
  });
}
