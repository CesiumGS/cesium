# Benchmark suite (design)

**What this holds:** The benchmark suite's design (concepts, manifests and storage, measurement and statistics, the catalog, interfaces, engines and versions, scope, later), with what v1 built and the findings it raised. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Purpose.** Measure 1.x and 2.0 on the same scenes, repeatably, to
guide product decisions and engineering tradeoffs as the engine grows,
and catch regressions. Rendering and runtime only for now: streaming,
selection, CPU and GPU time, memory, interaction. Tiling is out of scope
here, but the schema leaves room for it (dataset lineage, "Manifests and storage" above), since
the 2.0 tiler will shape runtime performance.

**What exists (r29).** `bench/run.mjs` (Playwright, Edge, one JSON file
per run, `BENCH_COMMIT` snapshots for bisecting), synthetic 1.x vs 2.0
baselines (`baseline`), first frame, allocation gate (`alloc`), live-world
hitches (`hitch`), L1′ quality over time with a throttled link (`lod`),
Chrome traces of slow frames (`trace.mjs`), and parity suites. Private
assets already stay out of the repo through environment variables
(`ION_ASSET`, `IMODEL`). The suite generalizes these instead of
replacing them.

## Concepts

- **Dataset**: one piece of content (3D Tiles, glTF, terrain, imagery,
  point cloud, splats, vector tiles), where it lives, its license, size
  and checksums.
- **Scene**: datasets placed together, with globe, imagery, lighting,
  canvas size and per-engine settings matched for equal quality.
- **Scenario**: what happens in a scene: a camera script (recorded
  flythrough, orbit, jump into an uncached area), interactions (pick
  bursts, content added and removed, moving clamped entities, split
  views), cache state (cold or warm), network profile, duration and settle
  rule.
