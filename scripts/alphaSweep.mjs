// Sweeps the error exponent (`View.lodExponent`, `&alpha=`) on the vertical
// exaggeration example, headless in Edge, one page at a time. Per run: terrain
// tiles and triangles, requests by kind, time to settle, GPU time per pass
// (median and 90th percentile over settled ticks) and a screenshot. Pixels are
// compared with the alpha = 1 screenshot of the same factor and view. A second
// pass per factor and view loads the page with `&probe=sse` and keeps the
// largest first-order stretched error (pixels) among the drawn terrain tiles.
//
//   node scripts/alphaSweep.mjs [--out <dir>] [--port 5197] [--ticks 120]
//     [--alphas 0,0.25,0.5,0.75,1] [--factors 1,4,10] [--views valley,zermatt-close]
//     [--repeat 1] [--repeat-set x10:zermatt-close:0.5,1 --repeats 3] [--no-probe]
//
// The dev server (with the ion token in .env.local, development only) must be
// running. Nothing is logged with a URL: requests are counted by host and path
// kind. Output: results.csv and the screenshots, in --out.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const out = opt("out", "alpha-sweep");
const port = opt("port", "5197");
const ticks = Number(opt("ticks", 120));
const alphas = opt("alphas", "0,0.25,0.5,0.75,1").split(",").map(Number);
const factors = opt("factors", "1,4,10").split(",").map(Number);
const views = opt("views", "valley,zermatt-close").split(",");
const repeatFactor = Number(opt("repeat-factor", 10));
const repeatView = opt("repeat-view", "zermatt-close");
const repeatAlphas = opt("repeat-alphas", "0.5,1").split(",").map(Number);
const extraReps = Number(opt("repeats", 3));
const SETTLE_CAP_MS = 120_000;
const HOLD_MS = 3000;
mkdirSync(out, { recursive: true });

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN;
};
const p90 = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length
    ? s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)]
    : NaN;
};

async function launch() {
  return chromium.launch({
    headless: true,
    channel: process.env.BENCH_CHANNEL ?? "msedge",
    args: [
      "--enable-unsafe-webgpu",
      "--enable-webgpu-developer-features",
      "--force_high_performance_gpu",
    ],
  });
}

const urlFor = (factor, view, alpha, extra = "") =>
  `http://127.0.0.1:${port}/#/examples/vertical-exaggeration?x=${factor}&alpha=${alpha}${view === "valley" ? "" : `&view=${view}`}${extra}`;

/** Requests by host and path kind; never the URL itself. */
function classify(url) {
  const u = new URL(url);
  if (u.host.endsWith("virtualearth.net")) {
    return "imagery";
  }
  if (u.host === "assets.ion.cesium.com") {
    return "ion_content";
  }
  if (u.host === "api.cesium.com") {
    return "ion_endpoint";
  }
  if (u.host.startsWith("127.0.0.1")) {
    return "local";
  }
  return "other";
}

