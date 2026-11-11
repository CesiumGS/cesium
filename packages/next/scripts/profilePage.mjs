// Profiles a page headless in Edge on this machine's GPU: a CPU profile over
// the first seconds after load, the main thread's long tasks and the JS heap,
// with self time summed by function and by file. `node scripts/profilePage.mjs
// <url> [seconds = 20]` with the dev server running.
import { chromium } from "playwright";

const [url, secondsArg] = process.argv.slice(2);
if (!url) {
  console.error("usage: node scripts/profilePage.mjs <url> [seconds]");
  process.exit(2);
}
const seconds = Number(secondsArg ?? 20);
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
    viewport: { width: 1600, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      errors.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
    }
  });
  await page.addInitScript(() => {
    globalThis.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        globalThis.__longTasks.push(e.duration);
      }
    }).observe({ type: "longtask", buffered: true });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
  await cdp.send("Profiler.start");
  const heap = [];
  await page.goto(url);
  for (let s = 0; s < seconds; s++) {
    await page.waitForTimeout(1000);
    const h = await page
      .evaluate(() => performance.memory?.usedJSHeapSize ?? 0)
      .catch(() => 0);
    heap.push(Math.round(h / 2 ** 20));
  }
  const { profile } = await cdp.send("Profiler.stop");
  const longTasks = await page.evaluate(() => globalThis.__longTasks);

  // Self time per node: samples × interval.
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const hits = new Map();
  for (const id of profile.samples) {
    hits.set(id, (hits.get(id) ?? 0) + 1);
  }
  const total = profile.samples.length;
  const ms = (profile.endTime - profile.startTime) / 1000 / total;
  const byFn = new Map();
  const byFile = new Map();
  for (const [id, n] of hits) {
    const f = byId.get(id).callFrame;
    const file = (f.url || "(native)")
      .replace(/^https?:\/\/[^/]+\//, "")
      .replace(/\?.*$/, "");
    const fn = `${f.functionName || "(anonymous)"}  ${file}:${f.lineNumber + 1}`;
    byFn.set(fn, (byFn.get(fn) ?? 0) + n);
    byFile.set(file, (byFile.get(file) ?? 0) + n);
  }
  const top = (m, k) =>
    [...m]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(
        ([name, n]) =>
          `${(n * ms).toFixed(0).padStart(7)} ms  ${((100 * n) / total).toFixed(1).padStart(5)}%  ${name}`,
      );
  const busy = [...hits]
    .filter(
      ([id]) =>
        !["(idle)", "(program)", "(garbage collector)"].includes(
          byId.get(id).callFrame.functionName,
        ),
    )
    .reduce((s, [, n]) => s + n, 0);
  console.log(
    `profile ${((total * ms) / 1000).toFixed(1)} s, busy ${((busy * ms) / 1000).toFixed(1)} s`,
  );
  console.log(
    `long tasks: ${longTasks.length}, total ${Math.round(longTasks.reduce((a, b) => a + b, 0))} ms, longest ${Math.round(Math.max(0, ...longTasks))} ms`,
  );
  console.log(`JS heap per second (MiB): ${heap.join(" ")}`);
  console.log("\nself time by function:");
  console.log(top(byFn, 30).join("\n"));
  console.log("\nself time by file:");
  console.log(top(byFile, 20).join("\n"));
  if (errors.length) {
    console.log("\nconsole errors/warnings (first 10):");
    console.log(errors.slice(0, 10).join("\n"));
  }
} finally {
  await browser.close();
}