- **Engine adapter**: one interface per engine and version: `load(scene)`,
  `setCamera(pose)`, `frame()`, `settle()`, `metrics()`, `dispose()`.
  Adapters for 1.x (this repo's build or a pinned release) and 2.0 first;
  native runtimes, other web engines or a 2.0 in a worker are more
  adapters, not a new suite.
- **Run**: scenario × engine × environment × repetition, with its
  results and the fingerprint of everything that produced them.

Camera scripts are engine-neutral: time-stamped float64 Earth-fixed poses
and field of view, recorded in either engine and replayed in both.

## Manifests and storage

- **Public manifest in the repo** (`bench/catalog/public.json`): public
  datasets ("Catalog (initial)" above) with URLs or ion asset IDs from 1.x's public
  Sandcastles, licenses, sizes and checksums, and the scenes and
  scenarios built on them.
- **Private manifests outside the repo**, same schema, found through
  `BENCH_MANIFEST` (a path, or a Bentley-internal repository): private
  ion assets, iTwin exports, internal file shares and large CAD models.
  Private datasets carry an alias (`cad-plant-01`) that is all that
  appears in results, so reports can be shared without names, IDs or
  paths. Tokens and share keys never go in manifests; they come from the
  environment (`.env.local`), as today.
- **Content-addressed local store** (a configurable directory, outside
  the repo): files stored by SHA-256, each dataset pinned by the hash of
  its sorted file list (a Merkle root). `bench fetch` downloads and
  verifies; `bench verify` re-checks before a run; a run refuses a
  dataset whose root changed. A local server serves the store, so runs
  don't depend on remote networks, and network profiles shape that
  server instead of the internet.
- **Remote-only content** (Google Photorealistic 3D Tiles, ion streaming
  where terms don't allow mirroring) runs live: the scenario records that,
  and results carry the measured network conditions so they are compared
  with care. Mirror only what the license allows.
- **Lineage** (for later): a dataset may record its source and how it was
  derived (tiler, version, settings), so tiler changes become comparable
  runs of the same source.
- **Licensing (required for every dataset).** Each catalog entry carries a
  reviewed license (name, status, where it was checked); the loader refuses
  entries without one. The public catalog holds only data whose license is
  compatible with CesiumJS's Apache-2.0 license ("redistributable": public
  domain, CC0, CC BY, Apache, MIT...) or references streamed from a provider
  under its terms and never copied ("stream-only": Cesium ion sample assets,
  Google 3D Tiles). A private manifest holds only data cleared for
  commercial use at Bentley ("commercial-ok", redistributable data, or
  stream-only through Bentley's own account). Non-commercial and
  unreviewed licenses are excluded from both; only redistributable data is
  mirrored. Cesium's sample assets (through 1.x's default token) and
  Google Photorealistic 3D Tiles are cleared for internal Bentley
  benchmarking; Cesium can adjust its own assets' terms as needed.
  Publishing results is not cleared: results stay internal (outside the
  repo) until it is.
- **Synthetic datasets** come from deterministic generators (draw count,
  instances, materials, textures, feature counts, a seed), checksummed
  by generator version and parameters; nothing to download.

Later: a proper asset store (versioned object storage with access
control, a registry service, dataset cards with previews) behind the same
manifest schema.

## Measurement and statistics

- **Metrics**: frame time distribution (p50/p95/p99, frames over 2 and 3
  vsyncs), main-thread CPU per frame, GPU time (2.0: timestamp queries;
  1.x: `EXT_disjoint_timer_query_webgl2` where the browser exposes it,
  else frame time only), long animation frames, JS heap and GC, GPU
  memory (2.0's accounting; 1.x's statistics where available), requests
  and bytes, time to first frame, time to settle, quality over time
  against a settled reference (L1′ FLIP), API calls per frame, selected
  tiles and draws. Power and thermals later (laptops).
- **Fairness**: the same canvas size and pixel ratio, content and camera;
  1.x at its defaults and at settings matched to 2.0's settled quality
  (SSE, HDR off where 2.0's output is compared to 1.x's), both reported.
- **Repeatability**: verified datasets, pinned engine builds (commit or
  release), a fixed browser build and flags, warm-up runs, several
  repetitions with 1.x and 2.0 interleaved (cancels thermal drift and
  background noise), cooldowns, high-performance power settings. Medians
  with bootstrap confidence intervals; a difference is reported only when
  the intervals separate.
- **Environment fingerprint**: GPU adapter (vendor, architecture,
  description), CPU class, memory, OS, browser version and flags, display
  refresh rate, and the WebGPU limits and features in use. Driver
  versions come from the runner (OS tools), not the page.
- **Privacy of results**: results with machine identifiers stay in the
  results store, not the repo; the repo gets summaries by hardware class.
- **Controlled and recorded conditions** (built, r32):
  - recorded per run: GPU clocks, temperature, power, utilization and the
    driver's slowdown reasons (`nvidia-smi`), CPU speed relative to
    nominal and whole-machine utility (Windows counters), power source
    and plan, driver version, the browser's WebGPU adapter (features,
    limits, WGSL features) and WebGL renderer, and the full software
    stack;
  - controlled by the runner: each run starts within 3 °C of the idle GPU
    temperature (cooldown) and after the machine is quiet (CPU utility near
    its idle level), a wake lock keeps the machine and display awake for
    the whole run (no settings change), and configurations alternate;
  - reported: conditions per engine for every scene, flagged when true
    conditions differ: the GPU's temperature at the start (more than
    3 °C), its share of thermal slowdowns (more than 0.2), CPU speed (more
    than 10%) or how busy the machine was before the run (more than 10
    points); timelines of the whole run. GPU clock and power are shown but
    not compared: on power-managed GPUs they follow each engine's own load
    (the first full pass flagged every scene on clocks alone, r33).
  - thermal limits: the GPU's target temperature and slowdown threshold
    are recorded with the setup, and its thermal headroom (`nvidia-smi`
    T.Limit, °C below the throttle limit) with every sample; a run that
    throttled thermally, or came within 5 °C of the limit, is valid only
    with a warning.
  - render settings (r33), declared in the catalog and the same for every
    engine, with scene and configuration overrides; each run records what
    the engine actually used (drawing buffer, MSAA, HDR, FXAA, fog) and the
    report flags differences:
    - pixel ratio 1 by default (1.x's own default on high-DPI displays; 2.0's
      `CanvasTarget` takes a fixed `pixelRatio`, used by selection too), and
      `--dpr` / `--pixel-ratio device` for high-DPI runs;
    - 4× MSAA (2.0's only setting so far), no FXAA, no fog (2.0 has none
      yet; 1.x fog also lowers distant detail);
    - primitive outlines off (`CESIUM_primitive_outline`, drawn by 1.x by
      default on OSM Buildings; 2.0 parses but doesn't draw them yet:
      a parity item to build);
    - HDR: 2.0 tonemaps lit color and shows unlit color display-referred
      (r26); 1.x tonemaps everything when HDR is on, so it runs with HDR on,
      and off for scenes of mostly unlit content (imagery, photogrammetry,
      Google tiles). Mixed scenes (lit buildings on imagery) can't match
      exactly in 1.x;
    - the globe's color without imagery: 2.0's gray (0.62, 0.62, 0.6) in
      both (1.x's default is blue; it dominated image parity, FLIP 0.83 on
      the BIM scene);
    - a fixed sun (elevation 40°, azimuth 150° over the start of the camera
      path), a directional light in both engines; 1.x otherwise follows the
      wall clock, 2.0 had a placeholder.
    - Still different: 1.x lights 3D Tiles with an environment map built
      from its atmosphere (and pays for it each frame); 2.0 has its own
      sky-colored IBL until M4's atmosphere. Lit scenes (OSM buildings)
      look brighter and bluer in 2.0 for that reason, not styling (no style
      is applied in either; the styling language is M6).
  - vsync: the default scenarios run twice, with vsync (the experience:
    missed vsyncs, stutter) and uncapped (`uncapped-orbit`: Chromium
    without vsync or a frame-rate limit, in a second browser), where frame
    time is the frame's real cost. Vsync hides everything under 16.7 ms
    and 1.x has no GPU timer queries in Chromium, so uncapped frame time
    is the only view of 1.x's GPU-bound cost.
  - Locking clocks and power states needs administrator rights and
    changes machine settings, so a person applies them, once per runner
    machine, and the suite records the state: GPU clocks locked
    (`nvidia-smi -lgc`, where the driver allows it; laptops often don't),
    CPU minimum and maximum processor state at 100% in a high-performance
    power plan, the driver's "prefer maximum performance", dynamic power
    sharing (laptop Dynamic Boost) off where possible, AC power, a fixed
    display refresh, background work (updates, indexing, scans) paused.
    Dedicated runner machines (v2) are configured this way once.
  - Not corrected: timings are not scaled by clock (the relation isn't
    linear); runs under different conditions are flagged or rerun.
- **Diagnostics on demand**: a run that regresses can be rerun with
  Chrome tracing and V8 sampling (`trace.mjs`), and the trace is attached
  to the result.

## Catalog (initial)

Three groups. Public datasets are verified for license before they enter
the public manifest; anything that needs conversion (IFC, PLY, LAS) waits
for the tiling part of the suite, or is converted once outside the suite
and pinned as a derived dataset with its lineage.

**A. What Cesium has always been used for** (1.x strengths; public ion
assets from 1.x's Sandcastles): Cesium World Terrain with Bing imagery;
Cesium OSM Buildings; Google Photorealistic 3D Tiles; photogrammetry
(Sandcastle "3D Tiles Photogrammetry", Melbourne, Aerometrex San
Francisco); New York City buildings; the BIM design model and AEC samples;
Japan Buildings (PLATEAU, 200+ cities in one tileset) with Japan regional
terrain; the Montreal point cloud (about 10 billion points); Gaussian
splats with LOD; vector 3D Tiles and global rivers; the CDB Yemen tileset;
Maxar's One World Terrain globe; Mars and the Moon.

**B. Large public datasets** (open data, mirrored where licenses allow):
PLATEAU per-city 3D Tiles (terms allow commercial use; to be confirmed as
compatible with redistribution before mirroring); USGS 3DEP lidar (public
domain, tens of trillions of points as EPT and COPC; a source for
point-cloud tiling later); the Netherlands' AHN lidar (license to review);
classic rendering scenes (Amazon Lumberyard Bistro, CC BY 4.0; Sponza,
license varies by version, to review) and Khronos glTF samples (each
model's own license; the Cesium milk truck is CC BY 4.0); buildingSMART
and BIMData IFC samples (per-file licenses, to review). Excluded by the
licensing rule: the UNC Power Plant (non-commercial) and Disney's Moana
Island (custom license restricting use) unless a review clears them. Bentley's iTwin sample iModels (Bay
Town Process Plant, the Philadelphia metro station, a stadium) are public
templates created per account, so they are listed through private
manifests by alias.

**C. Where 2.0's architecture should win** (mostly private manifests and
generators):

- very large CAD as 3D Tiles 2.0 on glTF 2.1 with instancing: process
  plants and an offshore platform from Bentley data (no large open plant
  or offshore model was found; private manifests);
- many instances: a forest, power-line poles, street furniture through
  `EXT_mesh_gpu_instancing` (generator; 100,000 to millions of
  instances);
- several heavy tilesets at once: Google + OSM + CAD + terrain;
- multiple views of one world (split views, linked views);
- dynamic content: 10,000 to 100,000 moving, clamped tracks from a
  synthetic feed at 1-10 Hz ([real-time-tracks.md](real-time-tracks.md); instanced models until billboards
  exist);
- very large Gaussian splat datasets: 1.x struggles with them even with
  splat LOD (its sort and per-frame upload), where 2.0 sorts on the GPU
  in compute (M6, "Gaussian splats with GPU sort", which this group
  needs first). Sources: 1.x's splat Sandcastles (ion 4547222, the
  Microsoft Redmond campus with multiple LODs, the largest; ion 3667784,
  a power station, with its mesh twin 3443919; the iTwin Gaussian splats
  Sandcastle), public research captures (Mip-NeRF 360, Tanks and Temples;
  licenses to check), and large private captures by alias. Measures:
  sort time, frame time against splat count, and quality while moving;