async function runOnce({ factor, view, alpha, rep, shot }) {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 1,
    });
    const net = { imagery: 0, ion_content: 0, ion_endpoint: 0, other: 0 };
    page.on("request", (r) => {
      const k = classify(r.url());
      if (k !== "local") {
        net[k]++;
      }
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
    const t0 = Date.now();
    await page.goto(urlFor(factor, view, alpha));
    // Settled: nothing in flight or waiting in either tileset, the chip gone,
    // and the same triangle count for HOLD_MS.
    let lastKey = "";
    let stableSince = 0;
    let settleMs = NaN;
    let settled = false;
    while (Date.now() - t0 < SETTLE_CAP_MS) {
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => {
        const c = globalThis.__cesium;
        if (!c?.engine || c.tilesets.length < 2) {
          return undefined;
        }
        const busy = c.tilesets.some(
          (t) => t.stats.inFlight + t.stats.uploadQueue + t.stats.loading > 0,
        );
        const chip = document.querySelector(".vex-refining");
        return {
          busy,
          chip: chip ? !chip.hidden : false,
          tri: c.engine.stats.triangles,
          terrain: [...c.tilesets[1].stats.selected.values()].reduce(
            (a, b) => a + b,
            0,
          ),
        };
      });
      if (!s || s.busy || s.chip || s.tri === 0) {
        lastKey = "";
        continue;
      }
      const key = `${s.tri}/${s.terrain}`;
      if (key !== lastKey) {
        lastKey = key;
        stableSince = Date.now();
      } else if (Date.now() - stableSince >= HOLD_MS) {
        settleMs = stableSince - t0;
        settled = true;
        break;
      }
    }
    const state = await page.evaluate(() => {
      const c = globalThis.__cesium;
      const [osm, globe] = c.tilesets;
      return {
        tri: c.engine.stats.triangles,
        terrainTiles: [...globe.stats.selected.values()].reduce(
          (a, b) => a + b,
          0,
        ),
        osmTiles: [...osm.stats.selected.values()].reduce((a, b) => a + b, 0),
        globeReq: globe.stats.requestsTotal,
        osmReq: osm.stats.requestsTotal,
        alpha: c.engine.views[0].lodExponent,
        draws: null,
      };
    });
    let file = "";
    if (shot) {
      // Only the canvas: the page's overlays and panels hold numbers that differ.
      await page.addStyleTag({
        content:
          "body *{visibility:hidden!important}canvas{visibility:visible!important}",
      });
      const box = await page.evaluate(() => {
        const r = document.querySelector("canvas").getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      file = `x${factor}-${view}-a${alpha}${rep > 1 ? `-r${rep}` : ""}.png`;
      await page.screenshot({ path: join(out, file), clip: box });
    }
    // GPU time: keep rendering and take each new timed sample (they arrive a few ticks late).
    const gpu = await page
      .evaluate(
        (want) =>
          new Promise((resolve, reject) => {
            const e = globalThis.__cesium.engine;
            const samples = [];
            let seen = e.gpuSample.samples;
            e.renderMode = "continuous";
            const timer = setTimeout(() => {
              e.renderMode = "onDemand";
              reject(new Error(`only ${samples.length} gpu samples`));
            }, 60_000);
            e.onAfterTick(() => {
              const g = e.gpuSample;
              if (g.samples !== seen) {
                seen = g.samples;
                samples.push({ ms: g.ms, passes: { ...g.passes } });
                if (samples.length === want) {
                  clearTimeout(timer);
                  e.renderMode = "onDemand";
                  resolve(samples);
                }
              }
            });
          }),
        ticks,
      )
      .catch((error) => ({ error: String(error) }));
    // Terrain alone: the buildings tileset hidden for a moment.
    state.terrainOnlyTri = await page.evaluate(async () => {
      const c = globalThis.__cesium;
      c.tilesets[0].show = false;
      c.engine.requestRender();
      await new Promise((r) => setTimeout(r, 1500));
      const tri = c.engine.stats.triangles;
      c.tilesets[0].show = true;
      return tri;
    });
    return {
      state,
      settled,
      settleMs,
      net,
      gpu,
      file,
      errors,
      wallMs: Date.now() - t0,
    };
  } finally {
    await browser.close();
  }
}

/** `&probe=sse`: the drawn terrain tiles' first-order stretched error, pixels. */
async function probeError({ factor, view, alpha }) {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 1,
    });
    let text;
    page.on("console", (m) => {
      if (m.text().startsWith("[probe]") && m.text().includes("csv")) {
        text = m.text();
      }
    });
    await page.goto(urlFor(factor, view, alpha, "&probe=sse"));
    const t0 = Date.now();
    while (text === undefined && Date.now() - t0 < SETTLE_CAP_MS) {
      await page.waitForTimeout(500);
    }
    if (!text) {
      return undefined;
    }
    const lines = text.split("\n");
    const summary = JSON.parse(lines[0].slice("[probe] ".length));
    const header = lines[2].split(",");
    const col = header.indexOf("sseExact");
    const exact = lines
      .slice(3)
      .map((l) => Number(l.split(",")[col]))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    return {
      threshold: summary.threshold,
      tiles: exact.length,
      max: exact.at(-1) ?? NaN,
      p99: exact[Math.floor(0.99 * (exact.length - 1))] ?? NaN,
      over: exact.filter((v) => v > summary.threshold).length,
    };
  } finally {
    await browser.close();
  }
}

/** Share of pixels whose linear luminance differs by more than 0.1, and the mean absolute difference. */
async function compare(fileA, fileB) {
  const read = async (f) => {
    const { data, info } = await sharp(join(out, f))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const n = info.width * info.height;
    const lum = new Float32Array(n);
    const lin = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    for (let i = 0; i < n; i++) {
      lum[i] =
        0.2126 * lin(data[3 * i]) +
        0.7152 * lin(data[3 * i + 1]) +
        0.0722 * lin(data[3 * i + 2]);
    }
    return lum;
  };
  const a = await read(fileA);
  const b = await read(fileB);
  if (a.length !== b.length) {
    return { share: NaN, mean: NaN };
  }
  let over = 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    sum += d;
    if (d > 0.1) {
      over++;
    }
  }
  return { share: over / a.length, mean: sum / a.length };
}

