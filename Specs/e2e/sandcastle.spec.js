import { test, expect } from "./test.js";
import { globbySync } from "globby";
import { basename, dirname } from "node:path";

const gallery = globbySync("packages/sandcastle/gallery/**/*.yaml");

// These are sandcastles that are known to have a heavy/slow network load for large data
const knownSlowSandcastles = [
  "3d-tiles-1.1-cdb-yemen",
  "3d-tiles-gaussian-splats-with-lod",
];
// These are sandcastles that are animated on load and likely will fail screenshot
// tests until we find a good way to lock down the cesium clock to freeze them in place
// If any of the delay timings in the actual tests below changes these will likely need updated
const knownAnimatedSandcastles = [
  "callback-position-property",
  "callback-property",
  "custom-primitive-dev",
  "czml-path",
  "manually-controlled-animation",
  "material-with-custom-glsl",
  "relative-paths",
  "moon", // because it spins by default
  "multi-part-czml",
  "particle-system",
  "time-dynamic-wheels",
  "3d-tiles-gaussian-splatting", // not animated but needs the extra time for splat loading
];

for (const example of gallery) {
  const slug = basename(dirname(example));

  test(`${slug} renders`, async ({ page }) => {
    // the overall timeout for this test in the rare case it gets stuck waiting for network or screenshots
    test.setTimeout(100_000);
    page.context().setStorageState({
      origins: [
        {
          origin: "http://localhost:8081",
          // Preset value so that the navigation help widget panel is never displayed
          localStorage: [{ name: "cesium-hasSeenNavHelp", value: "true" }],
        },
      ],
    });

    // Use setFixedTime() instead of pauseAt() to prevent blocking the render loop
    // of the engine. Keep this time in UTC so it performs the same on all machines
    await page.clock.setFixedTime(new Date("2023-12-25T14:00:00Z"));

    const bucketRequest = page.waitForResponse("**/bucket.html");
    // the engine script should be one of the last to load after sandcastle code
    // is actually added to a page. Should be a good marker the page is "ready"
    const engineRequest = page.waitForResponse("**/engine/**/index.js");
    await page.goto(
      `http://localhost:8080/Apps/Sandcastle2/standalone.html?id=${slug}`,
    );
    Promise.allSettled([bucketRequest, engineRequest]);

    // wait a small amount of time to let things start loading in and cesium to initialize.
    // In practice without this, sometimes network would stabilize before it started loading
    // or cesium wouldn't be ready to respond to the fastforward timing from playwright
    await page.waitForTimeout(500);
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);
    await page.clock.runFor(1000);

    // we want to wait for the sandcastle to reach a state it shows what it needs to
    // these methods are discouraged by Playwright but we don't have an easy way to
    // reach into the Cesium Viewer and check for the load state of all data right now
    if (knownAnimatedSandcastles.includes(slug)) {
      // for busy animations wait a set amount of time before taking a screenshot
      await page.waitForTimeout(3000);
      // toHaveScreenshot waits for 2 consecutive screenshots to match
      // without pausing the clock this won't happen for some fast moving sandcastles
      await page.clock.pauseAt(new Date("2023-12-25T14:00:07Z"));
    } else {
      // for non-animated sandcastles wait for the network traffic to die down.
      // networkidle checks for 500ms of no traffic, this part is not configurable.
      // the timeout will provide an upper bound for how long to wait total
      let timeout = 10_000;
      if (knownSlowSandcastles.includes(slug)) {
        timeout = 20_000;
      }
      await page.waitForLoadState("networkidle", {
        timeout,
      });
    }

    await expect(page).toHaveScreenshot({
      timeout: 20_000,
    });
  });
}