- huge feature counts with picking and styling;
- content in and out of a live world over long sessions (hitches, memory
  stability);
- later: vector tiles and billboards at scale ([transforms-and-instancing.md](transforms-and-instancing.md)), path tracing
  ([ray-queries-and-path-tracing.md](ray-queries-and-path-tracing.md)).

## Interfaces: agents, scripts and people

Mostly agents and automation run the suite, so the command line and JSON
are the primary interface: `bench fetch | verify | run | report`, every
option a flag or a scenario file, machine-readable output, nonzero exit
on failed checks or detected regressions. People get the same
capabilities in a browser:

- **Runner UI**: pick a catalog (public, private when its manifest is
  present), scenes, scenarios, engines and commits; see dataset status
  (fetched, verified, size); run with live progress and a live view of
  each engine rendering side by side; stop, repeat, or rerun one
  scenario with tracing.
- **Results UI** over the results store:
  - _Comparison_: 2.0 against 1.x (or any two commits, engines or
    configurations) per scene and metric, with confidence intervals,
    frame-time distributions and timelines, and screenshots or short
    captures from both at the same moments (with FLIP heatmaps where
    quality is compared).
  - _Trends_: each metric over commits and time per scene and hardware
    class, change points marked, so slow drifts show up as well as
    step regressions; click a point to open that run.
  - _Experiment log_: every run with what changed (commit, branch,
    settings, flags, environment) and a note, so tuning experiments
    (an upload budget, a selection policy) are recorded and comparable
    later instead of living in chat logs.
  - _Drill-down_: a run's per-frame data, attached Chrome traces, and the
    exact manifests and hashes it used, to reproduce it.