// ------------------------------------------------------------------- the grid
const jobs = [];
for (const view of views) {
  for (const factor of factors) {
    // Factor 1: no effect by design; the baseline is run at every alpha to show it.
    for (const alpha of alphas) {
      jobs.push({ factor, view, alpha, rep: 1 });
    }
  }
}
for (let rep = 2; rep <= extraReps; rep++) {
  for (const alpha of repeatAlphas) {
    jobs.push({ factor: repeatFactor, view: repeatView, alpha, rep });
  }
}

console.log("warm-up (discarded)");
await runOnce({ factor: 4, view: "valley", alpha: 1, rep: 0, shot: false });

const rows = [];
const passNames = new Set();
for (const job of jobs) {
  const r = await runOnce({ ...job, shot: true });
  const row = { ...job, ...r };
  if (!r.gpu.error) {
    row.gpuTotalMedian = median(r.gpu.map((s) => s.ms));
    row.gpuTotalP90 = p90(r.gpu.map((s) => s.ms));
    const names = new Set(r.gpu.flatMap((s) => Object.keys(s.passes)));
    row.pass = {};
    for (const n of names) {
      const v = r.gpu.map((s) => s.passes[n] ?? 0);
      row.pass[n] = { median: median(v), p90: p90(v) };
      passNames.add(n);
    }
  }
  rows.push(row);
  console.log(
    `x${job.factor} ${job.view} a${job.alpha} r${job.rep}: terrain ${r.state.terrainTiles}, tri ${r.state.tri}, settle ${(r.settleMs / 1000).toFixed(1)} s${r.settled ? "" : " (NOT SETTLED)"}, gpu ${row.gpuTotalMedian?.toFixed(2)} ms`,
  );
}

if (!flag("no-probe")) {
  for (const view of views) {
    for (const factor of factors.filter((f) => f > 1)) {
      for (const alpha of alphas) {
        const probe = await probeError({ factor, view, alpha });
        const row = rows.find(
          (r) =>
            r.factor === factor &&
            r.view === view &&
            r.alpha === alpha &&
            r.rep === 1,
        );
        if (row) {
          row.probe = probe;
        }
        console.log(`probe x${factor} ${view} a${alpha}:`, probe);
      }
    }
  }
}

// -------------------------------------------------------------------- the CSV
const passes = [...passNames].sort();
const header = [
  "view",
  "factor",
  "alpha",
  "rep",
  "settled",
  "settle_s",
  "terrain_tiles",
  "osm_tiles",
  "triangles",
  "terrain_only_triangles",
  "engine_alpha",
  "terrain_requests_stat",
  "osm_requests_stat",
  "net_imagery",
  "net_ion_content",
  "net_ion_endpoint",
  "net_other",
  "px_over_0.1_vs_a1",
  "px_mean_abs_diff_vs_a1",
  "err_max_px",
  "err_p99_px",
  "err_tiles_over_threshold",
  "err_threshold_px",
  "gpu_samples",
  "gpu_total_median_ms",
  "gpu_total_p90_ms",
  ...passes.flatMap((p) => [`gpu_${p}_median_ms`, `gpu_${p}_p90_ms`]),
  "screenshot",
  "page_errors",
];
const lines = [header.join(",")];
for (const row of rows) {
  const ref = rows.find(
    (r) =>
      r.factor === row.factor &&
      r.view === row.view &&
      r.alpha === 1 &&
      r.rep === 1,
  );
  const diff = ref
    ? await compare(ref.file, row.file)
    : { share: NaN, mean: NaN };
  const f = (v, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : "");
  lines.push(
    [
      row.view,
      row.factor,
      row.alpha,
      row.rep,
      row.settled,
      f(row.settleMs / 1000, 1),
      row.state.terrainTiles,
      row.state.osmTiles,
      row.state.tri,
      row.state.terrainOnlyTri,
      row.state.alpha,
      row.state.globeReq,
      row.state.osmReq,
      row.net.imagery,
      row.net.ion_content,
      row.net.ion_endpoint,
      row.net.other,
      f(diff.share, 5),
      f(diff.mean, 6),
      f(row.probe?.max, 3),
      f(row.probe?.p99, 3),
      row.probe?.over ?? "",
      f(row.probe?.threshold, 2),
      row.gpu.error ? 0 : row.gpu.length,
      f(row.gpuTotalMedian),
      f(row.gpuTotalP90),
      ...passes.flatMap((p) => [
        f(row.pass?.[p]?.median),
        f(row.pass?.[p]?.p90),
      ]),
      row.file,
      row.errors.length,
    ].join(","),
  );
}
writeFileSync(join(out, "results.csv"), `${lines.join("\n")}\n`);
console.log(`wrote ${join(out, "results.csv")}`);
