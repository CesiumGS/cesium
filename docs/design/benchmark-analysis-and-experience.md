# Analysis and experience design: learning from analogous systems

**What this holds:** Learning from analogous systems: how the benchmark suite's analysis and experience should work. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Experiment trackers such as Weights & Biases were built for training runs.
Graphics benchmarking is closer to a mix of race telemetry, web
performance monitoring, online experimentation, manufacturing quality
control and game frame analysis. This section starts from what the suite
has to do, borrows from the fields that already solved each job, and
phases the result into the suite's milestones (§16.7, §16.8).

**Principles.**

- Every view answers one of six jobs: decide, detect, diagnose, trust,
  explore, communicate.
- Overview first, then zoom and filter, details on demand; every claim
  carries its interval.
- Validity before verdict: a result is shown as a verdict only when its
  run was valid.
- Runs of one scene are aligned by camera progress, not wall time, so
  engines and commits are compared at the same place on the same path.
- One click from an alert to its cause: the regressed scene, the place on
  the path, the frames, the requests, the trace.
- Graphics terms in the app and reports (camera path, path segments,
  frame cost); the analogies below are sources, not vocabulary.
- The suite, the examples (§13.12) and parity (§4) share scene
  definitions, so a showcase, its measurement and its image check never
  drift apart.
- Results stay internal (§16.2); views can be shared inside Bentley.

## Decide: is B really better than A?

Borrowed from online experimentation platforms (Statsig, Eppo, Optimizely,
Microsoft's experimentation platform), canary analysis (Netflix and
Google's Kayenta), Go's `benchstat` and clinical trials.

- _A declared primary metric and guardrails._ Each comparison names its
  primary metric (e.g. CPU per frame, or settle time) and guardrail
  metrics that must not get worse (memory, long frames, bytes, image
  parity), declared in the catalog or the run (`--plan`) before results
  exist, so nobody picks the flattering metric afterwards.
- _Validity checks before any result_ (the experimentation platforms'
  sample-ratio checks): both engines ran the same scenes, repetitions and
  datasets (checksums), under comparable conditions (§16.3); otherwise
  the comparison says why it isn't valid instead of showing a verdict.
- _Variance reduction_ (CUPED-style): adjust run metrics with
  measurements taken before each run (idle clocks, temperature, machine
  utility) where that demonstrably narrows intervals; report both.
- _A scorecard_ (Kayenta): each metric tested per scene (bootstrap ratio,
  §16.3), weighted into pass, marginal or fail overall; the merge gate for
  2.0 changes and the verdict line on every report.
- _A terse comparison table_ (`benchstat`): old, new, change with interval,
  per scene and metric, for pull-request comments and the CLI.
- _Forest plots_ (clinical trials): already the report's per-scene view.

## Detect: did something get slower, or slowly drift?

Borrowed from statistical process control in manufacturing, Mozilla
Perfherder, Chromium's performance dashboard and Pinpoint, change-point
detection (MongoDB, Apache Otava) and Grafana annotations.

- _Control bands on trends:_ an expected band (mean ± 3σ of a stable
  baseline window, per scene, metric and hardware class), with simple
  run rules that catch drift (several runs in a row on one side, a trend
  of rising points), not only steps. Humans read these at a glance.
- _Change points_ (E-Divisive means, §16.8) marked on trends.
- _Alerts with triage:_ a detected regression or improvement becomes an
  alert with a commit range, the affected scenes and metrics, and a state
  (new, acknowledged, expected, invalid, fixed), plus who owns it and a
  note; an alerts view is the reviewer's queue (Perfherder's sheriffs).
- _Automatic bisection_ (Pinpoint): an alert can run the affected scenes
  on commits inside its range (`BENCH_COMMIT` snapshots) until the culprit
  is found, and attach the result.
- _Annotations:_ commits (messages, authors), CesiumJS releases, driver
  and browser updates and catalog changes drawn as markers on every
  trend, so a step lines up with its cause.

## Diagnose: why is it slower?

Borrowed from Formula 1 telemetry, WebPageTest, Digital Foundry, Honeycomb
BubbleUp, frame analysis tools (CapFrameX, AMD OCAT, NVIDIA FrameView)
and trace viewers (Perfetto, Tracy, Unreal Insights).