**Experiment tracking (built, r32).** As ML experiment trackers manage
training runs, the results page treats every run as an experiment:
parameters (commit, branch, configurations, hardware and browser, catalog,
repetitions, tags, a note) and metrics (per scene and configuration, with
intervals). Its views:

- _Trends_: chosen metrics (toggle chips, remembered) for one scene or
  all scenes (geometric mean), per configuration, run to run and commit
  to commit, filtered by hardware.
- _Runs_: the experiment log, newest first, with headline ratios.
- _Compare_: two runs per scene for one configuration, as forest plots
  (the commit-to-commit regression view).
- _Report_: one run's full report.

The report itself is overview first, details on demand: verdict tiles
(geometric mean ratio across scenes and how many scenes were better,
worse or not distinguishable), a forest plot per headline metric, the
hardware conditions over the run, then each scene's frame timelines,
metrics and conditions (collapsed), and the setup. Charts follow the
data-viz method: one axis per chart, thin marks, engine identity in
validated categorical colors, better and worse in status colors with an
icon and a label, a table twin for every chart, crosshair readouts.

Next: notes and tags editable in the page (written back to the run),
saved views, change points marked on trends, filters by tag and branch,
a pinned baseline run, parameter columns in the log.

Both UIs are views over the same files and store, built as pages served
by the suite's local server (like the parity pages), with the plan's
dashboard work (v2) hosting the results UI for the team.

## Engines and versions

- **1.x**: this repository's build at a pinned commit, or a published
  release from npm (for history: how 1.x itself changed).
