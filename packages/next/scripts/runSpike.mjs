// Runs a spike's checks headless in Edge on this machine's GPU and prints
// them: `node scripts/runSpike.mjs <spike page URL> <run function>`, e.g.
// `node scripts/runSpike.mjs http://127.0.0.1:5190/spikes/warpGlobe.html?bench runWarpGlobe`
// with the dev server running. A visible, focused page: a browser tab hidden
// behind other windows throttles timers, and spikes then crawl or stall.
import { chromium } from "playwright";

const [url, fn] = process.argv.slice(2);
if (!url || !fn) {
  console.error("usage: node scripts/runSpike.mjs <url> <run function>");
  process.exit(2);
}
const browser = await chromium.launch({
  headless: true,
  channel: process.env.BENCH_CHANNEL ?? "msedge",
  args: [
    "--enable-unsafe-webgpu",
    "--enable-webgpu-developer-features",
    "--force_high_performance_gpu",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e)));
  await page.goto(url);
  await page.waitForFunction((f) => typeof globalThis[f] === "function", fn, {
    timeout: 60_000,
  });
  const start = Date.now();
  const result = await page.evaluate(async (f) => {
    const r = await globalThis[f]();
    return {
      adapter: r.adapter,
      checks: r.checks.map(
        (c) =>
          `${c.pass ? "PASS" : "FAIL"} ${c.name}: ${JSON.stringify(c.measured)}`,
      ),
    };
  }, fn);
  console.log(
    `${result.adapter}, ${((Date.now() - start) / 1000).toFixed(1)} s`,
  );
  for (const check of result.checks) {
    console.log(check);
  }
  process.exitCode = result.checks.every((c) => c.startsWith("PASS")) ? 0 : 1;
} finally {
  await browser.close();
}