- _Cost along the camera path with a delta trace_ (F1's lap overlay):
  frame time, CPU and GPU per frame for both engines (or two commits)
  against progress along the same camera path, with a line of the
  difference; _path segments_ (a timing screen's sectors): each third of
  the path with each engine's cost, its gap to the lowest and a verdict;
  and a _path map_ (F1's track dominance map): the camera path from
  above, each stretch in the color of the engine clearly faster there.
  Where in the scene a difference happens becomes obvious.
- _Filmstrip_ (WebPageTest): screenshots of each engine at fixed moments
  (first content, settled, every quarter of the motion), side by side,
  with the image-parity FLIP score and heatmap (§4) under each pair, so
  "faster" is never mistaken for "drawing less".
- _Side-by-side video with overlays_ (Digital Foundry): optional
  recordings of both engines on the same path with frame time and
  progress overlaid, for reviews and stakeholders.
- _Request waterfall_ (WebPageTest): every content request over time per
  engine (queued, waiting, receiving; bytes; tileset; host), aligned with
  the load phase, to explain settle-time differences (the open OSM
  Philadelphia question, §15).
- _Frame-time percentile curves and stutter metrics_ (frame analysis
  tools): the full percentile curve of frame times per engine, "1% low"
  style metrics, hitch counts by size, frame-time variance; better than a
  single p95.
- _"What differs" analysis_ (BubbleUp; built in a first form, r33: each
  grouped alert lists the scene attributes far more common among the
  affected scenes than among all measured ones): for a regression, compare the
  regressed runs or scenes with the rest across every recorded dimension
  (scene group, content format, tileset, phase, hardware, browser
  version, driver, conditions) and rank the dimensions that explain it.
- _Traces one click away:_ a regressed run is rerun with Chrome tracing
  and V8 sampling (`trace.mjs`) and the trace opens in Perfetto from the
  report; GPU frame captures later.

## Trust: can the result be believed?

Borrowed from 3DMark's result validation, MLflow's lineage, data-quality
monitoring in particle physics and visual-regression tools (Chromatic,
Skia Gold).

- _A validity verdict per run:_ valid, valid with warnings or invalid,
  from the recorded conditions (cooldown reached, machine quiet, clocks
  and slowdown shares comparable between engines, wake lock held, AC
  power), dataset checksums, catalog and license checks and errors; shown
  before any number and carried into trends (invalid runs hidden by
  default).
- _Lineage_ (built, r33: command, commit, working-tree diff hash, catalog
  and dataset checksums, engine builds, plan, render settings, in each
  report): every number links to what produced it (commit, catalog and
  dataset checksums, engine builds with integrity hashes, browser,
  driver, settings) so any run can be reproduced exactly.
- _Reference overlays and a review checklist_ (data-quality shifts): the
  nightly run's distributions drawn over reference distributions, and a
  short checklist for whoever reviews them.
- _Image baselines_ (visual-regression tools): parity images per scene
  approved or rejected like visual-regression snapshots, in the same
  report as performance.

## Explore: what do parameters do?

Borrowed from hyperparameter tools (W&B sweeps, Optuna, TensorBoard's
HParams) and hardware result browsers (3DMark, Geekbench).

- _Sweeps as experiments:_ screen-space error, upload budget, selection
  policy, cache size, the CesiumJS version across a release sweep
  (§16.6): each sweep a set of runs with its parameters.
- _Parallel coordinates and parameter importance:_ which parameters move
  which metrics, and how much.
- _Hardware scaling:_ the same scenes across GPUs and machines, per engine
  (normalized by hardware class), once several runner machines exist.

## Communicate: what does this mean for the product?

Borrowed from W&B Reports, Lighthouse and performance budgets, and Strava
segments.

- _Narrative reports:_ a page that combines live charts and text (a
  release comparison, a design decision), built from saved views.
- _Budgets_ (built, r33): per scene and metric limits (Lighthouse
  budgets) that turn red when exceeded. The catalog's `budgets` hold §5's
  targets (CPU per frame at most ⅓ of 1.x, time to settle at most ½,
  frame p95 within 17.5 ms with vsync, no hitches over 100 ms), checked in
  every report and drawn as limit lines in the workspace. The first full
  pass breaks the CPU budget in 8 of 10 scenes and the settle budget in 9
  of 10: the targets are not met yet.
- _Scene pages_ (Strava segments): each catalog scene as a segment with
  its history, each engine's best result and when it got there, its
  filmstrip over time, and the commits that moved it.

## Name

The suite and its app are called **Dyno**, after the engine dynamometer:
the rig that measures engines under controlled, repeatable conditions,
as Dyno does for 1.x and 2.0.

## Information architecture of the tracking app

- _Workspace_ (built, r33; W&B-style, replacing Trends): a runs sidebar (color, eye
  toggle, search, filters by tag, branch, hardware, validity; grouping);
  collapsible sections (Headline, Loading, Rendering, Network and memory,
  Conditions) of compact panels in a 2–3 column grid; the headline
  section shows the candidate/baseline ratio per metric with interval
  bands and a reference line at ×1; panels show one line per
  configuration with interval bands, control bands, annotations and run
  dots; each panel can split by scene into small multiples; clicking a
  point opens that run; a pinned baseline run draws a reference line;
  saved views and shareable URLs.
  Built as `workspace.ts`: runs sidebar (show or hide each run, search,
  hardware and validity filters, ★ to pin the reference run), sections
  Headline (candidate over baseline with intervals and ×1), Loading,
  Rendering, Network and memory, Conditions; per configuration lines with
  their intervals; a control band for the candidate (mean ± 3σ of the
  earlier runs, once there are six) with Western Electric rules 1 and 4;
  markers where a configuration first appears or the hardware changes;
  split by scene (and scenario); click a point for its report; view state
  in the URL and saved views by name. Summaries now keep scenarios apart
  and carry conditions and validity (`cli.mjs resummarize` rewrites old
  ones). Commit subjects show where a run has no note.
- _Alerts_ (built, r33): the triage queue (§16.9, Detect).
  `changepoints.mjs` runs E-Divisive means (energy statistic, binary
  segmentation, permutation test at p < 0.05, O(n²) per split) on each
  metric's run medians per scene, scenario, configuration and hardware,
  and keeps changes of 3% or more; alerts are grouped like Perfherder's
  alert summaries (one change across scenes), triaged in Dyno (new,
  acknowledged, expected, invalid, fixed; owner; note) into
  `triage.json` beside the results, and listed by `cli.mjs alerts`
  (`--fail-on-new` for nightly jobs). Checked on a synthetic 20-run
  history with planted steps: every step found, no false alerts.
- _Run:_ the report (verdict and validity first, scorecard, tiles, forest
  plots, then per scene: cost along the camera path, path segments and
  path map, filmstrip, waterfall, percentile curves, metrics, conditions;
  setup and lineage).
- _Compare:_ any two runs or configurations, with the scorecard, forest
  plots and path overlays.
- _Scenes_ (built, r33): the segment pages (`scenes.ts`): every scene
  and scenario with its latest result per configuration; a page per scene
  with its content and licenses, best results per configuration (when and
  at which commit), history panels, the change points that moved it, and
  the filmstrip over time; links to the explorer and the workspace.
- _Sweeps_ (built in a first form, r33): `cli.mjs run --sweep
param=a,b,c` runs each 2.0 configuration (or `--sweep-configs`) once
  per value (any configuration field, e.g. `maximumScreenSpaceError`,
  `policy`, `render.pixelRatio`); release sweeps (`--releases`) count too.
  The Sweeps tab plots each metric against the values, with the baseline
  as a reference and the image difference from the baseline (FLIP) beside
  the costs, so a cheaper setting that draws less shows it. Parallel
  coordinates and parameter importance come with multi-parameter sweeps.
- _Hardware_ (built in a first form, r33): the latest ordinary run per
  hardware class, candidate over baseline per headline metric; fills in
  as runner machines are added.
- _Reports:_ saved narratives.
- _Explorer_ (built, r33): the scenes, live and interactive, as a Dyno
  tab (a module loaded on first use; the 1.x build is injected on demand,
  and switching 1.x builds reloads the page, since 1.x is a page
  global). Pick a catalog scene and one or two engines (a release
  such as 1.146.0, or the working tree's 1.x or 2.0 with a setup), side
  by side.
  - _Camera path:_ both cameras on the scene's benchmark camera path;
    play, scrub, change speed.
  - _Free flight:_ fly either engine with the mouse (1.x's camera
    controls, 2.0's `GlobeController`) to inspect the content; with
    linked cameras the engine you touch leads and the other follows
    exactly; a readout of the camera's longitude, latitude and height.
  - _Pause streaming:_ keep what is selected and loaded now and fly
    around it (1.x `debugFreezeFrame` and the globe's LOD suspension;
    2.0 `Tileset3D.freezeSelection`), to see what each engine selected
    and what it culled.
  - A HUD per engine: CPU and GPU per frame, frame time (shared), loading
    state. State in the URL (scene, engines, place on the path), and each
    report scene links to it.
  - For looking, not measuring: two engines share one GPU and main
    thread, and the page says so.
  - Built since (r33): tile statistics in the HUD (drawn and loading
    tiles; 2.0's requests and bytes, 1.x's tile memory); tiles colored by
    tree depth in both engines with one palette (2.0
    `Tileset3D.debugColorizeTiles` via `World.setColor`; 1.x's own colors
    are random, so the suite tints by depth itself); deep links from the
    report (a click on a path chart opens that point of the path, filmstrip
    frames open their moment); "Measure this" gives the CLI command for the
    scene and engines.
  - Built (r34): bounding volumes (white at final resolution, yellow
    while finer tiles load, gray without content: 1.x's colors) and
    content volumes (blue) in both engines, through 1.x's own
    `debugShowBoundingVolume` and 2.0's new
    `Tileset3D.debugShowBoundingVolume` (line-list wireframes under the
    tileset's transform; regions follow the ellipsoid); tiles tinted by
    depth, or by engine (gray where both draw the tile, the engine's color
    where only it does; tiles match by header, terrain by quadtree
    address, so the two selections compare exactly; 1.x's globe takes no
    tint); "Selection by depth", each engine's drawn tiles per level with
    those only it draws. 2.0's terrain now applies the draw tint over its
    imagery (white unless a debug view tints).
  - Next: screen-space error coloring, picking a tile for its metadata
    (header, SSE, distance, state, bytes), and the inspector below in
    place of the HUD.
  - Later, authoring benchmarks: the explorer becomes where new
    benchmarks are made. Record a camera path from free flight
    (keyframes, smoothed into a spline, with timing) and save it as a
    scene's camera script; load other content (an ion asset, a tileset or
    glTF URL, a local file, a dataset from the private manifest), place
    it, and save the result as a catalog scene: public scenes go through
    the license review (§16.2), private ones into the private manifest
    outside the repo; then a first measured run from the same tab.

## Experience (r33)

Dyno's shell is React with Radix Themes (`app.tsx`); the views stay
imperative modules drawing into the page body, with their state in the
URL. Practices applied:

- Navigation by job (Track: Workspace, Alerts, Runs, Compare; Inspect:
  Scenes, Explorer, Images; Explore: Sweeps, Hardware), counts of what
  needs attention on the items (untriaged regressions, unreviewed
  images), and a page header saying what each view is for. The run report
  is a page reached from Runs, alerts, the palette or a workspace point,
  with a way back.
- A command palette (Ctrl/⌘ K) over views, scenes and runs; keyboard
  shortcuts (g then a letter, / to search, ? for the list).
- Light, dark or system theme, chosen in the sidebar; charts and the
  report follow it (the report renders in a shadow root, not an iframe).
- Radix tokens for every neutral surface and control (buttons, inputs,
  selects, chips, focus rings); data and status colors stay on the
  validated palette.
- Feedback: a loading state between views, toasts for saves, copies and
  approvals, clickable table rows, explanations once per section instead
  of on every panel, long labels truncated.
- Also built: workspace panels expand full width in a dialog (Esc
  closes); Compare starts from the two latest ordinary runs, offers only
  shared configurations and warns when machines or render settings differ;
  the workspace marks runs where the render settings changed.
- Built (r34), the app rebuilt on standard parts: every view is a React
  component using Radix Themes controls directly (selects, segmented
  controls, checkboxes, sliders, dialogs, tables); TanStack Router on
  hash history gives each view typed, validated search params (shareable
  links, back and forward work), loads each view as its own chunk, and
  reads the runs once in the root loader with a pending state instead of
  a top-level await; React's StrictMode is on (the explorer's engines
  survive mount, unmount, mount: 2.0 cleanly, 1.x at some extra start-up
  cost). Charts stay the strings charts.mjs builds, which the CLI's
  reports share, hosted by one component. Old `?tab=` links redirect. A
  guided first run (`/start`, and wherever a view needs runs and there
  are none) checks the setup live (WebGPU, the 1.x builds, the results
  directory), gives one command for a first measured run and says where
  to look next.
- Next: persistent column choices in tables; the inspector (below).

## Dyno on StrataKit (r35)

Dyno is built on StrataKit, Bentley's design system (MUI themed by
`@stratakit/mui`, plus `@stratakit/structures` and `@stratakit/icons`),
as Sandcastle is; Dyno also battle-tests it, and what got in the way is
logged for the StrataKit team in `bench/suite/STRATAKIT_FEEDBACK.md`.
`bench/suite/DESIGN.md` sets the information architecture, page anatomy,
copy rules and component choices; every view follows it.

- _Served at the dev server's root_ (`/#/overview`); hash routes per view
  with typed search params; no compatibility with earlier routes (Dyno
  has one user so far).
- _Navigation by job_, a StrataKit navigation rail in three groups:
  results (Overview, Trends, Runs, Alerts), scenes (Scenes, Explorer,
  Images), workbench (Analysis: sweeps and machines; Lab), with Getting
  started, shortcuts and the theme in its footer. Compare is reached
  from Runs (select two), alerts and links. The Cesium logo and wordmark
  head the rail.
- _Overview_ (new, the landing page): the latest run's verdict and
  validity, the headline changes in words ("1.3× faster", "13% more
  data"), budgets met or missed, what needs a look (untriaged
  regressions, images to review, invalid runs) and the recent runs.
- _Copy_: sentence case, buttons that say what they do, changes in words
  with the raw ratio on hover, one sentence per page header with details
  in help popovers, empty states that say what to do next.
- _Lab_: every parity check, microbenchmark and spike is a module with two
  hosts (`lab/harness.ts`): Dyno mounts it at `/#/lab/<id>`, and its own
  .html page hosts it alone for the CLI runner (`bench/run.mjs`), which
  measures in a page with nothing else on the main thread.

## Inspector (designed r34, built r37)

Built as designed, in `packages/next/widgets/`: `Inspectable` (a
snapshot an engine fills in as far as it can measure), `inspectEngine`
for 2.0, Dyno's 1.x adapter for 1.x, and `attachInspector` with every
readout the viewer panel had. Beside it, `Viewer` (2.0's counterpart to
`Cesium.Viewer`: canvas, engine, world, view, controller, globe and
imagery, credits, content with its attributions, framing, split view,
overview inset, sun, picking) and the credits widget. Dyno's Viewer page
runs one engine at a time on it (or `Cesium.Viewer` for 1.x), and the
standalone viewer is gone. Still open: per-pane settings controls in the
Explorer (deliberately absent: they would undo the comparison), and a
resizable docked panel.

The standalone debug viewer (`viewer/`) splits three ways:

- _Engine core: debug features as APIs, no UI._ Statistics, the content
  pipeline's stage timings, requests, `freezeSelection`, bounding
  volumes, tile tints, picking. The core stays headless and
  framework-free; apps pay nothing for it.
- _An inspector overlay, its own module outside the core_ (the viewer's
  right panel: problems, view, streaming, content pipeline, GPU and
  memory, pick, lighting), attached to any engine
  (`attachInspector(engine, element)` or a `<cesium-inspector>` element),
  written without React so any app can use it (as 1.x's
  `CesiumInspector` and `Cesium3DTilesInspector` were widgets, not core).
  It reads a small inspectable interface rather than 2.0's internals: 2.0
  implements it natively and Dyno's 1.x adapter implements it too, so the
  explorer shows the same inspector beside both engines (replacing its
  HUD).
- _Dyno owns content and workflows._ The viewer's content loading (ion
  assets, URLs, local files, the test-page list) moves into the explorer,
  where benchmark authoring is planned anyway; parity and benchmark links
  are Dyno's already. The standalone viewer then retires, or shrinks to a
  few lines that make an engine and attach the inspector.

Order: the inspectable interface (from what the viewer panel and the
explorer HUD show), the inspector, then content loading into the
explorer.

## New data the runs record

- Camera progress for every frame (already implied by the motion series)
  and the camera position, for path maps (built, r33).
- Screenshots at fixed moments per run (filmstrips), in the results store;
  optional video. Built (r33): the settled views after loading and after
  motion, first repetition, as JPEGs beside the results, with FLIP and
  its heatmap against the baseline.
- Request records per run: start, time to first byte, end, bytes, host,
  kind (built, r33; tileset and engine later).
- A per-run validity verdict and its reasons; the scorecard per
  comparison (built, r33).
- Alerts and annotations as their own records in the results store
  (status, owner, notes), editable from the app.
- Declared plans (`--primary`, `--guardrails`, `--tolerance`,
  `--hypothesis`; default primary CPU per frame, guardrails settle time,
  frame p95, hitches over 100 ms, bytes and JS heap, 10% tolerance)
  stored with the run (built, r33).

## Phasing

- _With v1's exit_ (now). Built in phase 1 (r33): the Explorer (camera
  path, free flight, linked cameras, paused streaming); cost along the
  camera path with a delta trace, path segments and a path map;
  filmstrip with FLIP; frame-time percentile curves and stutter metrics
  (hitches over 100 ms, p99.9, spread); request waterfall and bytes over
  time; validity verdicts; scorecard with declared primary and guardrail
  metrics; `cli.mjs compare` (`benchstat`-style) and the table after each
  run; uncapped scenarios; thermal headroom; the workspace (r33, below).
- _v2_ (with M5): alerts and triage, change points, automatic bisection,
  pull-request comments, scene pages, "what differs" analysis, traces
  from the report, side-by-side video.
- _v3_ (Cesium-wide): sweeps view, hardware scaling, narrative reports,
  budgets, reference overlays and the review checklist.
- _Deferred (r34, decided):_ the CI image job on a software rasterizer
  (§16.10) and automatic bisection of alerts wait until after the
  Explorer's inspection tools and Dyno's controls are done; they need CI
  runners and a build per commit, which the prototype does not have yet.

Sources for §16.4, §16.8 and §16.9 (checked October 2026; licenses to be
confirmed at the source before mirroring):
[PLATEAU streaming tutorial](https://github.com/Project-PLATEAU/plateau-streaming-tutorial/blob/main/3d-tiles/plateau-3dtiles-streaming.md),
[Awesome PLATEAU](https://japan-opendata.github.io/awesome-plateau/),
[USGS 3DEP on AWS](https://www.usgs.gov/news/technical-announcement/usgs-3dep-lidar-point-cloud-now-available-amazon-public-dataset),
[3DEP COPC on Planetary Computer](https://planetarycomputer.microsoft.com/dataset/3dep-lidar-copc),
[UNC Power Plant](http://gamma.cs.unc.edu/POWERPLANT/),
[ASWF open assets](https://lf-aswf.atlassian.net/wiki/spaces/DPEL/pages/11436337/Links+to+Open+Assets),
[BIMData IFC files](https://github.com/bimdata/BIMData-Research-and-Development/blob/master/pages/IFC_FILES.md),
[iTwin sample iModels](https://www.itwinjs.org/learning/tutorials/create-test-imodel-sample),
[Change point detection at MongoDB](https://arxiv.org/pdf/2003.00584),
[Hunter / Apache Otava](https://ar5iv.labs.arxiv.org/html/2301.03034).