- **2.0**: any commit through the existing snapshot mechanism.
- **The same scenario, page and harness for both**: the adapter is the
  only engine-specific code, so a third engine or a variant (2.0 with a
  policy, a feature flag, engine-in-worker) is one more adapter or
  configuration.

**Released 1.x builds (built, r32).** A 1.x configuration runs this
repository's build or a released CesiumJS from npm, fetched once with
`npm pack` into the store outside the repo (`BENCH_CESIUM_DIR`), checked
against npm's integrity hash and served locally. Catalogs pin an exact
version (1.146.0 today), so a new release starts a new trend line
instead of silently changing an old one across a release window. The
default comparison is 2.0 against the pinned release.

**Engine names (r36).** One grammar everywhere (`bench/suite/engines.mjs`):
a release by its version (`1.146.0`; "1.x" always means "a CesiumJS 1
build", never a release), an engine from the working tree (`2.0`, `1.x`),
or one built at any git ref (`2.0@main`, `1.x@v1.140`), with settings
after `+` (`2.0+stepwise`, `2.0+sse=32`). Runs record the working tree
under its branch (`2.0@cesium-2.0-webgpu-poc`), so after a merge the same
engine continues as `2.0@main`, and a branch can be run against a release
and against main at once (`--engines 1.146.0,2.0@main,2.0`). Refs are
checked out once into snapshot worktrees (`.bench/<sha>`): 1.x is built
there on first use, 2.0 gets a dev server of its own. The catalog lists
setups (engine settings without a build: `1.x`, `2.0`, `2.0+stepwise`)
and the default engines, baseline and candidate; budgets name a setup and
apply to every build of it. People see readable names: "1.146.0",
"2.0 · main", "2.0 · cesium-2.0-webgpu-poc · stepwise selection".

**Historical sweeps.** `--releases 1.120.0..1.146.0` (or a list) adds one
pinned configuration per published release, to see how 1.x itself
changed release by release on the same scenes and hardware. The adapter
uses 1.x's asynchronous loading APIs (about 1.104 and later); older
releases need an older adapter variant and are reported as errors until
then.

**Engines on a new machine (r50).** The first run on a second machine
(a Mac) found the release store empty: only a benchmark run filled it,
so Dyno's Viewer listed 1.146.0 and 1.147.0 and failed to start either
("not found"), while the first-run check said "Ready" (the dev server
answers a missing file with the app's page, 200). Now:

- `npm run setup` (scripts/setup.mjs) builds
  this repository's 1.x if `Build/CesiumUnminified` is missing and
  fetches the catalog's default releases into the store. Neither is
  committed.
- The dev server fetches a release the first time a page loads it
  (GET only, so probes never download), and lists what it can serve at
  `/cesium-release/index.json`: the store's releases and npm's latest six
  stable ones. The Viewer offers those beside the catalog's, marking the
  ones that download on first use.
- The first-run check counts a file as present only when the answer
  isn't the app's page.

**Planned: engines at git refs from Dyno.** The CLI already builds any
ref (`1.x@v1.140`, `2.0@main`: snapshot worktrees in `.bench/<sha>`, 1.x
built there on first use, 2.0 on a dev server of its own). Dyno should
offer the same: type a branch, tag or commit in the engine picker, and
the dev server resolves it (`git rev-parse`, fetching the remote ref if
needed), checks it out into a snapshot worktree and builds it, with the
build's progress and log in the page; the engine then joins the
Viewer's and the Explorer's choices beside releases and the working
tree. Open: building a ref's 1.x takes minutes and a gigabyte, so the
store needs a size cap and an LRU (or a "remove" action), and 2.0 at a
ref needs its own dev server, which the Viewer would load in an iframe
or through a proxy path.

## Scope of v1 (milestone "Benchmark suite v1")

Schemas; public manifest; private manifest loader with aliases; local
store with fetch and verify; local content server with network profiles;
1.x and 2.0 adapters; 10-15 scenes; the report; a first runner page and
results page (comparison and trends over local results). Runs on one
machine, by hand or by script.

## Built (v1, r32)

`bench/suite/`:

- `schema.ts`: datasets (source, formats, reviewed license, checksum),
  scenes (globe, imagery, layers, camera script), scenarios (cold or warm
  cache, motion seconds, settle timeout), engine configurations, metrics.
- `catalog/public.json`: 19 public datasets and 15 scenes in groups A and
  C; `private.example.json` shows a private manifest (aliases, licenses,
  Bentley's own token).
- `manifest.mjs`: loads and merges catalogs, enforces the licensing rule,
  checks references, and reports engine gaps by format (2.0: point clouds,
  splats, vector; 1.x: the instancing generator for now). As 2.0 gains a
  format, its scenes start running there.
- `store.mjs`: Merkle checksums of local datasets, `verify`, and `fetch`
  for mirrored ones (content-addressed store outside the repo).
- `suite.html` / `suite.ts`: the page; 1.x and 2.0 adapters (setup,
  frame, settled, content drawn, camera); engine-neutral camera scripts
  (orbits from 1.x's heading-pitch-range convention, `frame` from the
  tileset's root volume); the scenario (load until settled, orbit, settle
  again) and its metrics. A person picks a scene and engine and presses
  Run.
- `cli.mjs`: `list`, `verify`, `fetch`, `run` (each run a fresh browser
  context; configurations rotate per repetition; requests and bytes from
  the browser, workers included), `report`. Results and reports go
  outside the repo (`BENCH_RESULTS`).
- `stats.mjs` (medians with bootstrap intervals, ratios that count only
  when the intervals separate) and `report.mjs` (a self-contained page per
  run).

Open for v1's exit: the results page with trends across runs, scenes for
group B (after license review), warm-cache and throttled scenarios in the
default set, the 1.x instancing generator, real-time tracks ([real-time-tracks.md](real-time-tracks.md)).

## Findings to work through (r33)

From the first full pass and the phase 1 verification runs, to be
addressed in 2.0 (each with a Dyno scene to show the fix):

- **`Budgeted` selection draws visibly differently from 1.x**, most
  apparent on Mount Rainier (terrain and imagery): in-between and settled
  views pick different levels than `Stepwise`. Wanted: a parity pass on
  `Budgeted` against a fully refined reference ([parity.md](parity.md) L1′) per scene, the
  explorer's paused streaming and the filmstrip's FLIP to find where it
  under-refines, and an image guardrail in the scorecard so a faster
  policy can't pass by drawing less. The explorer's selection view (r34)
  shows it directly: on the Rainier path at 30%, settled, 2.0 draws 20
  terrain tiles spanning levels 0 to 12 (six of them at levels 0 to 5)
  where 1.x draws 57 at levels 6 to 13, and only 4 tiles are the same.
  _Cause (r37)_: on terrain, `Budgeted` used 3D Tiles' dynamic SSE (up to
  24 pixels off distant tiles, density from the whole-globe root), which
  took mid-distance tiles below zero SSE at oblique views. 1.x's globe
  lowers the SSE only by fog (at most 2 pixels), and only while fog is
  drawn. `GlobeBudgetedSelection` uses the globe's term (off while 2.0
  draws no fog); settled at the same camera, 2.0 draws 68 tiles and 1.x
  67, all 67 shared, level for level.
- **Content under the globe is hidden** (r37, Aerometrex San Francisco):
  2.0 depth-tests every tile against the globe, so the photogrammetry's
  ground, about 30 m below the WGS84 ellipsoid there (geoid), draws under
  the ellipsoid and only the tall buildings show. 1.x clears depth after
  the globe unless `Globe.depthTestAgainstTerrain` is set (default off),
  so tiles always draw over it. _Decided (r37, [product-choices.md](../decisions/product-choices.md))_: real
  terrain occludes; the bare ellipsoid never does. Aerometrex now matches
  1.x.
- **Settle time on terrain scenes**: Rainier ×1.16 and OSM Philadelphia
  ×1.42 slower than 1.x. The waterfall shows 2.0 fetching 49 content tiles
  (18.7 MB) on OSM Philadelphia to 1.x's 31 (10.7 MB), and starting them
  later. _r37_: terrain loaded one level per round trip under `Budgeted`
  (expanded only once loaded); fixed, with parallel adapter setup: Rainier
  now settles ×0.74 of 1.x, OSM Philadelphia within noise. See the planned
  `Budgeted` work ([budgeted-selection-milestone.md](../history/budgeted-selection-milestone.md)), which now lists these findings first.
- **Bytes**: NYC buildings ×3.3 and OSM Philadelphia ×1.5 of 1.x; Japan
  ×1.3.
- **JS heap** above 1.x on terrain scenes and NYC (scorecard guardrail).
  _r39_: a measurement artifact ([budgeted-selection-milestone.md](../history/budgeted-selection-milestone.md), JS heap); 2.0 holds less JS heap than
  1.x everywhere measured, and 4 to 5 times its buffers.
- **Benchmarks take the GPU and stop development (r39).** A terrain
  comparison (3 scenes, 3 engines, 3 reps) took 26.5 minutes: 54 runs of
  about 26 s, 15 s of them motion, 10% cooldown; two of the three engines
  were baselines that can't change. Done (r39):
  - **Frozen production builds** (`frozen.mjs`): a run commits the
    working tree as it stands into a commit object (a temporary index;
    branch, index and files untouched; the same tree on the same HEAD
    freezes to the same commit), checks it out into one reused worktree
    (`.bench/tree`) and builds the suite and FLIP pages for production
    once per commit, in seconds; 1.x's harness and 2.0 load from it, and
    snapshots at refs build the same way. Edits during a run don't reach
    it. `--dev` serves the live tree.
  - **A startup scenario** (`cold-start`: load, settle, memory; no
    motion): about 10 s a run instead of 26. Its default plan has time to
    settle as the primary and first content as a guardrail.
  - **Baseline reuse** (`reuse.mjs`): an engine that can't change (a
    release, a commit, the frozen tree), never the candidate, runs one
    calibration repetition per scene; within the stored spread (CPU per
    frame where the scenario moves, else time to settle with a wider band)
    the other repetitions come from stored runs with the same machine,
    method (the measuring harness's files), build and settings, scene and
    data, marked `reused`; else all run. `--no-reuse`.
  - **Early stop**: a scene's remaining repetitions are skipped once,
    after at least two, the primary metric's interval lies wholly past
    the tolerance and each guardrail is clearly within or past its own.
    A smaller primary change gets every repetition: with two repetitions
    a bootstrap interval is too narrow to call one (NYC stopped on a 3%
    difference before this rule). `--no-early-stop`.
  - **Areas and tiers** (`areas.mjs`, the catalog's `areas` and `tiers`):
    areas name source paths (terrain, streaming, content, render,
    instancing, core), scenes list the areas they exercise; `--changed
[ref]` runs the scenes of the areas a changed file falls in (nothing
    when no measured code changed), `--areas` names them. Tiers: quick
    (startup, reuse, early stop), standard (the orbit), full (every
    scene, both orbits, motion quality).
  - **Annotations**: dated notes on Dyno's trend charts, at the first run
    on or after their date and only on their metrics' charts when named:
    method changes in `bench/suite/annotations.json`, machine and data
    notes in the results directory (`cli.mjs annotate`).

  The quick tier on the terrain area (3 scenes, 2.0 against 1.146.0):
  16 runs in 2.5 minutes, then 10 runs (1.146.0 calibrated within its
  stored spread on every scene; two scenes stopped after two
  repetitions), 127 s → 78 s inside runs. The orbit at three repetitions
  would have been 36 runs and about 16 minutes. Still planned:
  - Content served from the local store through a server that shapes
    the link per connection (latency, bandwidth, HTTP/2), for both
    engines' main threads and workers, where licenses allow mirroring;
    mainly for variance (Philadelphia's cold first content ranged 1.3 to
    2.7 s for 1.x alone over the live network). Google's tiles stay live.
  - Guardrails decided "within tolerance" after two repetitions share
    the narrow-interval caveat; a permutation bound for small samples
    would be sounder than the bootstrap there.

- **Lighting**: 1.x lights tilesets with an environment map from its
  atmosphere; 2.0's own IBL is brighter and bluer until M4 ("Measurement and statistics" above).
- **Primitive outlines** and the other extensions in [parity.md](parity.md), "Extension coverage".

## Later (v2 and beyond)

- **v2 (with M5)**: dedicated runner machines (GPUs are not available on
  shared CI), nightly and per-merge runs, a results store (time series),
  a dashboard, change-point detection (E-Divisive means, as MongoDB and
  Apache Otava use) instead of thresholds, automatic bisection with
  `BENCH_COMMIT`, traces on regressions.
- **v3 (Cesium-wide)**: a matrix across OS, browser (Chrome, Edge,
  Safari, Firefox with WebGPU), GPU vendor and driver, and device class
  (desktop, laptop, mobile); the tiling half (source → tiler → tileset,
  then runtime); native runtimes as adapters; the asset store; shared
  public reports.
