# Sandcastle perf regression check

Runs existing Sandcastle gallery demos (no custom assets) against two
deployed CesiumJS builds and diffs load time. Built for comparing
`wasm-main-thread` vs `main`, but the hosts are just constants in the file.

## Run

```sh
node Tools/perf-regression/sandcastle-perf.mjs
node Tools/perf-regression/sandcastle-perf.mjs --demo 3d-models --demo 3d-tiles-point-cloud
node Tools/perf-regression/sandcastle-perf.mjs --reps 3
node Tools/perf-regression/sandcastle-perf.mjs --self-test
node Tools/perf-regression/sandcastle-perf.mjs --headless   # readyMs only; see below
```

**Runs headed (a visible Chromium window) by default.** This is required for
the long-task metric to mean anything - see "Long tasks need headed
Chromium" below. `--headless` is available but its `longTaskMs` output
should not be trusted.

## Methodology

- **Cold cache every run** - each sample gets its own `browser.newContext()`
  (isolated HTTP cache/storage partition), not a shared page/context. Earlier
  version reused one context across all runs and silently let one demo's
  cache warm the next.
- **ABBA host order** - default 5 reps per demo (`--reps N`), alternating
  which host goes first each rep, so warmup/thermal/network drift over the
  run hits both hosts evenly instead of always favoring one.
- **Median, not single sample** - reports median with min-max spread per
  host. Single-run numbers on these live, real-network demos vary too much
  (seen one demo swing 4s-32s across identical reps) to trust one sample.

## How timing works

**Ready signal, not network idle, and event-driven, not polled.** An
`addInitScript` runs in the Sandcastle "bucket" iframe before any demo code,
intercepting the `window.Cesium = Cesium` assignment Sandcastle makes at end
of module load (see `packages/sandcastle/src/Helpers.ts`) to patch
`Cesium3DTileset.prototype.update` / `Model.prototype.update`. Every
tileset/model instance the demo creates gets registered, and a one-shot
listener attaches to its own native ready event:

- `Cesium3DTileset` -> `tileset.initialTilesLoaded` (fires exactly once,
  when the tileset's initial required tiles have all resolved -
  `Cesium3DTileset.js`). We originally polled `tilesLoaded &&
numberOfTilesWithContentReady > 0` instead, but `tilesLoaded` is a
  per-frame "nothing in flight this frame" flag that can flicker
  true/false across a request-batch boundary, and `numberOfTilesWithContentReady`
  is a cumulative resident-tile counter, not a "this frame's view" gate.
  `initialTilesLoaded` is debounce-free by construction.
- `Model` -> `model.readyEvent`, but **only for top-level models**
  (`!model.content`). Every b3dm/glTF/pnts tile streamed by a
  `Cesium3DTileset` is itself rendered through a `Model` instance
  (`Model3DTileContent`), so an unfiltered patch requires every resident
  tile's model to be ready - i.e. "the whole tile cache is warm," not "the
  initial view is up." (Confirmed on `google-photorealistic-3d-tiles`: 790
  per-tile models vs. 0 top-level ones.)

When every currently-registered instance's ready event has fired, the page
calls `window.__reportReady()` (a Playwright `context.exposeFunction`)
exactly once. `readyMs` is Node's own clock from just before `page.goto` to
that single callback.

We originally had Node poll a `window.__cesiumPerfReady()` predicate every
200ms via `frame.evaluate`, requiring two consecutive `true` reads to filter
flicker. An independent review found that round-trip itself perturbs the
main thread it's measuring - it inflated `readyMs` up to 2.4x on faster
demos, and measurably fragmented long tasks recorded in the next metric.
Switching to a one-shot, event-driven callback removes that self-inflicted
noise entirely.

We switched away from `page.waitForLoadState("networkidle")` even earlier,
after a first independent review (prompted by "I don't feel this regression
when I navigate manually") found `networkidle` was measuring noise, not
load time: for tile-streaming demos, request gaps are bimodally
distributed, and whether a ~500ms gap happens to fall short of or over the
idle threshold flips the reported duration by 5-10x. It also wasn't
excludable-by-demo the way we first assumed - `3d-tiles-point-cloud` and
`google-photorealistic-3d-tiles` both reach genuine network idle, but
`networkidle` on `3d-tiles-point-cloud` was mostly timing unrelated globe
terrain/imagery streaming (`Terrain.fromWorldTerrain()`), not the tileset
under test.

**Main-thread long tasks**, over a fixed post-navigation window
(`LONGTASK_WINDOW_MS`, 20s), summed via `PerformanceObserver({entryTypes:
["longtask"]})`. This is the metric that actually corresponds to what the
wasm-worker branch changes (work moving off the main thread). The window is
now unconditionally fixed - the script always waits out the full window
from navigation start regardless of when (or whether) the ready signal
fires, and still reports `longTaskMs` even on a `readyMs` timeout, since a
run that finishes "ready" early must not get to accumulate less window than
one that runs long or never resolves.

### Long tasks need headed Chromium

Headless Chromium (`chromium.launch()`'s default) has no GPU and falls back
to SwiftShader - CPU software WebGL rendering. Combined with Cesium's
default continuous render loop (`requestRenderMode: false`, which every
gallery demo uses), that makes _every animation frame_ a long task
regardless of actual work. Measured: `longTaskMs` in headless mode sat at
~17.3-17.7s (near the full 20s window) across five demos with wildly
different actual workloads - a ~2% spread, i.e. no signal at all. The same
demos in headed mode showed real, demo-differentiating numbers 50-130x
lower (in the hundreds of ms, not tens of seconds). **The script now
launches headed by default.** `--headless` is available for CI/display-less
environments, but treat its `longTaskMs` output as meaningless noise -
`readyMs` is unaffected either way.

`3d-tiles-gaussian-splatting` continuously refines splat tiles forever, but
that's fine here - `initialTilesLoaded` is a one-shot "initial view is up"
signal, not a "nothing left to ever load" check, so it's in `DEFAULT_DEMOS`.

### Sample counts

Each metric line reports `n=<used>/<total>` per host - e.g. `n=4/5` means
one of 5 reps didn't produce a value for that metric (typically a `readyMs`
timeout on an otherwise-successful run, which still contributes a
`longTaskMs` sample). Watch for `n` mismatches between hosts before trusting
a delta.

One demo gets a small pre-measurement nudge:

- `3d-models` defaults to its first toolbar option ("Aircraft" - a plain,
  uncompressed glTF), which never exercises the Draco/KTX2 decode path this
  benchmark exists to check. Its toolbar is a real `<select>`, so the script
  drives it to "Draco Compressed Model" via `selectOption` right after
  navigation, before timing.

One demo remains opt-in only (`--demo <id>`), not in the default sweep:

- `3d-tiles-performance-testing-dev` - has its own scripted camera tour +
  built-in timer (parsed from its console output), but streams a live Ion
  asset with no cache/throttle control, so timing varies too much run-to-run
  for a quick check (single demo, `~40s`-`~5min` per run).
