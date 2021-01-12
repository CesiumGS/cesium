const puppeteer = require("puppeteer");

(async () => {
  process.argv;
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
    args: [`--window-size=${1800},${1800}`],
  });
  try {
    const page = await browser.newPage();
    await page.goto(
      "http://localhost:8080/Apps/Sandcastle/index.html?src=TerrainMesh.html&label=All"
    );

    const now = Date.now();
    const path = `traces/cesium_trace_${now}.json`;
    console.log(`starting trace ${path}`);
    await page.tracing.start({ path, screenshots: false });
    console.log("waiting for page to be ready");
    await page.waitForFunction(
      `Array.from(document.querySelector("iframe").contentDocument.body.classList).includes("we-are-done")`
    );

    console.log("stopping trace");
    await page.tracing.stop();
  } finally {
    console.log("closing browser");
    await browser.close();
  }
})();
