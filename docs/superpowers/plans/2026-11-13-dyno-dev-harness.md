# Dyno as the development harness: design plan

**Status (2026-11-13):** proposed, for the owner's review. Nothing is built. The open questions are in section 13; each has a recommendation, and the plan assumes them. Section 16, Dyno's navigation rail, was added at the owner's request the same day (milestone DH-15, questions 10 to 13).

**Goal:** every measurement that steers development goes through Dyno, so it lands in the results store, shows in Trends, and can be found again by run ID. Today the numbers behind recent decisions (the error exponent α, the ×10 cliff bands, the culling gains) came from one-off Playwright scripts that wrote CSVs and PNGs to temporary folders. Those numbers can't be compared with later ones, and nobody can find them a week on.

- A development case (a gallery example, its URL parameters, a pose and a debug view) is a scene Dyno can run, measure and capture, beside the catalog's 1.x and 2.0 scenes.
- A sweep covers any setting Dyno knows (engine, view, example parameter), over several axes at once, with the metrics we have been collecting by hand.
- A run says what it is for: development or baseline, the plan item it serves, its hypothesis, its branch and worktree. Development runs never pollute the baselines.
- Agents leave their results in the shared store and report run IDs; the main session and the owner find them by item or branch.
- Test results, the second machine's runs and live inspector recordings reach the same store.
- AGENTS.md and a short skill tell every new session how to do this.

**Sources:**

