// Records a Chrome trace across a camera jump into an uncached area and
// reports what every process and thread was doing during each slow frame
// (over 34 ms): the main thread, workers, the GPU process (Dawn, the
// command buffer service), the compositor and the network service.
//
//   node packages/next/bench/trace.mjs [lon,lat]
//
// Needs VITE_ION_TOKEN in packages/next/.env.local (Google 3D Tiles via ion).
// TRACE_ASSET overrides the ion asset, TRACE_FROM the settled start
// (lon,lat), TRACE_OUT the trace file (default: the OS temp directory).
// BENCH_HEADED=1 shows the browser.
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const asset = process.env.TRACE_ASSET ?? "2275207";
const from = process.env.TRACE_FROM ?? "-73.9857,40.7484";
const to = (process.argv[2] ?? "-73.9442,40.6782").split(",").map(Number);

const { createServer } = await import("vite");
const server = await createServer({
  root,
  configFile: join(root, "vite.config.ts"),
  cacheDir: join(root, ".vite-bench"),
  server: { port: 5192, strictPort: false, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, "");

const browser = await chromium.launch({
  headless: !process.env.BENCH_HEADED,
  channel: process.env.BENCH_CHANNEL ?? "msedge",
  args: [
    "--enable-unsafe-webgpu",
    "--enable-webgpu-developer-features",
    "--force_high_performance_gpu",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  localStorage.setItem("viewer.terrain", "0");
});
await page.goto(`${base}/viewer/?asset=${asset}&at=${from},1500`);

// Settled: everything loaded for the start view.
await page.waitForFunction(
  () => {
    const e = globalThis.engine;
    return (
      e &&
      e.tilesets.length > 0 &&
      e.tilesets.every((t) => !t.show || (t.idle && t.stats.loaded > 0))
    );
  },
  undefined,
  { timeout: 60000, polling: 250 },
);
await page.waitForTimeout(1500);

// Frame markers: performance.mark for every frame over 34 ms, so the trace
// shows where each slow frame ended (blink.user_timing).
await page.evaluate(() => {
  let last = performance.now();
  globalThis.__slow = [];
  const raf = (t) => {
    const gap = t - last;
    if (gap > 34) {
      performance.mark(`slow-frame ${gap.toFixed(0)}`);
      globalThis.__slow.push({ end: t, gap });
    }
    last = t;
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
});

await browser.startTracing(page, {
  categories: [
    "toplevel",
    "blink.user_timing",
    "devtools.timeline",
    "disabled-by-default-devtools.timeline",
    "disabled-by-default-devtools.timeline.frame",
    "v8.execute",
    "disabled-by-default-v8.gc",
    "gpu",
    "gpu.dawn",
    "disabled-by-default-gpu.dawn",
    "gpu.service",
    "viz",
    "cc",
    "loading",
    "net",
    "netlog",
    "disabled-by-default-v8.cpu_profiler",
  ],
});
await page.evaluate(([lon, lat]) => {
  const e = globalThis.engine;
  void e;
  const rad = Math.PI / 180;
  const a = 6378137;
  const e2 = 6.69437999014e-3;
  const sl = Math.sin(lat * rad);
  const n = a / Math.sqrt(1 - e2 * sl * sl);
  const p = new Float64Array([
    n * Math.cos(lat * rad) * Math.cos(lon * rad),
    n * Math.cos(lat * rad) * Math.sin(lon * rad),
    n * (1 - e2) * sl,
  ]);
  globalThis.controller.focus(p, 200 * rad, -25 * rad, 1200);
}, to);
await page.waitForTimeout(6000);
const traceBuffer = await browser.stopTracing();
const slow = await page.evaluate(() => globalThis.__slow);
await browser.close();
await server.close();

const out =
  process.env.TRACE_OUT ??
  join(tmpdir(), `cesium-next-trace-${Date.now()}.json`);
writeFileSync(out, traceBuffer);
console.log(`trace: ${out} (${(traceBuffer.length / 1e6).toFixed(1)} MB)`);
console.log(
  `slow frames (page clock): ${slow.map((s) => Math.round(s.gap)).join(", ") || "none"}`,
);

// ---------------------------------------------------------------- analysis
const trace = JSON.parse(traceBuffer.toString());
const events = trace.traceEvents ?? trace;
const threadNames = new Map();
const processNames = new Map();
for (const ev of events) {
  if (ev.ph === "M" && ev.name === "thread_name") {
    threadNames.set(`${ev.pid}:${ev.tid}`, ev.args.name);
  }
  if (ev.ph === "M" && ev.name === "process_name") {
    processNames.set(ev.pid, ev.args.name);
  }
}
const label = (ev) =>
  `${processNames.get(ev.pid) ?? ev.pid}/${threadNames.get(`${ev.pid}:${ev.tid}`) ?? ev.tid}`;
const marks = events
  .filter((ev) => ev.name?.startsWith("slow-frame "))
  .map((ev) => ({ end: ev.ts, gap: Number(ev.name.split(" ")[1]) * 1000 }));
// Complete events ('X'), and begin/end pairs ('B'/'E') folded into them.
const complete = events.filter((ev) => ev.ph === "X" && ev.dur);
const open = new Map();
for (const ev of events) {
  const key = `${ev.pid}:${ev.tid}:${ev.name}`;
  if (ev.ph === "B") {
    open.set(key, ev);
  } else if (ev.ph === "E" && open.has(key)) {
    const b = open.get(key);
    open.delete(key);
    complete.push({ ...b, ph: "X", dur: ev.ts - b.ts });
  }
}
for (const mark of marks) {
  const start = mark.end - mark.gap;
  console.log(
    `\n== slow frame ${(mark.gap / 1000).toFixed(0)} ms (trace ${(start / 1000).toFixed(1)}..${(mark.end / 1000).toFixed(1)} ms)`,
  );
  // Busiest events overlapping the frame, per thread: time inside it.
  const perThread = new Map();
  for (const ev of complete) {
    const s = Math.max(ev.ts, start);
    const e = Math.min(ev.ts + ev.dur, mark.end);
    if (e - s < 2000) {
      continue; // under 2 ms inside the frame
    }
    const key = label(ev);
    const list = perThread.get(key) ?? [];
    list.push({
      name: ev.name,
      cat: ev.cat,
      inside: (e - s) / 1000,
      dur: ev.dur / 1000,
    });
    perThread.set(key, list);
  }
  const rows = [...perThread.entries()]
    .map(([thread, list]) => ({
      thread,
      top: list.sort((a, b) => b.inside - a.inside).slice(0, 4),
    }))
    .sort((a, b) => b.top[0].inside - a.top[0].inside)
    .slice(0, 8);
  for (const { thread, top } of rows) {
    console.log(`  ${thread}`);
    for (const t of top) {
      console.log(
        `    ${t.inside.toFixed(1).padStart(6)} ms in frame (${t.dur.toFixed(1)} ms total)  ${t.name}  [${t.cat}]`,
      );
    }
  }
}

// ---------------------------------------------------------------- JS profile
// V8 samples (ProfileChunk events): self time per function inside the slow
// frames, on the page's main thread.
const nodes = new Map();
const samples = [];
const profiles = new Map(); // id -> { pid, tid, time }
for (const ev of events) {
  if (ev.name === "Profile") {
    profiles.set(ev.id, {
      pid: ev.pid,
      tid: ev.tid,
      time: ev.args.data.startTime,
    });
  }
}
for (const ev of events) {
  if (ev.name !== "ProfileChunk") {
    continue;
  }
  const profile = profiles.get(ev.id);
  if (!profile) {
    continue;
  }
  const data = ev.args.data;
  for (const node of data.cpuProfile?.nodes ?? []) {
    nodes.set(`${ev.id}:${node.id}`, node);
  }
  const ids = data.cpuProfile?.samples ?? [];
  const deltas = data.timeDeltas ?? [];
  for (let i = 0; i < ids.length; i++) {
    profile.time += deltas[i] ?? 0;
    samples.push({
      thread: label(profile),
      node: `${ev.id}:${ids[i]}`,
      ts: profile.time,
    });
  }
}
const inSlow = (ts) => marks.some((m) => ts >= m.end - m.gap && ts <= m.end);
const self = new Map();
let total = 0;
for (const sample of samples) {
  if (!/CrRendererMain/.test(sample.thread) || !inSlow(sample.ts)) {
    continue;
  }
  const node = nodes.get(sample.node);
  const frame = node?.callFrame;
  if (
    !frame ||
    frame.functionName === "(idle)" ||
    frame.functionName === "(program)"
  ) {
    continue;
  }
  const where = `${frame.functionName || "(anonymous)"}  ${(frame.url ?? "").replace(/^.*\/(src|viewer|node_modules)\//, "$1/")}:${frame.lineNumber + 1}`;
  self.set(where, (self.get(where) ?? 0) + 1);
  total++;
}
console.log(`
== main-thread JS samples inside slow frames: ${total}`);
for (const [where, n] of [...self.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)) {
  console.log(
    `  ${((n / Math.max(total, 1)) * 100).toFixed(1).padStart(5)}%  ${where}`,
  );
}