- `CESIUM2_WEBGPU_PLAN.md` §16 (all of it), in particular §16.5 (interfaces), §16.6 (engine names), §16.7 (frozen builds, reuse, early stop, areas and tiers), §16.9 (sweeps, Workspace, Alerts) and §16.10 (image checks).
- `packages/next/AGENTS.md`; `packages/next/bench/suite/DESIGN.md`.
- Code, read for this plan (paths under `packages/next/`): `bench/suite/cli.mjs`, `engines.mjs`, `engineBuilds.mjs`, `frozen.mjs`, `report.mjs` (`summarizeRun`, `METRICS`), `schema.ts`, `images.mjs`, `suite.ts`, `data.ts`, `routes.tsx`, `views/Analysis.tsx`, `Lab.tsx` and `lab/pages.ts`, `Examples.tsx`, `exampleRun.ts`, `Images.tsx`, `Trends.tsx`, `trendsModel.ts`, `Runs.tsx`, `Compare.tsx`; `vite.config.ts` (`serveBenchResults`, the vitest block); `bench/run.mjs`; `widgets/recorder.ts`, `recorderRows.ts`, `widgets/engine.ts`, `scripts/vitePluginRecord.ts`; `scripts/alphaSweep.mjs`, `profilePage.mjs`, `runSpike.mjs`; `examples/vertical-exaggeration/`; `src/shaders/surface.slang` (`cascadeLight`), `src/scene/RenderContext.ts` (the caster pipeline's bias), `src/scene/View.ts`.
- `docs/superpowers/plans/2026-11-12-transform-graph.md` (the α findings and the ×10 cliff bands); `2026-11-13-refinement-and-convergence.md` (`view.converged()`, which replaces ad-hoc settle loops).
- The results store on this Mac, looked at on 2026-11-13: `~/.cesium-bench/results` does not exist yet (no Dyno run has been made on the Mac; the history is on the Windows laptop). `~/.cesium-bench/inspector` holds 119 recorder CSVs.

## 1. What Dyno does today, against our development uses

Facts from the code. "Gap" is what stops the use from going through Dyno now.

| Development use | What Dyno does today | Gap |
| --- | --- | --- |
| Measure a catalog scene, 2.0 against 1.x | `cli.mjs run`: frozen production build of the working tree (`frozen.mjs`, `<worktree>/.bench/tree`), cold browser contexts, configurations alternating, cooldown and quiet rules, baseline reuse, early stop, scorecard, report, summary. | None for this use. It is what Dyno was built for. |
| Before and after a change on my branch | Engines at any git ref (`2.0@main`, `2.0@<sha>`) run beside the working tree in one run. `compare <old> <new>` prints a benchstat table. | Nothing names the branch's base: the person types the ref. Compare's default is "the two newest non-sweep runs" (`Compare.tsx:69-74`), whoever made them. |
| A gallery example with URL parameters and a pose (vertical exaggeration at ×10 in the valley) | The Examples view hosts any example with free-form URL parameters (`/examples/$id?x=10&view=zermatt-close`, `exampleRun.ts`). Nothing is measured or written; the only side effect is a thumbnail in `localStorage`. | No run kind for examples. No settle rule, no metrics, no capture. Poses exist only as each example's own presets (`view=`); there is no host-level pose. |
| A debug view (`&debug=skirts`, `level`, `error`, `stretch`) | `widgets/engine.ts` reads `debug`, `alpha`, `lod`, `occlusionCull`, `coarsen`, `probe=sse` and `record` from the page URL for any inspected engine, in development only. | Not reachable from a run: catalog scenes go through `suite.ts`, which reads none of these. |
| A parity page, a microbenchmark, a spike | Lab lists 27 harnesses (`lab/pages.ts`) and mounts them in Dyno. "Run" calls the harness and shows a toast; the result is discarded. The headless runner, `bench/run.mjs`, has its own registry and writes to `packages/next/bench/results/`, which Dyno never reads. | Results don't reach the store. Six Lab ids aren't keys in `run.mjs` (`custom-shader`, `shader-cost`, `translucency-cost`, `observer-cost`, `tracks-bench`, `worker`), so the command Lab shows for them fails. |
| A sweep of one engine setting | `run --sweep maximumScreenSpaceError=8,16,32`: each 2.0 engine once per value, recorded as `results.sweep = {param, values, engines, points}`. Analysis plots each metric against the values, with the baseline as a dashed line. | One axis only (the option parser keeps the last `--sweep`). The value goes into the engine configuration with `setPath`, but `suite.ts` applies only `policy`, `maximumScreenSpaceError` and the budgeted options. Any other name is accepted and silently ignored, so `--sweep lodExponent=0,1` would "succeed" with identical points. No view settings, no example parameters, no reference variant. |
| The metrics we collected by hand | `METRICS` (`report.mjs:40-65`): first content, settle, frame percentiles, CPU and GPU per frame, long frames, requests, bytes, heap, buffers, FLIP of the settled view against the baseline engine, quality in motion. | Missing: tiles drawn per tileset, requests by host class and by tileset, the largest stretched error, whether the view settled at all (a run that hits the cap fails instead of reporting "not settled"), GPU per pass, pixel difference from a reference variant of the same engine. |
| Image checks | `cli.mjs images`: catalog scenes at points of their camera path, FLIP against approved baselines per renderer class, `--parity` against 1.x, JUnit and Markdown. The Images view reviews them (side by side, swipe, flicker, FLIP heatmap, approve, reject). | Checks come from catalog scenes only. The Images view is generic over the row shape, so another producer could feed it. |
| Telling branches and worktrees apart | Each run records `branch` (`treeRef`), `commit`, `subject`, `dirty`, `diffSha256`, `note`, `tags` and the command. | No purpose, no plan item, no worktree, no base commit, no machine alias. Trends and Runs have no branch or tag filter: only a free-text search. Every worktree's Dyno shows the same store (good), with no way to say "baselines only". |
| A hypothesis | `--primary`, `--guardrails`, `--tolerance` and `--hypothesis` go into `results.plan`, and the scorecard tests them. | Works. Not shown when browsing runs; not usable as a filter. |
| Running several sessions at once | CLI servers prefer fixed ports with `strictPort: false` (run 5193, snapshots and images 5194, `bench/run.mjs` 5191), so they move up when taken. Dyno's dev server is `strictPort` on 5190; other worktrees pass `--port`. | Two runs at once share one GPU and corrupt each other's timings. Nothing serializes them. |
| Live sessions (the inspector's recorder) | One CSV row per tick (52 columns) and optional PNG frames, POSTed to the dev server, written to `~/.cesium-bench/inspector/<start>-<page>.csv`. | No metadata at all (no URL, engine, settings, pose, commit, adapter), and the store isn't Dyno's. |
| Unit tests | Nothing. Vitest runs with no JSON or JUnit reporter (`vite.config.ts:526-547`). | No history, so flaky tests and environment-only failures are rediscovered by each session. |
| The second machine | Results stay in each machine's own store. Trends separates hardware classes. | No way to bring the Windows runs and the Mac runs together. |
| Telling agents how | AGENTS.md has no section on Dyno. | Sessions fall back to scripts. |

## 2. Words

These follow DESIGN.md's vocabulary and add four terms. Each means one thing.

- **Run**: one invocation that writes one result file into the store. It now has a **kind**: `bench` (today's `cli.mjs run`), `images` (today's `cli.mjs images`), `lab` (a Lab harness), `recording` (a saved inspector session) or `tests` (a vitest run).
- **Purpose**: `baseline` or `dev`. Baselines are the history Trends draws by default. Development runs are everything else: an agent's before and after, a sweep to choose a default, an investigation.
- **Item**: the plan item a run serves, in the plans' own form (`LT-4`, `SR-3`, `DH-6`). Free text, checked against the pattern `^[A-Z]+-\d+[a-z]?$` with a warning, not an error.
- **Scene**: unchanged in meaning (content with a camera), with a new group **D, development**: scenes built from a gallery example or a Lab page instead of catalog datasets. Group D scenes never enter the headline geometric means, Overview or budgets.
- **Setting**: one named thing a run can vary, declared in a registry (section 4): an engine setting, a view setting, an example parameter or a development tuning knob.
- **Sweep axis** and **reference**: a setting with a list of values; a sweep is the grid of all axes' values. The reference is one value of one axis that every other point is compared against for pixel difference (α 1 in the α sweep, shadows off in the shadow study).

## 3. Our development cases as runnable scenes and checks

### Example scenes

A group D scene names a gallery example, its parameters and how to frame it. They live in a new catalog file in the repo, `bench/suite/catalog/dev.json`, with public content only; private ones go in a private manifest as today (`BENCH_MANIFEST`). The loader merges it like the others and applies the same licensing rule to the datasets the example uses (each example's datasets are listed in the entry, so the rule still has something to check).

```json
{
  "id": "vex-x10-zermatt",
  "title": "Vertical exaggeration ×10, Zermatt close",
  "group": "D",
  "example": "vertical-exaggeration",
  "params": { "x": 10, "view": "zermatt-close" },
  "view": { "shadows": true },
  "datasets": ["cesium-world-terrain", "bing-aerial", "osm-buildings"],
  "settle": { "holdMs": 3000, "capSeconds": 120 },
  "checks": ["settled"],
  "crop": { "cliff": [0.32, 0.18, 0.7, 0.62] },
  "areas": ["terrain", "warp", "shadows"],
  "engines": ["2.0"]
}
```

- **What runs it.** The Playwright driver loads the example through a small host page, `bench/suite/example.html`, which mounts one example with the same `ExampleContext` the Examples view gives it (parameters, `setParams`, `watchParams`), at a fixed 1280×720 CSS px and pixel ratio 1. The page joins `frozen.mjs`'s list of pages, so example scenes run from the frozen production build like every other run; `--dev` serves the live tree. The Examples view stays for looking; it gains a "Measure this" button that copies the command, as the Explorer has.
- **The pose.** Examples interpret their own parameters, so `view=zermatt-close` keeps working. For an arbitrary pose, the host gives examples one shared contract: a `camera` parameter (`lon,lat,height,heading,pitch,range`, degrees and metres, height above the ellipsoid as drawn) that the host applies after the example's own setup through the engine's camera API. An example opts out by declaring `pose: false` in `examples/index.ts` (for examples whose camera is the point of the example). The Explorer's and the Viewer's "save this view" writes the same six numbers.
- **When it is settled.** Until the refinement plan's `view.converged()` lands (§6 M11, R1 and R5), the driver uses `alphaSweep.mjs`'s rule, generalized: every tileset reports nothing in flight, queued or loading; the drawn triangle and tile counts hold for `holdMs`; the cap is `capSeconds`. An example's own "refining" indicator is not read; the engine's state is. When `converged({ until: "converged" })` exists, the driver calls it with the cap as its timeout and records what was still pending. A run that hits the cap is **not settled**, not failed: its metrics are recorded with `settled: false`, the reason, and the request rate over its last 30 s ("still rising").
- **What it measures.** Section 4's development metrics, read through the dev handle (`globalThis.__cesium`) after settling, and the canvas captured for images.
- **1.x.** An example has no 1.x adapter. A group D scene may name a 1.x counterpart (a Lab parity page with the same pose and sun), which then runs as the baseline engine. The ×10 cliff study needs one (`scene.verticalExaggeration = 10` at the example's close-up camera and sun); it is listed as a follow-up of the transform-graph plan, not a Dyno milestone.

### Lab pages as scenes

A Lab harness already has a module contract (`mount(root, params) → { run() }`). A group D scene can name one instead of an example (`"lab": "globe-parity", "params": {...}`). Its `run()` result is recorded as the run's metrics: parity pages report FLIP per view, microbenchmarks their timings, spikes their checks (PASS or FAIL with `measured`, as `runSpike.mjs` prints). `bench/run.mjs` and Lab then read one registry (`lab/pages.ts`), which also fixes the six broken commands. `run.mjs` keeps writing `bench/results/` for the handbook until the handbook reads the store (section 12, non-goals).

### The cases we have now

| Scene id | What | Notes |
| --- | --- | --- |
| `vex-valley` | Vertical exaggeration, valley preset, `x` swept | The α sweep (section 10). |
| `vex-zermatt` | The same, Zermatt close | Only OSM Buildings change with α here: terrain is at the data's finest level. |
| `vex-x10-zermatt` | ×10, Zermatt close, shadows on | The cliff bands (section 10). Crop `cliff`. |
| `vex-skirts` | `debug=skirts` at ×10 | Kept as an image check: a regression would show magenta. |
| `globe-parity` | The `globe` suite's six views as one Lab scene | 1.x parity must hold through warp work. |

These sit next to the catalog's 1.x/2.0 scenes: same runs, same store, same views, filtered by group.

## 4. Settings, sweeps and the metrics we collected by hand

### A registry of settings

One file, `bench/suite/settings.mjs`, declares every setting a run can vary. Each entry has an id, a person's label, a type and range, which run kinds accept it, and how it is applied:

| Namespace | Example ids | Applied by | Today |
| --- | --- | --- | --- |
| `engine.` | `engine.maximumScreenSpaceError`, `engine.policy`, `engine.motionBenefit`, `engine.render.pixelRatio` | The engine configuration, as now (`setPath`, `suite.ts`). | Exists, unvalidated. |
| `view.` | `view.lodExponent`, `view.shadows`, `view.debug`, `view.occlusionCull`, `view.coarsen`, `view.lod` | The adapter sets the `View` option (catalog scenes) or the host passes the generic parameter `widgets/engine.ts` already reads (example scenes). | Development URL parameters only. |
| `param.` | `param.x`, `param.view`, `param.contours` | The example's own URL parameter. An example declares its parameters (name, type, range, label) in `examples/index.ts` so the CLI can check them and Dyno can label them ("exaggeration factor"). | Free-form, undeclared. |
| `tune.` | `tune.shadow.normalOffsetTexels`, `tune.shadow.slopeBias`, `tune.shadow.depthBias`, `tune.shadow.offsetNormal` | A development-only tuning object in the engine, reached through the dev handle. Not public API. | Hard-coded: the normal offset is `2.0` cascade texels in `cascadeLight` (`surface.slang`), the biases are fixed in the caster pipeline (`RenderContext.ts`: depth −2, slope −1.5). |

- An unknown id, a value out of range or a setting the run's kind doesn't accept stops the CLI before anything runs, with the list of what is accepted. This closes today's silent no-op.
- Old engine-variant ids (`2.0+sse=32`, `2.0+maximumScreenSpaceError=8`) keep working: `engine.` is the default namespace, so results already in the store read the same.
- `tune.` knobs are engine work, owned by whoever needs them (the shadow study needs the shadow ones). Dyno only passes them through. The engine side follows the GPU safety rules: a knob that changes a pipeline (the slope bias) rebuilds it once when set, never per tick; a shader knob is a uniform with a clamped range.

### Sweeps over several axes

```bash
node packages/next/bench/suite/cli.mjs run --scenes vex-valley,vex-zermatt --sweep param.x=1,4,10 --sweep view.lodExponent=0,0.25,0.5,0.75,1 --reference view.lodExponent=1 --reference-reps 3
```

- `--sweep` repeats; the run covers the grid of all axes (here 3 × 5 = 15 points per scene). `--sweep-file grid.json` takes axes and an explicit list of points for grids that aren't full products.
- **Reference.** `--reference <axis>=<value>`: each point is compared with the point that has the same other coordinates and the reference value on that axis. `--reference-reps N` repeats the reference points N times, which gives the noise floor for pixel difference (the α study found about 2% of pixels change run to run). A difference within the floor reads "within noise". A reference can also be a variant outside the grid (`--reference view.shadows=false`): its points are added and run once per combination of the other axes.
- **Engines and order.** Points run as configurations of one run, so they alternate within each repetition as today (drift spreads across them). Baseline reuse and early stop apply per point; the reference points are never reused, since they set the noise floor.
- **The record.** `results.sweep` becomes `{ axes: [{ id, values }], reference?, points: [{ coords: { "param.x": 10, "view.lodExponent": 0.5 }, configs: [...] }] }`. A one-axis record from before reads as one axis. Each point's configuration id spells its coordinates (`2.0+param.x=10+view.lodExponent=0.5`), so every existing reader (Trends' configuration lists, Compare, the scorecard) keeps working.
- **Cost.** The CLI prints the number of points × scenes × repetitions before it starts and asks for `--yes` above 60 browser runs. No time estimate: the count is what the owner sees.

### The development metrics

Recorded per run for group D scenes and, where the adapter can read them, for catalog scenes too. They go into `RunMetrics.dev` and into the summary's cells like any metric, so Trends, Compare and Analysis can plot them.

| Metric | Key | How |
| --- | --- | --- |
| Tiles drawn and known, per tileset | `tiles.<label>`, `tilesKnown.<label>` | The tileset's `stats` after settling. Tilesets are named by a `label` the example gives them (vertical exaggeration: `terrain`, `osm`); unnamed ones by index. |
| Requests by host class | `requests.imagery`, `requests.ionContent`, `requests.ionEndpoint`, `requests.google`, `requests.other` | The browser's request log, classified by host, as `alphaSweep.mjs` does. Never the URL, which can carry a key. Local requests are ignored. |
| Requests by tileset | `requests.<label>` | The tileset's own `requestsTotal`. |
| Bytes by host class | `bytes.<class>` | As requests. |
| Triangles and draws | `triangles`, `draws`, `trianglesTerrainOnly` | Engine stats; terrain only by hiding other tilesets for a moment, as the α script did, where the scene asks for it. |
| The largest stretched error | `stretchedErrorMax`, `stretchedErrorP99`, `stretchedErrorOver` | `probe=sse` (`widgets/sseProbe.ts`), in a second page load only when the scene or the command asks for it (`--probe sse`), since the probe changes timing. |
| Settled | `settled` (0 or 1), `settleMs`, `settleReason`, `requestRateEnd` | Section 3's rule. A point that didn't settle is drawn hollow in every chart. |
| GPU per pass | `gpuPass.<name>` (median), `gpuPassP90.<name>` | `gpuSample` over `--gpu-ticks` (default 120) continuous ticks after settling, as the α script did. Pass names come from the engine; Analysis groups the small ones as "other". |
| Pixel difference from the reference | `pixelDiffShare` (share of pixels with linear luminance change over 0.1), `pixelDiffMean`, `flipRef` (FLIP mean), `flipRefP95` | The settled canvas against the reference point's, whole frame or a named crop (`crop` in the scene). FLIP uses the existing FLIP page. |
| Page errors | `pageErrors` | Counted; a point with errors is marked. |

The existing `flipEnd` stays what it is: the image difference from the baseline *engine*. `flipRef` is the difference from the reference *point* of the same engine.

### Analysis for multi-axis sweeps

The Sweeps tab grows into a study page for one sweep run, and becomes its own rail item, Sweeps (section 16). It follows DESIGN.md's page anatomy and charts.

- **Toolbar:** the sweep run, the scene (or the geometric mean), the x axis (any swept axis), "lines by" (another axis), "panels by" (the third, as small multiples), and a metric group.
- **Charts:** one line per value of the "lines by" axis, one panel per value of the "panels by" axis, the reference as a dashed line or a marked point, hollow markers for points that didn't settle, the noise floor as a band on pixel-difference charts. A table twin under every chart.
- **Image grid:** a thumbnail per point, laid out by the same two axes, each with its pixel difference from the reference as a word ("within noise", "4.1% of pixels"). A click opens the pair in the Images view's compare modes (side by side, swipe, flicker, FLIP heatmap), which take any two images, not only a check and its baseline.
- **Header:** the hypothesis, primary metric and guardrails, if the run declared them, and the scorecard's verdict per point against the reference.
- Parallel coordinates and parameter importance (§16.9) stay later: three axes read well as small multiples.

## 5. Branches, worktrees and purpose

### What a run records

Every run kind adds these fields to its result and summary:

| Field | Value | Source |
| --- | --- | --- |
| `id` | `<ISO stamp>-<machine>`, e.g. `2026-11-14T09-12-03-512Z-mac` | The file name, now with the machine alias so two machines never collide (section 8). The Images server's run-name check changes with it. |
| `purpose` | `dev` or `baseline` | `--purpose`, default `dev`. |
| `item` | `LT-4` | `--item`. |
| `plan` | `{ primary, guardrails, tolerance, hypothesis }` | Unchanged (`--primary`, `--guardrails`, `--tolerance`, `--hypothesis`). |
| `branch` | `claude/plan-dyno-harness-18e1ff` | Unchanged (`treeRef`). |
| `worktree` | `plan-dyno-harness-18e1ff` or `main checkout` | The basename of the worktree's top level. Never the full path (it carries the user name). |
| `base` | `{ ref: "cesium-2.0-webgpu-poc", sha }` | `git merge-base HEAD <integration branch>`; the integration branch is a catalog setting (`cesium-2.0-webgpu-poc` today, `main` after the merge). |
| `machine` | `mac`, `win` | `BENCH_MACHINE`, else a short alias derived from the platform and GPU, set once per machine by `npm run setup`. |

- **Baselines are guarded.** `--purpose baseline` is accepted only from a clean tree (`dirty: false`) on the integration branch, and only for `bench` and `images` runs. Anything else is refused with the reason. A baseline is the integration branch measured; nothing else is.
- **Old runs** (no `purpose` field) read as baselines: they are the history.
- **A run says what it is.** The CLI's first line names the purpose, item, branch and machine, and its last lines print the run ID and the Dyno path (`#/runs/<id>`, `#/analysis?sweep=<id>`, `#/images?run=<id>`).

### This branch against its base

The best before-and-after is inside one run, where configurations alternate. `--against-base` adds `2.0@<base sha>` to the run as the baseline engine and the working tree as the candidate, using the existing engines-at-refs machinery (snapshot worktrees under `.bench/<sha>`, built once). For sweeps, it adds the base engine at the reference point only. Recommended as the default way to measure a change (section 13).

### Trends, Runs and Compare

- **Trends** shows baselines by default. The toolbar gains a purpose choice (Baselines, Development, All), a branch picker and an item picker; the free-text search stays. Saved views and the URL carry them. Development runs drawn on a trend are dots off the line, never part of the control band or change-point detection.
- **Runs** gains columns for purpose (a badge with a word), item, branch and worktree, and the same three filters. A run's page shows its purpose, item, hypothesis, branch, worktree, base and machine above the report.
- **Compare** defaults to "this branch against its base" when it is opened from a branch (the Runs filter, a run's page, or `?branch=`): B is the branch's newest run, A is the newest baseline at or before its base commit with the same scenes and configuration, on the same machine. With no branch, today's default stays. The page says which rule picked the pair.
- **Alerts** read baselines only. A development run can't raise an alert.

### One run at a time per machine

Two runs at once share the GPU, and their timings mean nothing. The CLI takes a machine-wide lock, `~/.cesium-bench/run.lock` (process id, worktree, command, start), for any run that drives a browser. A second run waits with a line saying whose run holds it (`--no-wait` exits instead). A lock whose process is gone is taken over. The lock doesn't cover live dev servers people are looking at; a run records how many other browser GPU processes were alive at its start, and the report flags a busy GPU.

### Ports

- CLI runs start their own servers and need no Dyno page open. Their ports already move when taken.
- To look at results, a session opens Dyno on its own port: `npm run dyno` picks the first free port from 5200 to 5299, prints the URL, and never stops or reuses a server someone else started. The main checkout keeps 5190.
- Every Dyno reads the same store, so a link's path (`#/runs/<id>`) works in any of them. Agents report the path; the reader opens it in the Dyno they already have.

## 6. Bringing results back

- **Results stay in the shared store.** Nothing measured goes into a commit except numbers and run IDs in prose (plans, handbook, commit messages). No CSVs, PNGs or report HTML in the repo; no temporary folders.
- **An agent's report carries run IDs.** For each measurement: the run ID, the command, one line of what it showed (the verdict, or the numbers that matter), and the Dyno path. Larger findings go in the shared notes folder with the same IDs.
- **The main session finds them** with `cli.mjs runs`, which lists runs as a table or JSON with filters: `--item LT-4`, `--branch <name>`, `--worktree <name>`, `--purpose dev`, `--since 2026-11-13`, `--kind images`. `cli.mjs show <id>` prints a run's header, plan, scorecard and the development metrics per point. These read summaries only, so they are fast.
- **The owner finds them** in Dyno: Runs filtered by item or branch, each run's page, and the study page for sweeps. The main session's report to the owner gives the paths.
- **Plans cite run IDs** where they state a measured number, as they now cite commits: "valley ×4: 471 tiles at α 0.25 (run `2026-11-14T…-mac`)". A run cited by a plan is pinned (`cli.mjs pin <id> --reason "TG α default"`) so no clean-up removes it.

## 7. Unit tests in Dyno

**Recommendation: ingest vitest results; don't run tests from Dyno.**

- **Why ingest.** Tests already run where the code is: in each agent's worktree, through `npm test` and focused `npx vitest run`. What is missing is memory: which tests fail where, which flake, which are slow. A reporter that writes each vitest run into the store gives that from every worktree at no cost to the agents.
- **Why not run from Dyno.** Dyno's dev server has no endpoint that starts processes, and that is a property worth keeping: an endpoint that runs commands from a web page is a hole, and a test run started from the Dyno of one worktree would test that worktree only. A "copy command" button covers the convenience.

**How it works.**

- A small vitest reporter, `bench/suite/testsReporter.ts`, registered in the vitest block of `vite.config.ts` beside the default one. It writes `<store>/tests/<id>.json` when the store exists and `CI` is not set: per file and per test the status (passed, failed, skipped), duration and retry count; the run's branch, worktree, commit, `dirty`, `diffSha256`, machine and scope (`full` when no file filter was given, else `focused`); the vitest version and Node version.
- **Environment-only failures** are told apart by a table in the repo, `bench/suite/testEnvironment.json`: a test file, the precondition it needs and how to check it. Two to start:
  - `test/volumes.test.ts` needs 1.x's generated shaders (`packages/engine/Source/Shaders/**/*.js`, gitignored build output), absent in fresh worktrees; its oracle import then fails.
  - `test/data/**` needs `FRAMES_DATA` and the setup store.

  A failing test whose precondition is unmet is recorded as `environment`, not `failed`, with the precondition named.
- **Flakes** are computed, not declared: a test that both passed and failed on the same tree (same commit and `diffSha256`) is flaky, and its flake rate is failures over runs on unchanged trees. `test/noSceneGains.test.ts` is the known case; its cause isn't established yet (a time-dependent uniform word, or the 30 s timeout under load, are the guesses).
- **`cli.mjs tests [-- vitest args]`** runs vitest with the reporter and a `--purpose` and `--item`, for the cases where an agent wants to tag a test run; plain `npm test` records too, untagged.
- **A Tests view** (in the rail's first group with the other queues, section 16): failing now (newest full run per branch), flaky tests with their rate and last failure, environment-only failures with their precondition, the slowest files over time, and one test's history across branches. Retention: the newest 200 full runs and 500 focused runs; older ones are dropped, except runs cited by a plan.

## 8. The second machine

Runs from the Windows laptop carry machine details and stay out of the public repository. Three ways to bring the stores together:

| Option | For | Against |
| --- | --- | --- |
| A private results repository (the store folder as a git repository, pushed to a private remote) | History, merges by git, works with any number of machines. | Results stay internal to Bentley (§16.2), so the remote must be inside Bentley's organization; this Mac has no CesiumGS access (pushes go through the laptop). A personal remote is not cleared. |
| Syncing the store folder (OneDrive, Syncthing) | No commands. | Mutable shared files (`triage.json`, `baselines/*/baselines.json`, image reviews written into run files) conflict when both machines write; sync tools pick a winner silently. Same clearance question for a cloud folder. |
| **Archives, moved like the git bundles** | Fits today's routine (`git bundle` to a file, `scp` to the other machine). Nothing leaves the two machines. Merges are explicit and tested. | A manual step per sync. |

**Recommendation: archives now; a Bentley-internal results repository later if the owner wants one.**

- `cli.mjs export [--since <id or date>] [--out file]` writes a `.tar` of run files (results, summaries, reports, assets, test runs, image runs) newer than the last export to that machine, plus the mutable files. `cli.mjs import <file>` merges:
  - run files by ID (they carry the machine alias, so they never collide; an existing ID is skipped);
  - `triage.json` per alert key, the newer edit winning, with both kept in a `history` list;
  - baselines per renderer class: the two machines' classes differ (Apple M2 against an NVIDIA laptop GPU), so they don't conflict; a same-class conflict keeps both and lists it for review in Images;
  - annotations by date and text.
- The archive's name says the source machine and the newest run ID, as the bundles name their tip commit.
- Trends keeps hardware classes apart (it already filters by hardware); Machines in Analysis gains a row per machine as soon as both stores meet.

## 9. Recording from a live session

The recorder already writes every tick's numbers and optional frames into `~/.cesium-bench/inspector`. Two additions make a recording a run.

1. **Metadata.** When recording starts, the page posts one metadata body to a new endpoint, `/__record/meta?page=<id>`, before any rows: the path and parameters (query values matched against an allowlist of known parameters; anything that looks like a key or token, or any unknown parameter, is dropped), the example id, the camera pose, the view's settings (`lodExponent`, `shadows`, debug view), the canvas size and pixel ratio, and the adapter's description. The server adds branch, worktree, commit, `dirty` and machine. It is written beside the CSV as `<name>.meta.json`, through the same same-origin and size checks the plugin has.
2. **Save as run.** The inspector's recorder section gains "Save as run" after a recording stops (a purpose, an item and a note, prefilled from the URL's `item=` if present). The dev server reduces the CSV into a `recording` run in the results store: CPU and GPU per tick (median, p95), GPU per pass, tick interval percentiles from `t_ms`, tiles and requests at the end and at their peak, bytes, uploads, the first tick the loop went idle after loading, and the time series itself (the CSV copied into the run's asset folder, frames too). `cli.mjs import-recording <csv>` does the same from the terminal, for recordings already on disk.

In Dyno a recording shows in Runs with a "Recording" badge; its page shows the columns as time series (sparklines, a crosshair readout across all of them, the captured images on the timeline), since time series are how we read performance problems. Recordings never become baselines and are never compared by the scorecard (no repetitions, no controlled conditions); their page says so.

## 10. Acceptance cases

### A. The α sweep, redone as a Dyno sweep

```bash
node packages/next/bench/suite/cli.mjs run --scenes vex-valley,vex-zermatt --sweep param.x=1,4,10 --sweep view.lodExponent=0,0.25,0.5,0.75,1 --reference view.lodExponent=1 --reference-reps 3 --gpu-ticks 120 --probe sse --purpose dev --item TG-4 --primary tiles.terrain --guardrails pixelDiffShare,gpuP50 --hypothesis "α 0.25 to 0.5 draw α 1's image within noise with a third of its terrain tiles or fewer"
```

(`TG-4` stands for the transform-graph plan's increment 4, which asked for this sweep; the plan's own numbering applies.)

**Done when:**

- One run holds the 30-point grid (2 views × 3 factors × 5 values of α) plus the reference repetitions, in the store, with an ID the CLI printed.
- The study page shows terrain and OSM tiles, triangles, GPU per pass (median and p90), time to settle and whether it settled, requests by host class and by tileset, the largest stretched error, and pixel difference from α 1 with the noise band, by factor and α, one panel per view; the image grid shows all 30 images.
- The numbers agree with the 13 November sweep (`scripts/alphaSweep.mjs`: valley ×4 at 471 and 760 terrain tiles for α 0.25 and 0.5 against 2,161 at α 1; GPU 70 and 90 ms against 146; α 0 at 4.1% of pixels) within the noise, or the difference is explained by commits since.
- The α 1 runaway shows as it should: valley ×10 at α 1 drawn hollow (not settled at the cap), with its request rate at the end and imagery requests in the tens of thousands, not as a failed run.
- `scripts/alphaSweep.mjs` is deleted in the same change, and the transform-graph plan's α paragraph cites the run ID.

### B. The ×10 shadow-acne investigation as image checks and a sweep

The live hypothesis: the dark bands on ×10 cliffs form a regular grid seen at an angle, so they are most likely shadow acne, the shadow map's texel grid projected onto a ×10 wall at grazing incidence where the bias is too small. The suspects are the receiver's normal offset (2 cascade texels along a normal that may not be the drawn, warped one) and a slope-scaled bias that doesn't see the wall's drawn slope.

**Needs, from the engine (the shadow study's own work, not Dyno's):** `tune.shadow.normalOffsetTexels`, `tune.shadow.slopeBias`, `tune.shadow.depthBias`, `tune.shadow.offsetNormal` (`geometric` or `drawn`, the fix candidate) and a `debug=cascade` view that tints by cascade index.

**Step 1, image checks.** Group D checks on `vex-x10-zermatt` and its ×1 and ×4 siblings: shadows on, shadows off, sun off, `debug=cascade`, `debug=skirts`. Run with `cli.mjs images --scenes vex-x10-zermatt,vex-x4-zermatt,vex-x1-zermatt --purpose dev --item <shadow item>`. These pin today's look as baselines for the investigation, and the cascade tint shows whether the band spacing follows one cascade's texel size.

**Step 2, the sweep.**

```bash
node packages/next/bench/suite/cli.mjs run --scenes vex-x10-zermatt,vex-x1-zermatt --sweep tune.shadow.normalOffsetTexels=0,1,2,4,8 --sweep tune.shadow.slopeBias=-0.5,-1.5,-3,-6 --reference view.shadows=false --reference-reps 3 --purpose dev --item <shadow item> --primary pixelDiffShare --hypothesis "the bands fade as the normal offset and slope bias grow at ×10, and ×1 doesn't change"
```

- The primary metric is the pixel difference from shadows off within the `cliff` crop at ×10: acne darkens sun-facing walls that should be lit, so it falls as the bias becomes enough.
- The guardrail is ×1: there are no bands at ×1, so the same settings must leave ×1 within noise of its default; a bias that moves ×1 is detaching shadows (peter-panning), not fixing acne.
- A third run sweeps `tune.shadow.offsetNormal=geometric,drawn` at the default biases: if the drawn normal alone removes the bands at ×10 and leaves ×1 unchanged, that is the fix, and the bias sweep explains why.

**Done when:** the study page's image grid (normal offset across, slope bias down, ×10 and ×1 panels) shows where the bands go, the crop's pixel difference charts say the same in numbers, the cascade-tinted check is approved or rejected with a note, and the transform-graph plan's streak paragraph is updated with the run IDs and the conclusion, whichever it is.

## 11. Milestones

Sized for one agent each. Per the cost rules: Sonnet by default, Opus for DH-4 and DH-6 (the settings registry and sweep record, and the study page, are the design). Each milestone runs typecheck, eslint and prettier on its files and its own tests; the full `npm test` runs once at the end of DH-6 and again at the end of DH-12. UI milestones (DH-2, DH-6, DH-9, DH-10, DH-15) follow DESIGN.md and StrataKit, are checked in both themes, at 380 px, by keyboard and with a clean console, and the owner reviews them by clicking around. No durations: order and dependencies only.

| # | Milestone | Files | Done when | Needs |
| --- | --- | --- | --- | --- |
| DH-1 | **Run identity and the lock.** `purpose`, `item`, `worktree`, `base`, `machine` and the new `id` on every run kind (bench, images); the baseline guard; `--against-base`; the first and last lines naming the run and its Dyno paths; the machine-wide run lock; `npm run dyno` on a free port; old runs read as baselines. New commands get their own modules so later milestones touch `cli.mjs` less. | `bench/suite/cli.mjs`, new `bench/suite/identity.mjs`, `runLock.mjs`; `images.mjs`, `report.mjs` (`summarizeRun`), `data.ts`, `schema.ts`, `vite.config.ts` (the Images run-name check), `scripts/setup.mjs` (`BENCH_MACHINE`), `package.json` (`dyno`) | A dev run from a worktree records all five fields; `--purpose baseline` is refused from a dirty tree and from a feature branch (tested); two runs started together run one after the other, the second saying whose run it waited for; an existing store still loads in Dyno unchanged. | nothing |
| DH-2 | **Purpose, branch and item in the views.** Trends defaults to baselines and gains purpose, branch and item filters; Runs gains the columns and filters; a run's page shows its identity; Compare's "this branch against its base" default; Alerts on baselines only. | `views/Trends.tsx`, `trendsModel.ts`, `Runs.tsx`, `runParts.tsx`, `Compare.tsx`, `Report.tsx`, `Alerts.tsx`, `changepoints.mjs`, `routes.tsx` | With a store holding baselines and dev runs from two branches, Trends draws only baselines until asked; Compare opened from a branch picks the branch's newest run against the baseline at its base and says so; change-point tests show dev runs don't move alerts. Owner review. | DH-1 |
| DH-3 | **Finding runs from the terminal.** `cli.mjs runs` (filters, table and JSON), `show <id>`, `pin <id>`. | new `bench/suite/commands/runs.mjs`; `cli.mjs` (dispatch) | The commands list and show runs from summaries only; `--json` output is stable and tested; a pinned run is listed as pinned. | DH-1 |
| DH-4 | **The settings registry and multi-axis sweeps.** `settings.mjs`; validation before a run; `engine.` and `view.` settings applied by the catalog adapter (`lodExponent`, `shadows`, `debug`, `occlusionCull`, `coarsen`, `lod`); repeated `--sweep`, `--sweep-file`, `--reference`, `--reference-reps`, the point count and `--yes`; the sweep record with `axes`, `reference` and `points`, reading old one-axis records. (Opus.) | new `bench/suite/settings.mjs`; `cli.mjs`, `engineBuilds.mjs`, `engines.mjs` (labels), `suite.ts` (the adapter), `schema.ts`, `report.mjs` | `--sweep lodExponent=0,1` is refused with the list of settings; a two-axis sweep on a catalog scene records every point and its coordinates; `view.lodExponent` reaches the view (a test reads it back from the page); old sweep runs still plot. | DH-1 |
| DH-5 | **Example scenes and the development metrics.** `catalog/dev.json` and group D; `example.html` in the frozen build; the host pose contract (`camera=`) and declared example parameters; the settle rule with "not settled"; the metrics of section 4 (tiles and requests per tileset, requests and bytes by host class, triangles and draws, GPU per pass, `probe=sse`, page errors); tileset labels in the vertical-exaggeration example; group D kept out of headline means, Overview and budgets; "Measure this" in the Examples view. | new `bench/suite/catalog/dev.json`, `example.html`, `exampleDriver.ts`; `manifest.mjs`, `cli.mjs`, `frozen.mjs`, `schema.ts`, `report.mjs` (`METRICS`), `examples/index.ts`, `views/exampleRun.ts`, `views/Examples.tsx`, `examples/vertical-exaggeration/main.ts` (labels only), `scorecard.mjs` | `run --scenes vex-x10-zermatt` measures the example from the frozen build, records every metric in the table, and reports a capped run as not settled rather than failed; `param.x` sweeps; group D scenes don't change Overview's numbers. | DH-4 |
| DH-6 | **Reference images and the study page.** Captures per point; pixel difference and FLIP against the reference point, whole frame and crops; the noise floor from reference repetitions; the Sweeps page as a study page (axes as lines and panels, hollow unsettled points, noise band, table twins, the image grid); Images' compare modes for any two images. (Opus.) | `cli.mjs` (capture), new `bench/suite/reference.mjs`; `views/Sweeps.tsx` (Analysis renamed by DH-15), `analysis.css`, `views/Images.tsx` (compare any pair), `charts.mjs` | A three-axis sweep reads as small multiples with an image grid; a point within noise says so; a click on a thumbnail opens the pair in swipe and flicker. Owner review. | DH-4, DH-5 |
| DH-7 | **Acceptance A: the α sweep.** Run it, check it against the 13 November numbers, delete `scripts/alphaSweep.mjs`, cite the run in the transform-graph plan. | `scripts/alphaSweep.mjs` (deleted), `docs/superpowers/plans/2026-11-12-transform-graph.md` | Section 10A's "done when". | DH-6 |
| DH-8 | **Image checks for group D and sweeps.** `images.mjs` runs example and Lab scenes (`checks: ["settled"]`), takes `--sweep` and `--reference`, and records crops; Images labels group D checks and links them to the study page. | `images.mjs`, `cli.mjs`, `views/Images.tsx` | `images --scenes vex-x10-zermatt` captures, compares against its baseline and is reviewable; a swept image run shows as a grid. | DH-5, DH-6 |
| DH-9 | **Recordings as runs.** The metadata endpoint and body (allowlisted parameters, no tokens, tested); "Save as run"; the reducer; `import-recording`; the recording page with time series. | `scripts/vitePluginRecord.ts`, `widgets/recorder.ts`, `widgets/inspector.ts`, new `bench/suite/recording.mjs`, `views/Report.tsx` (or a new `Recording.tsx`), `cli.mjs` | A recording saved from the vertical-exaggeration example appears in Runs with its metadata and time series; a URL with an unknown or key-like parameter records without it (tested); the existing recorder tests pass. Owner review. | DH-1 |
| DH-10 | **Test results.** The vitest reporter, `testEnvironment.json`, flake computation, `cli.mjs tests`, retention, the Tests view. | new `bench/suite/testsReporter.ts`, `testEnvironment.json`, `commands/tests.mjs`, `views/Tests.tsx`, `tests.css`; `vite.config.ts` (vitest block, a read endpoint), `routes.tsx`, `shell.tsx` (rail) | A full `npm test` in a fresh worktree records `test/volumes.test.ts` as environment-only with its precondition; a test made to fail one run in three shows as flaky with its rate; nothing is written under `CI`. Owner review. | DH-1 |
| DH-11 | **The second machine.** `export` and `import` with the merge rules; archive naming; Machines with both stores. | new `bench/suite/commands/sync.mjs`; `cli.mjs` | Exporting from one store and importing into another twice gives the same store as importing once; a triage edit on each side keeps the newer with the other in its history; baselines of two renderer classes merge without review (tests on two temporary stores). | DH-1 |
| DH-12 | **Lab into the store.** One registry for Lab and `bench/run.mjs` (the six broken commands fixed); Lab scenes in group D; Lab's "Run" records a `lab` run when asked ("Run and record"); spikes' checks recorded. | `bench/run.mjs`, `lab/pages.ts`, `lab/harness.ts`, `views/Lab.tsx`, `cli.mjs`, `manifest.mjs` | Every id Lab shows runs headless; `run --scenes globe-parity` records FLIP per view; a recorded Lab run shows in Runs. | DH-1, DH-5 |
| DH-13 | **Acceptance B: the ×10 shadow study through Dyno.** Image checks and the sweeps of section 10B, the conclusion in the transform-graph plan. | the plan; the run IDs | Section 10B's "done when". | DH-8, and the engine's shadow knobs and `debug=cascade` (the shadow study's own task) |
| DH-14 | **AGENTS.md and the skill.** Land section 12's text, adjusted to what was built: a first version after DH-1 and DH-3 (tagging, run IDs, the lock, the commands that exist), the full version after DH-6. | `packages/next/AGENTS.md`, the skill (where section 13 decides) | A fresh session, given only "measure the effect of α at ×10", runs a tagged Dyno sweep and reports the run ID. | DH-1, DH-3 (first); DH-6 (full) |
| DH-15 | **The navigation rail** (section 16). The rail regrouped by what people come to do; Images and Tests beside Overview and Alerts as the queues; Analysis renamed Sweeps, with Machines moved into Overview; Examples in the looking group; the footer's Settings item; redirects from old routes (`/analysis`, `?tab=machines`); shortcuts and the command palette updated; DESIGN.md's information architecture, words and shell comment updated. | `bench/suite/shell.tsx`, `routes.tsx`, `views/Analysis.tsx` → `views/Sweeps.tsx`, `views/Overview.tsx` (machines, development runs), `views/FirstRun.tsx` (links), `DESIGN.md`, the route and link tests | Every route in section 16's inventory is reachable from the rail, a run, a scene or the palette, and highlights the right rail item; old links land on their new homes; the rail fits a 900 px tall window collapsed and expanded; DESIGN.md's table matches `shell.tsx`. Owner review by clicking around. | DH-2 |

**Order.** DH-1 first. Then DH-2, DH-3, DH-4, DH-9, DH-10 and DH-11 can run together: they touch different files, except `cli.mjs`, where each adds only a dispatch line once DH-1 has split the commands. DH-14's first version follows DH-3. DH-5 follows DH-4, then DH-6, then DH-7 and DH-8. DH-12 follows DH-5. DH-13 waits for DH-8 and the engine's knobs. DH-15 follows DH-2 (both change `routes.tsx`) and lands before DH-6 and DH-10, so the Sweeps page and the Tests view are built into the new rail rather than moved later.

## 12. Draft: AGENTS.md section and skill

### For `packages/next/AGENTS.md` (proposed text; not applied)

```markdown
## Measuring with Dyno

Dyno (`bench/suite/`, plan §16) is where we measure. Its results store
(`~/.cesium-bench/results`, `BENCH_RESULTS`) is outside the repo and shared by
every worktree on the machine, so a run you make is visible to the main
session and the owner as soon as it finishes.

- **When a measurement must be a Dyno run.** Any number that goes into a
  plan, the handbook, a commit message or a question for the owner. Any
  before-and-after of a change. Any sweep. Any measurement you make a second
  time.
- **Quick probes** (one number to steer your next edit, reported to nobody)
  may use the dev handle, the inspector or a short script. A probe you repeat,
  or want to report, becomes a Dyno scene or sweep first. Scripts that write
  CSVs or PNGs to temporary folders are not a way to report results.
- **Commands** (from the repository root):
  - `node packages/next/bench/suite/cli.mjs list` — scenes, including the
    development scenes (group D: gallery examples with parameters and a pose).
  - `… run --scenes <ids> --against-base` — your branch against its base in
    one run.
  - `… run --scenes <ids> --sweep <setting>=a,b,c [--sweep …]
    [--reference <setting>=v]` — a sweep over one or more settings
    (`cli.mjs settings` lists them; an unknown one is refused).
  - `… images --scenes <ids>` — image checks.
  - `… runs --item <item>` and `… show <id>` — find and read runs.
- **Tag every run.** `--item <plan item, e.g. LT-4>`; `--hypothesis "…"` with
  `--primary <metric>` and `--guardrails <metrics>` when you expect a change.
  Runs are development runs by default. Never pass `--purpose baseline` from a
  worktree: baselines are the integration branch, clean, measured by the main
  session.
- **One run at a time.** The CLI holds a machine-wide lock and waits for
  another session's run; let it. Don't measure while your own dev server
  renders in a visible page.
- **Your own port.** CLI runs start their own servers. To look at results,
  `npm run dyno` opens Dyno on a free port; never stop or reuse a server
  someone else started.
- **Report run IDs.** For each measurement: the run ID, the command, one line
  of what it showed, and the Dyno path the CLI printed (`#/runs/<id>`). Don't
  paste CSVs or commit images.
- **Tests record themselves.** `npm test` writes its results to the store
  (failures, flakes, environment-only failures such as missing 1.x shaders).
  Check Dyno's Tests view before deciding a failure is yours.
- Never put an ion token on a command line; Dyno and the examples take theirs
  from Dyno's token setting or `.env.local`.
```

### The skill (proposed text)

```markdown
---
name: measuring-with-dyno
description: Use when you need a number about rendering, streaming, GPU or
  image output in packages/next — before and after a change, a sweep of a
  setting, an image check, or an investigation — so it lands in Dyno's shared
  store and you can report a run ID.
---

# Measuring with Dyno

1. **Is it a probe or a measurement?** A probe steers your next edit and is
   reported to nobody: use the dev handle or the inspector. Anything you will
   report, repeat or compare is a measurement: continue.
2. **Pick or make the scene.** `cli.mjs list`. Catalog scenes compare 1.x
   and 2.0; group D scenes are gallery examples with parameters and a pose.
   If yours doesn't exist, add it to `bench/suite/catalog/dev.json` (public
   content only) in your change.
3. **State the hypothesis.** `--item`, `--hypothesis`, `--primary`,
   `--guardrails`. Write them before you look at results.
4. **Run the smallest thing that answers it.**
   - A change: `run --scenes … --against-base --tier quick`.
   - A setting: `run --scenes … --sweep <setting>=… [--sweep …]
     --reference <setting>=<value> --reference-reps 3`.
   - How it looks: `images --scenes …`.
   The CLI prints the point count first; above 60 browser runs it asks for
   `--yes`. Cut axes rather than repetitions of the reference.
5. **Read it.** `cli.mjs show <id>`, or the Dyno path it printed. A point
   drawn hollow didn't settle. A pixel difference "within noise" is no
   difference.
6. **Report.** Run ID, command, one line of result, Dyno path. Cite the run
   ID in any plan paragraph that states the number.
7. **Promote what you repeat.** A script you ran twice becomes a scene, a
   setting in `bench/suite/settings.mjs` or a metric in the development
   metrics, and the script is deleted.
```

## 13. Open questions for the owner

Each has a recommendation; the plan assumes them.

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| 1 | Unit tests: ingest vitest results, or run tests from Dyno? | **Ingest**, with a reporter that records every vitest run (full and focused, told apart) from every worktree, and a Tests view. No process-starting endpoint in Dyno. | Run from Dyno: a button per file, but only for the worktree whose Dyno it is, and an endpoint that executes commands. |
| 2 | Should plain `npm test` record into the store, or only `cli.mjs tests`? | **Plain `npm test` records** (when the store exists and `CI` isn't set). Flake rates need every run, and agents won't remember a flag. | Only tagged runs: cleaner store, little flake data. |
| 3 | Who may make baselines? | **Only clean runs of the integration branch**, enforced by the CLI; the main session makes them (after merges, or when a trend needs a point). Old runs count as baselines. | Any run tagged `baseline`: simpler, and one mistaken tag pollutes Trends. |
| 4 | The default way to measure a change: in one run against the base engine (`--against-base`), or two runs compared? | **In one run** (configurations alternate, so drift cancels). Compare's branch default stays for the cases where only separate runs exist. | Separate runs: half the browser runs per measurement, noisier comparisons. |
| 5 | The second machine: archives, a synced folder, or a private results repository? | **Archives** (`cli.mjs export` and `import`), moved like the git bundles. A Bentley-internal results repository later, if you want one and it is cleared. | A synced folder: no commands, but silent conflicts on triage and baselines, and a cloud service holding internal results. |
| 6 | Where does the skill live? `.claude/` is excluded in this clone (`.git/info/exclude`), so a skill there isn't committed today. | **Commit it at `.claude/skills/measuring-with-dyno/SKILL.md`** (adding it past the local exclude), so every worktree and the Windows clone get it; AGENTS.md links it. | Your user-level skills folder: works for every worktree on this Mac only. |
| 7 | Should the engine's development knobs (`tune.shadow.*`, `debug=cascade`) be public `View` options or development-only? | **Development-only**, through the dev handle, with no entry in `api/surface.txt`. If a knob proves useful to apps, it goes through the API review separately. | Public options now: visible to apps before we know the right values. |
| 8 | Should group D (development) scenes appear on Scenes and in Overview? | **On Scenes, under their own heading; never in Overview, headline means or budgets.** | Hidden everywhere except Analysis and Runs: less clutter, harder to find. |
| 9 | Retention for development runs: keep everything, or prune? | **Keep bench and image runs; prune tests and recordings by count** (section 7), never anything a plan cites (pinned). Revisit when the store passes a size you set. | Prune development runs older than a set age: smaller store, and plans' citations may break. |
| 10 | How should the rail be grouped? | **By what people come to do** (section 16, proposal A): what needs a look (Overview and the three queues), results, looking, experimenting, then setup in the footer. | By kind of object (proposal B): results, content, workbench; a smaller change from today. |
| 11 | Rename Analysis to Sweeps and move Machines into Overview? | **Yes.** With multi-axis studies, sweeps are the whole page; Machines is "where things stand", per machine. | Keep Analysis with two tabs, and add the study page as a third. |
| 12 | Where do Scenes go: with results, or with the tools for looking? | **With results.** A scene's page is mostly its history (best results, change points, filmstrip over time); it links to the Explorer for looking. | With the looking tools, since it is the catalog of what the Explorer opens. |
| 13 | The footer: keep Keyboard shortcuts and Theme as their own items? | **Fold them into one Settings item** beside Getting started and the ion token, so the rail fits a laptop window with the new items. | Keep four footer items and accept scrolling in the rail on short windows. |

## 14. Non-goals and follow-ups

- **Not here:** running benchmarks on CI or runner machines (§16.8 v2); the handbook reading the store instead of `bench/results` (a handbook change after DH-12); parallel coordinates and parameter importance; popping in motion as a metric (the α study measured static frames only; the transform-graph plan defines a pop as the largest screen displacement when tiles swap, and that metric is a follow-up once a camera path runs on example scenes).
- **Follow-ups owned elsewhere:** the engine's shadow tuning knobs and `debug=cascade` (the shadow study); a 1.x ×10 parity page at the example's close-up camera and sun (the transform-graph plan); `view.converged()` (the refinement plan, which DH-5 adopts when it lands).

## 15. Risks

- **The store becomes a dump.** Many sessions making dev runs could bury the history. Purpose defaults, the baseline guard, Trends' default and the item filter are the defence; retention handles the rest.
- **Sweeps that cost too much.** Grids grow fast. The printed point count, the confirmation above 60 browser runs and early stop limit it; the skill says to cut axes first.
- **A setting that isn't applied.** The registry closes the silent no-op for known settings; DH-4's test reads a setting back from the page so an adapter that stops applying it fails a test, not a study.
- **Example scenes drift from the examples.** An example may change its parameters or presets. Declared parameters make the CLI fail loudly when one disappears; group D image checks show a changed look.
- **Timings from a busy machine.** The lock serializes runs, but a person's open dev server still renders. The run records other GPU processes and flags them; development runs are judged within one run (against the base engine), which cancels most of it.
- **Secrets in metadata.** URLs and recordings could carry keys. Requests are classified by host, never stored as URLs; recording metadata keeps only allowlisted parameters; DH-9 tests a key-like parameter.

## 16. Dyno's navigation rail (owner, 2026-11-13)

The owner asked for a rethink of the left rail: the order and grouping of the pages no longer make obvious sense, and this plan adds pages. This section takes stock of what is built, groups it by what people come to do, and proposes a rail with one alternative. Milestone DH-15 builds it; questions 10 to 13 are the decisions.

### What the rail shows today

From `shell.tsx` (`GROUPS`, the footer) and `routes.tsx`. The rail is StrataKit's `NavigationRail`: a "Go to…" button (the command palette, Ctrl K) at the top, three groups separated by dividers with no headings, and a footer. DESIGN.md's table lists two groups as the code has them but leaves out Examples, and its footer row lists only Getting started and the ion token.

| Rail | Item (shortcut `g` + letter) | Route | Page's own sentence (or what it is for) |
| --- | --- | --- | --- |
| Top | Go to… | (palette) | Views, scenes, runs, examples and Lab pages by name. |
| Group 1 | Overview (`o`) | `/overview`, `/` | "Where 2.0 stands against 1.x in the latest run, and what needs a look." |
| | Trends (`t`) | `/trends` | Metrics run to run (the former Workspace), with control bands and annotations. |
| | Runs (`r`) | `/runs`, `/runs/$run` | "Every run of the suite: open one for its report, or select two to compare." |
| | Alerts (`a`, count) | `/alerts` | "Metrics that changed and stayed changed from one run to the next, to triage." |
| Group 2 | Scenes (`s`) | `/scenes`, `/scenes/$scene` | "Every scene in the catalog, with its best results in each engine." A scene's page is its history. |
| | Explorer (`e`) | `/explorer` | A catalog scene live in one or two engines, on its camera path or in free flight. |
| | Viewer (`v`) | `/viewer` | "One engine at a time, to debug content and try settings." |
| | Images (`i`, count) | `/images` | "Image checks that changed or are new, to approve or reject." |
| | Examples (`x`) | `/examples`, `/examples/$id` | "What 2.0 is for, one feature or use case each." Not in DESIGN.md's table. |
| Group 3 | Analysis (`n`) | `/analysis?tab=` | Two tabs: Sweeps (one setting or a release range) and Machines (latest run per hardware class). |
| | Lab (`l`) | `/lab`, `/lab/$id` | "Focused checks and measurements, one engine behavior each." |
| Footer | Getting started | `/start` | Setup checks and a first run. |
| | Keyboard shortcuts | (dialog) | |
| | Theme | (button) | Cycles light, dark and system. |
| | ion token | (popover) | The token every view uses, and which one is in use. |
| Off the rail | Compare | `/compare` | From Runs (two selected), an alert or a link. |

What doesn't fit any more:

- **Group 2 mixes three jobs.** Images is a review queue (a result, with a count, like Alerts). Explorer, Viewer and Examples are tools for looking. Scenes is the catalog, and a scene's page is mostly results over time.
- **Analysis is two unrelated pages.** Sweeps is experimenting; Machines is "where things stand", per machine.
- **The queues are split.** Alerts sits in group 1 and Images in group 2, though both are "what needs a look" with counts.
- **The new pages have no obvious home:** Tests (a queue and a history), development runs by branch or item (filters, not a page), group D scenes, the study page for multi-axis sweeps, recordings (runs of a new kind).
- **The footer has four items**, and the rail gains items: collapsed, 12 destinations (11 today and Tests), the palette and four footer items don't fit a 900 px tall window without scrolling.

### What people come to do

DESIGN.md's list, extended for the harness:

1. **See what needs a look:** where 2.0 stands, regressions to triage, images to approve, failing or flaky tests, what development runs landed for an item.
2. **Read results:** one run, two runs compared, metrics over time, one scene's history.
3. **Look at content live:** a scene in one or two engines, any content in one engine, an example.
4. **Experiment:** a sweep or study over settings, a focused Lab check.
5. **Set up:** first run, the ion token, theme and shortcuts.

### Proposal A (recommended): by what people come to do

| Group (DESIGN.md name; the rail shows dividers) | Items, in order | Changes |
| --- | --- | --- |
| Needs a look | Overview · Alerts · Images · Tests | Images moves up beside Alerts; Tests (DH-10) joins. The three queues carry counts. Overview gains a Machines section (from Analysis) and a "Development runs" section (the newest runs per plan item, from DH-1's fields). |
| Results | Trends · Runs · Scenes | Scenes moves here: its pages are history. Runs holds every run kind (bench, images, Lab, recordings; test runs open in the Tests view), filtered by purpose, branch and item (DH-2). Compare stays off the rail. |
| Look | Explorer · Viewer · Examples | The three live tools together. Examples keeps its page; its "Measure this" points at its group D scene. |
| Experiment | Sweeps · Lab | Analysis is renamed Sweeps and holds the sweep runs and the study page (DH-6). Lab keeps its pages; "Run and record" (DH-12). |
| Footer | Getting started · ion token · Settings | Settings (a menu) holds Theme and Keyboard shortcuts. |

- **Order inside the rail:** attention first, because that is where a person starts a day and where Overview's "to look at" list points; results next; looking and experimenting after; setup in the footer.
- **Shortcuts:** existing letters stay (`o t r a s e v i x l`); Tests takes `u`, Sweeps takes `w`, and `n` stays as an alias for Sweeps. The palette searches plan items and branches too ("Runs for LT-4").
- **Routes:** `/sweeps` and `/sweeps?run=<id>`; `/analysis` redirects there; `/analysis?tab=machines` redirects to `/overview#machines`; `/tests`. Child pages highlight their parent: a run's report and a recording highlight Runs, a scene highlights Scenes, a Lab page highlights Lab, an example highlights Examples, Compare highlights Runs.
- **Group D scenes** appear on Scenes under their own heading (question 8), never in Overview's verdict.
- **Names stay** where they work: Overview, Trends, Runs, Alerts, Images, Scenes, Explorer, Viewer, Examples, Lab. "Sweeps" replaces "Analysis" because the page is only sweeps once Machines leaves; DESIGN.md's banned words ("experiment", "workspace") stay banned as page names, so the group heading "Experiment" lives in DESIGN.md only, not on screen.

### Proposal B: by kind of object

| Group | Items |
| --- | --- |
| Results | Overview · Trends · Runs · Alerts · Images · Tests |
| Content | Scenes · Examples · Explorer · Viewer |
| Workbench | Analysis (Sweeps, Machines) · Lab |
| Footer | Getting started · ion token · Keyboard shortcuts · Theme |

The smaller change: Images moves to Results, Tests joins it, the middle group is renamed. Against it: a Results group of six mixes the queues with history, Machines stays hidden in a tab, and Scenes (history) sits with the live tools.

### StrataKit and DESIGN.md

- The rail stays StrataKit's `NavigationRail` with dividers between groups and the footer; no custom chrome. If the rail gains section headings, the group names above are its labels; until then, missing headings go in `STRATAKIT_FEEDBACK.md` with the reason (a 12-item rail is hard to scan without them).
- Counts stay as they are (a badge with an accessible label, "3 to look at"), now on Alerts, Images and Tests.
- DH-15 rewrites DESIGN.md's "Who it is for" list (section 16's five jobs), the information architecture table (proposal as built), the words list (Sweeps, recording, purpose, item) and `shell.tsx`'s header comment, in the same change.
