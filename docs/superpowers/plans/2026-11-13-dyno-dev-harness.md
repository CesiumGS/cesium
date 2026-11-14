# Dyno as the development harness: design plan

**Status (2026-11-13):** reviewed by the owner and revised. Nothing is built.

- **Accepted as recommended:** questions 1 to 4 and 6 to 13 (section 13 records each).
- **Changed:** question 5. There is no Bentley-internal results repository for now. Instead, a runner on the local network (section 8) lets the Mac request suite runs on the Windows laptop, with the results returned into the Mac's store. Archives moved by hand stay as the fallback.
- **Added:** studies, and the data model behind them (section 2). A study holds a question, a hypothesis, the runs that test it and a recorded verdict. Sweeps fold into study pages, and the rail's Experiment group becomes Studies and Lab (section 16).
- **Adjusted with the main session:**
  - Items are the work tracker's global IDs (`CS-<n>`), with no per-plan prefixes or letters.
  - The rail reserves the first place for the tracker's Work page.
  - This plan's AGENTS.md section lands in one coordinated change with the tracker's "Work items" section, with both skills in one place.
- **Milestone names:** DH-1 to DH-19 keep their names in this document. They become `CS-<n>` items under a development-harness initiative when the tracker lands; the tracker's session converts them after merge.
- **Open questions:** 14 to 18 (section 13), each with a recommendation the plan assumes.

**Goal:** every measurement that steers development goes through Dyno, so it lands in the results store, shows in Trends, and can be found again by its run and its study. Today the numbers behind recent decisions (the error exponent α, the ×10 cliff bands, the culling gains) came from one-off Playwright scripts that wrote CSVs and PNGs to temporary folders. Those numbers can't be compared with later ones, nobody can find them a week on, and the reasoning that turned them into a decision lives in chat.

- **Development cases are scenes.** A gallery example with its URL parameters, a pose and a debug view is a scene Dyno can run, measure and capture, beside the catalog's 1.x and 2.0 scenes.
- **Sweeps cover any setting Dyno knows** (engine, view, example parameter), over several axes at once, with the metrics we have been collecting by hand.
- **Every run says what it is for:** development or baseline, the tracker item it serves, the study it belongs to, its branch, worktree and machine. Development runs never pollute the baselines.
- **A study turns runs into a decision:** a question and a hypothesis, stated before results; the runs that test it; a verdict with its reasoning and the runs it cites.
- **Results come back by ID.** Agents leave their results in the shared store and report study and run IDs; the main session and the owner find them by item, study or branch.
- **Other sources reach the same store:** test results, live inspector recordings, and runs made on the laptop at the Mac's request.
- **New sessions learn it from AGENTS.md** and a short skill.

**Sources:**

- `CESIUM2_WEBGPU_PLAN.md` §16 (all of it), in particular:
  - §16.5 (interfaces) and §16.6 (engine names);
  - §16.7 (frozen builds, reuse, early stop, areas and tiers);
  - §16.9 (sweeps, Workspace, Alerts);
  - §16.10 (image checks).
- `packages/next/AGENTS.md`; `packages/next/bench/suite/DESIGN.md`.
- Code, read for this plan (paths under `packages/next/`):
  - the suite's core: `bench/suite/cli.mjs`, `engines.mjs`, `engineBuilds.mjs`, `frozen.mjs`, `report.mjs` (`summarizeRun`, `METRICS`), `schema.ts`, `images.mjs`, `suite.ts`, `data.ts`;
  - Dyno's app: `routes.tsx`, `shell.tsx`, `views/Analysis.tsx`, `Lab.tsx` and `lab/pages.ts`, `Examples.tsx`, `exampleRun.ts`, `Images.tsx`, `Trends.tsx`, `trendsModel.ts`, `Runs.tsx`, `Compare.tsx`;
  - `vite.config.ts` (`serveBenchResults`, the vitest block) and `bench/run.mjs`;
  - the recorder: `widgets/recorder.ts`, `recorderRows.ts`, `widgets/engine.ts`, `scripts/vitePluginRecord.ts`;
  - the one-off scripts: `scripts/alphaSweep.mjs`, `profilePage.mjs`, `runSpike.mjs`;
  - the engine where this plan touches it: `examples/vertical-exaggeration/`, `src/shaders/surface.slang` (`cascadeLight`), `src/scene/RenderContext.ts` (the caster pipeline's bias), `src/scene/View.ts`.
- `docs/superpowers/plans/2026-11-12-transform-graph.md` (the α findings and the ×10 cliff bands); `2026-11-13-refinement-and-convergence.md` (`view.converged()`, which replaces ad-hoc settle loops).
- The results store on this Mac, looked at on 2026-11-13:
  - `~/.cesium-bench/results` does not exist yet. No Dyno run has been made on the Mac; the history is on the Windows laptop.
  - `~/.cesium-bench/inspector` holds 119 recorder CSVs.

## 1. What Dyno does today, against our development uses

Facts from the code. "Gap" is what stops the use from going through Dyno now.

| Development use | What Dyno does today | Gap |
| --- | --- | --- |
| Measure a catalog scene, 2.0 against 1.x | `cli.mjs run` runs a frozen production build of the working tree (`frozen.mjs`, `<worktree>/.bench/tree`) in cold browser contexts, with configurations alternating, cooldown and quiet rules, baseline reuse and early stop. It writes a scorecard, a report and a summary. | None for this use. It is what Dyno was built for. |
| Before and after a change on my branch | Engines at any git ref (`2.0@main`, `2.0@<sha>`) run beside the working tree in one run. `compare <old> <new>` prints a benchstat table. | Nothing names the branch's base: the person types the ref. Compare's default is "the two newest non-sweep runs" (`Compare.tsx:69-74`), whoever made them. |
| A gallery example with URL parameters and a pose (vertical exaggeration at ×10 in the valley) | The Examples view hosts any example with free-form URL parameters (`/examples/$id?x=10&view=zermatt-close`, `exampleRun.ts`). Nothing is measured or written. The only side effect is a thumbnail in `localStorage`. | No run kind for examples, and no settle rule, metrics or capture. Poses exist only as each example's own presets (`view=`); there is no host-level pose. |
| A debug view (`&debug=skirts`, `level`, `error`, `stretch`) | `widgets/engine.ts` reads `debug`, `alpha`, `lod`, `occlusionCull`, `coarsen`, `probe=sse` and `record` from the page URL for any inspected engine, in development only. | Not reachable from a run: catalog scenes go through `suite.ts`, which reads none of these. |
| A parity page, a microbenchmark, a spike | Lab lists 27 harnesses (`lab/pages.ts`) and mounts them in Dyno. "Run" calls the harness and shows a toast; the result is discarded. The headless runner, `bench/run.mjs`, has its own registry and writes to `packages/next/bench/results/`, which Dyno never reads. | Results don't reach the store. Six Lab ids aren't keys in `run.mjs` (`custom-shader`, `shader-cost`, `translucency-cost`, `observer-cost`, `tracks-bench`, `worker`), so the command Lab shows for them fails. |
| A sweep of one engine setting | `run --sweep maximumScreenSpaceError=8,16,32` runs each 2.0 engine once per value, recorded as `results.sweep = {param, values, engines, points}`. Analysis plots each metric against the values, with the baseline engine as a dashed line. | One axis only: the option parser keeps the last `--sweep`. Unknown names are silently ignored. The value goes into the engine configuration with `setPath`, but `suite.ts` applies only `policy`, `maximumScreenSpaceError` and the budgeted options, so `--sweep lodExponent=0,1` would "succeed" with identical points. No view settings, no example parameters, no reference variant. |
| The metrics we collected by hand | `METRICS` (`report.mjs:40-65`): first content, settle, frame percentiles, CPU and GPU per frame, long frames, requests, bytes, heap, buffers, FLIP of the settled view against the baseline engine, quality in motion. | Tiles drawn per tileset; requests by host class and by tileset. The largest stretched error. Whether the view settled at all: a run that hits the cap fails instead of reporting "not settled". GPU per pass. Pixel difference from a reference variant of the same engine. |
| Image checks | `cli.mjs images` captures catalog scenes at points of their camera path and scores them with FLIP against approved images per renderer class. `--parity` compares against 1.x. It writes JUnit and Markdown. The Images view reviews them: side by side, swipe, flicker, FLIP heatmap, approve, reject. | Checks come from catalog scenes only. The Images view is generic over the row shape, so another producer could feed it. |
| Telling branches and worktrees apart | Each run records `branch` (`treeRef`), `commit`, `subject`, `dirty`, `diffSha256`, `note`, `tags` and the command. | No purpose, item, worktree, base commit or machine alias. Trends and Runs have no branch or tag filter, only a free-text search. Every worktree's Dyno shows the same store (good), with no way to say "baselines only". |
| A hypothesis and its outcome | `--primary`, `--guardrails`, `--tolerance` and `--hypothesis` go into `results.plan`, and the scorecard tests them per run. | A hypothesis lives on one run; most questions take several runs (a sweep, image checks, a before and after). Nothing records what was concluded, why, or which decision it informed. |
| Running several sessions at once | CLI servers prefer fixed ports with `strictPort: false` (run 5193, snapshots and images 5194, `bench/run.mjs` 5191), so they move up when taken. Dyno's dev server is `strictPort` on 5190; other worktrees pass `--port`. | Two runs at once share one GPU and corrupt each other's timings. Nothing serializes them. |
| Live sessions (the inspector's recorder) | One CSV row per tick (52 columns) and optional PNG frames, POSTed to the dev server and written to `~/.cesium-bench/inspector/<start>-<page>.csv`. | No metadata at all (no URL, engine, settings, pose, commit or adapter), and the store isn't Dyno's. |
| Unit tests | Nothing. Vitest runs with no JSON or JUnit reporter (`vite.config.ts:526-547`). | No history, so flaky tests and environment-only failures are rediscovered by each session. |
| The second machine | Results stay in each machine's own store. Trends separates hardware classes. | The Mac can't use the laptop's NVIDIA GPU, and the two stores never meet. |
| Telling agents how | AGENTS.md has no section on Dyno. | Sessions fall back to scripts. |

## 2. The data model: studies, runs and the rest

### From first principles

Benchmarking data answers five questions. The model gives each one a home.

1. **What can be measured?** These are definitions: content, a camera, settings, metrics. They live in the repository, versioned with the code that reads them.
2. **What was measured, where and how?** These are executions: one invocation, on one machine, of one commit, with its configurations. A run is immutable once written.
3. **What does the history say?** This is derived data: series over baseline runs, change points, flake rates. It can always be recomputed.
4. **What did we conclude?** These are judgements, made by a person or an agent: a study's verdict, an alert's triage, an approved image, an annotation. They are mutable, and each records who made it and when.
5. **Why did we measure, and what is it for?** This is the work: the tracker's items (`CS-<n>`), including the decisions waiting on the owner. It lives in the tracker, not in Dyno.

A **study** is the judgement that ties questions 2, 4 and 5 together. It holds a question and a hypothesis written before results, the runs that test it, and a verdict that cites them and informs a decision. A study doesn't execute anything; runs do. A run doesn't conclude anything; a study does.

### The model

```text
WORK (the tracker)     Item CS-<n> ─────────── decision items
                          │ serves                  ▲ informs
JUDGEMENTS (store)     Study ─ question, hypothesis, expectations, status
                          │      design: the runs it plans (commands)
                          │      notes: dated observations
                          │      verdict: outcome, reasoning, cited runs, decision ──┘
                          │ evidence: runs made for it, and runs attached to it
                          ▼ (a verdict may also cite any run, baselines included)
EXECUTIONS (store)     Run ─ kind, purpose, machine, commit, branch, worktree, item, study
                          │    design: configurations × scenes or checks or a Lab page,
                          │            optional sweep (axes, reference)
                          │    cells: scene × scenario × configuration → metric samples
                          │    captures (images, time series), result (scorecard), validity
DERIVED (computed)     Summary · Series · Change point · Flake rate · Noise floor
JUDGEMENTS (store)     Alert triage (on change points) · Approved image (on checks)
                       Annotation (on series) · Pin (on runs)
DEFINITIONS (repo)     Dataset · Scene (groups A to D) · Scenario · Check · Lab page
                       Setup · Setting · Metric · Budget · Area · Tier · Example
```

### Every concept, placed

| Concept | Layer | What it is | Relation to studies | Where it lives |
| --- | --- | --- | --- | --- |
| **Item** | Work | A tracker item, `CS-<n>`: a task, a decision, an investigation. | A study serves one item; several studies may serve one item. | The tracker. Dyno stores the ID only. |
| **Study** (new) | Judgement | A question, a hypothesis, expectations, a design, notes, a status (open, concluded or abandoned) and a verdict. | It is the study. | `<store>/studies/<id>.json` |
| **Expectations** | Judgement | The primary metric, the guardrails and the tolerance, declared before results (§16.9's "decide" practice). | A study declares them; its runs copy them into `plan`, so each run's scorecard tests them. | The study; a copy in each run |
| **Verdict** (new) | Judgement | Supported, refuted or inconclusive, with the reasoning, the runs cited (each with what it showed) and the decision it informs (`CS-<n>`). | It ends a study. | The study |
| **Run** | Execution | One invocation, one result file, one machine and commit. Its **kind** is `bench`, `images`, `lab`, `recording` or `tests`. | Evidence: a run made for a study records `study`. An earlier run can be attached. | `<store>/<id>.json`, with its summary and assets |
| **Purpose** | Execution | `baseline` (the integration branch, clean, the history Trends draws) or `dev` (everything else). | Study runs are dev runs. A verdict may cite baseline runs. | The run |
| **Sweep** | Execution | Part of a run's design: axes, points and a reference. It is one run because its points must alternate in one session for the statistics to hold. | A study's design may call for several runs (a sweep, an image run, a before and after); each sweep is one of them. | The run (`results.sweep`) |
| **Configuration** | Execution | An engine build with a setup and setting values, as a run resolved it (`2.0@main+view.lodExponent=0.5`). | Points of a sweep are configurations. | The run |
| **Cell**, **measurement** | Execution | Scene × scenario × configuration, with each metric's samples per repetition. | What the verdict's numbers come from. | The run |
| **Result** (a run's) | Derived | The scorecard's pass, marginal or fail on the run's expectations. | Input to the verdict, never the verdict itself. | Computed from the run |
| **Validity** | Derived | Valid, valid with warnings, or invalid, from the recorded conditions. | A verdict cites valid runs; Dyno warns when it doesn't. | Computed from the run |
| **Summary** | Derived | The run's compact form for lists and charts. | | `<id>.summary.json` |
| **Series** | Derived | Baseline runs of one scene, scenario, setup and machine for one metric, over commits: one line on Trends. | A study about a regression starts from a series. | Computed from summaries |
| **Change point**, **alert** | Derived, then judgement | A detected shift in a series (E-Divisive means), grouped across scenes into an alert with a triage state. | "Investigate" on an alert opens a study with the alert's runs attached. | Computed; triage in `triage.json` |
| **Noise floor** | Derived | The spread of a metric over repeated reference points. | It makes "within noise" a statement a verdict can rest on. | Computed from the run |
| **Flake rate** | Derived | A test's failures over runs on unchanged trees. | A study can investigate a flake like any regression. | Computed from test runs |
| **Scene**, **scenario** | Definition | Content with a camera path, in groups A to D (D: gallery examples and Lab pages, section 3); a scenario is what happens in a scene. | A study's runs name them. | `bench/suite/catalog/` |
| **Check** | Definition | A scene at a moment of its camera path (or settled), captured and compared. | Image runs capture checks; a study cites them. | The scene (`checks`) |
| **Approved image** | Judgement | The image a check is compared against, per renderer class (the files say "baselines"). | A study may approve a new image as part of its verdict. | `<store>/baselines/<class>/` |
| **Setup**, **setting** | Definition | A setup is named engine settings without a build (`2.0+stepwise`); a setting is one variable in the registry (section 4). | Sweep axes are settings. | The catalog; `bench/suite/settings.mjs` |
| **Engine** | Definition | 1.x or 2.0, from a release, the working tree or a git ref (§16.6). | | `engines.mjs` |
| **Metric**, **budget** | Definition | A measured quantity with units and a direction; a budget is a limit on one per scene. | Expectations name metrics. | `report.mjs`, the catalog |
| **Lab page** | Definition | A harness with `mount` and `run`. | A group D scene can name one. | `lab/pages.ts` |
| **Machine**, **runner** | Execution context | A machine is a computer with an alias (`mac`, `win`) and a hardware class. A runner is a machine that accepts runs from paired machines (section 8). | A study can use runs from both machines. | `BENCH_MACHINE`; pairing files |
| **Recording** | Execution | A run of kind `recording`: a live session's time series, with no repetitions and no controlled conditions. | Evidence for "what happens when", never for "faster". | The run |
| **Annotation** | Judgement | A dated note on series: method, machine, data, or (new) **decision**. | A concluded study whose decision lands adds a decision annotation at that commit. | `annotations.json`, the store |
| **Pin** | Judgement | Keeps a run out of retention. | A verdict pins every run it cites. | The run's sidecar |

### Studies in detail

```json
{
  "id": "2026-11-14-alpha-default",
  "item": "CS-<n>",
  "title": "The error exponent α for vertical exaggeration",
  "question": "Which α should the vertical exaggeration default to?",
  "hypothesis": "α 0.25 to 0.5 draw α 1's image within noise with a third of its terrain tiles or fewer.",
  "expectations": {
    "primary": "tiles.terrain",
    "guardrails": ["pixelDiffShare", "gpuP50"],
    "tolerance": 0.03
  },
  "design": [
    {
      "label": "α × factor in two views",
      "command": "run --scenes vex-valley,vex-zermatt --sweep param.x=1,4,10 --sweep view.lodExponent=0,0.25,0.5,0.75,1 --reference view.lodExponent=1 --reference-reps 3"
    }
  ],
  "attached": ["2026-11-13T…-win"],
  "notes": [{ "at": "…", "by": "…", "text": "α 1 at ×10 in the valley never settles." }],
  "status": "concluded",
  "verdict": {
    "outcome": "supported",
    "reasoning": "…",
    "cites": [{ "run": "2026-11-14T…-mac", "showed": "valley ×4: 471 terrain tiles at α 0.25 against 2,161 at α 1, image within noise" }],
    "decision": "CS-<n>",
    "by": "…",
    "at": "…"
  },
  "createdBy": { "branch": "…", "worktree": "…", "machine": "mac" },
  "updatedAt": "…",
  "history": []
}
```

- **IDs** are the creation date and a short slug, unique in the store. On import, a different study with the same ID gets a suffix and a warning.
- **Lifecycle.**
  - `open`: the hypothesis may be missing while the study explores; it must be stated before any run that tests it.
  - `concluded`: has a verdict.
  - `abandoned`: has a reason.
  - A concluded study can be reopened. The old verdict moves to `history`; nothing is deleted.
- **Evidence** is every run whose `study` field names the study, plus runs attached by hand (`study attach`, for runs made before the study existed or baselines it relies on). Runs stay immutable: attaching writes to the study, not the run.
- **A verdict is a statement with citations:**
  - Each cited run says what it showed, in a sentence with numbers and units.
  - Dyno warns when a cited run is invalid, belongs to another machine class than the claim, or is a recording used for a timing claim.
  - Cited runs are pinned.
  - "Inconclusive" is a full verdict: it says what would settle the question.
- **Decisions.** The verdict names the decision item it informs. Dyno doesn't write into the tracker. The tracker reads studies by item (`cli.mjs studies --item CS-<n> --json`, or the store directly) and shows the verdict on the decision. Closing the decision is the tracker's step (question 15).
- **A hypothesis on a run without a study** (`run --hypothesis "…"` with no `--study`) opens a study for it, named from the item and the date, so no hypothesis is left without a home (question 17).
- **Writes** come from the CLI and from Dyno's dev server (`POST /bench-results/studies/<id>`), validated against the schema and capped in size, like `triage.json` today. Each write records who (git `user.name`, or the agent's branch and worktree) and when.

### Commands

```bash
node packages/next/bench/suite/cli.mjs study new alpha-default --item CS-<n> --question "…" --hypothesis "…" --primary tiles.terrain --guardrails pixelDiffShare,gpuP50
```

```bash
node packages/next/bench/suite/cli.mjs run --study 2026-11-14-alpha-default --scenes vex-valley,vex-zermatt --sweep param.x=1,4,10 --sweep view.lodExponent=0,0.25,0.5,0.75,1 --reference view.lodExponent=1
```

```bash
node packages/next/bench/suite/cli.mjs study verdict 2026-11-14-alpha-default --outcome supported --cite <run> --reasoning "…" --decision CS-<n>
```

The full set:

- **`study new`** creates a study.
- **`study note <id> "…"`** adds a dated observation.
- **`study attach <id> <run>`** adds an earlier run as evidence.
- **`study verdict <id>`** records the verdict. `--cite` repeats as `run:what it showed`.
- **`study abandon <id> --reason`** and **`study reopen <id>`** change the status.
- **`study show <id>`** prints the study and its evidence.
- **`studies [--item] [--status] [--json]`** lists studies.
- **`run --study <id>`** inherits the study's item and expectations. Explicit options override them, and the run records the override.

### Words for DESIGN.md

Added to the vocabulary, one meaning each:

- **study**, **question**, **hypothesis**, **expectations** (primary metric, guardrails, tolerance), **evidence**;
- **verdict**, for studies only (supported, refuted, inconclusive);
- **result**, a run's scorecard (pass, marginal, fail);
- **validity** (valid, warning, invalid);
- **purpose**, **baseline run**, **development run**, **item** (`CS-<n>`);
- **sweep**, **axis**, **point**, **reference**, **setting**, **configuration**;
- **series**, **machine**, **runner**, **recording**.

Two rules:

- **Never "baseline" alone.** Say "baseline run" (purpose), "baseline and candidate" (the two engines a run compares), or "approved image" (what a check is compared against).
- **Never "verdict" for a run.** A run has a result and a validity; only a study has a verdict.

"Experiment" stays out of page names, as DESIGN.md already says.

## 3. Our development cases as runnable scenes and checks

### Example scenes

A group D scene names a gallery example, its parameters and how to frame it.

- **Where they live:** a new catalog file in the repo, `bench/suite/catalog/dev.json`, with public content only. Private ones go in a private manifest as today (`BENCH_MANIFEST`).
- **Licensing:** the loader merges it like the others and applies the same licensing rule. Each entry lists the datasets its example uses, so the rule still has something to check.

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

- **What runs it.**
  - The Playwright driver loads the example through a small host page, `bench/suite/example.html`. It mounts one example with the same `ExampleContext` the Examples view gives it (parameters, `setParams`, `watchParams`), at a fixed 1280×720 CSS px and pixel ratio 1.
  - The page joins `frozen.mjs`'s list of pages, so example scenes run from the frozen production build like every other run; `--dev` serves the live tree.
  - The Examples view stays for looking. It gains a "Measure this" button that copies the command, as the Explorer has.
- **The pose.**
  - Examples interpret their own parameters, so `view=zermatt-close` keeps working.
  - For an arbitrary pose, the host gives examples one shared contract: a `camera` parameter (`lon,lat,height,heading,pitch,range`, in degrees and metres, height above the ellipsoid as drawn). The host applies it after the example's own setup, through the engine's camera API.
  - An example opts out by declaring `pose: false` in `examples/index.ts`, for examples whose camera is the point of the example.
  - The Explorer's and the Viewer's "save this view" writes the same six numbers.
- **When it is settled.**
  - Until the refinement plan's `view.converged()` lands (§6 M11, R1 and R5), the driver uses `alphaSweep.mjs`'s rule, generalized. Every tileset reports nothing in flight, queued or loading, and the drawn triangle and tile counts hold for `holdMs`. The cap is `capSeconds`.
  - The engine's state is read, not an example's own "refining" indicator.
  - When `converged({ until: "converged" })` exists, the driver calls it with the cap as its timeout and records what was still pending.
  - A run that hits the cap is **not settled**, not failed. Its metrics are recorded with `settled: false`, the reason, and the request rate over its last 30 s ("still rising").
- **What it measures.** Section 4's development metrics, read through the dev handle (`globalThis.__cesium`) after settling, and the canvas captured for images.
- **1.x.**
  - An example has no 1.x adapter. A group D scene may name a 1.x counterpart (a Lab parity page with the same pose and sun), which then runs as the baseline engine.
  - The ×10 cliff study needs one (`scene.verticalExaggeration = 10` at the example's close-up camera and sun). It is a follow-up of the transform-graph plan, not a Dyno milestone.

### Lab pages as scenes

- **A Lab page can be a scene.** A Lab harness already has a module contract (`mount(root, params) → { run() }`). A group D scene can name one instead of an example (`"lab": "globe-parity", "params": {...}`).
- **Its result becomes the run's metrics:**
  - parity pages report FLIP per view;
  - microbenchmarks report their timings;
  - spikes report their checks (PASS or FAIL with `measured`, as `runSpike.mjs` prints).
- **One registry.** `bench/run.mjs` and Lab then read `lab/pages.ts`, which also fixes the six broken commands.
- **The handbook's folder stays for now.** `run.mjs` keeps writing `bench/results/` for the handbook until the handbook reads the store (section 14).

### The cases we have now

| Scene id | What | Notes |
| --- | --- | --- |
| `vex-valley` | Vertical exaggeration, valley preset, `x` swept | The α study (section 10). |
| `vex-zermatt` | The same, Zermatt close | Only OSM Buildings change with α here: terrain is at the data's finest level. |
| `vex-x10-zermatt` | ×10, Zermatt close, shadows on | The cliff-band study (section 10). Crop `cliff`. |
| `vex-skirts` | `debug=skirts` at ×10 | Kept as an image check: a regression would show magenta. |
| `globe-parity` | The `globe` suite's six views as one Lab scene | 1.x parity must hold through warp work. |

These sit next to the catalog's 1.x/2.0 scenes: same runs, same store, same views, filtered by group.

## 4. Settings, sweeps and the metrics we collected by hand

### A registry of settings

One file, `bench/suite/settings.mjs`, declares every setting a run can vary. Each entry has:

- an id and a person's label;
- a type and range;
- which run kinds accept it;
- how it is applied, by namespace:

| Namespace | Example ids | Applied by | Today |
| --- | --- | --- | --- |
| `engine.` | `engine.maximumScreenSpaceError`, `engine.policy`, `engine.motionBenefit`, `engine.render.pixelRatio` | The engine configuration, as now (`setPath`, `suite.ts`). | Exists, unvalidated. |
| `view.` | `view.lodExponent`, `view.shadows`, `view.debug`, `view.occlusionCull`, `view.coarsen`, `view.lod` | The adapter sets the `View` option (catalog scenes), or the host passes the generic parameter `widgets/engine.ts` already reads (example scenes). | Development URL parameters only. |
| `param.` | `param.x`, `param.view`, `param.contours` | The example's own URL parameter. An example declares its parameters (name, type, range, label) in `examples/index.ts`, so the CLI can check them and Dyno can label them ("exaggeration factor"). | Free-form, undeclared. |
| `tune.` | `tune.shadow.normalOffsetTexels`, `tune.shadow.slopeBias`, `tune.shadow.depthBias`, `tune.shadow.offsetNormal` | A development-only tuning object in the engine, reached through the dev handle. Not public API (question 7). | Hard-coded. The normal offset is `2.0` cascade texels in `cascadeLight` (`surface.slang`). The biases are fixed in the caster pipeline (`RenderContext.ts`: depth −2, slope −1.5). |

- **Validation.** An unknown id, a value out of range, or a setting the run's kind doesn't accept stops the CLI before anything runs, with the list of what is accepted. This closes today's silent no-op.
- **Old ids keep working.** Engine-variant ids such as `2.0+sse=32` and `2.0+maximumScreenSpaceError=8` read as before: `engine.` is the default namespace, so results already in the store read the same.
- **`tune.` knobs are engine work,** owned by whoever needs them (the cliff-band study needs the shadow ones). Dyno only passes them through.
- **The engine side follows the GPU safety rules.** A knob that changes a pipeline (the slope bias) rebuilds it once when set, never per tick. A shader knob is a uniform with a clamped range.

### Sweeps over several axes

```bash
node packages/next/bench/suite/cli.mjs run --scenes vex-valley,vex-zermatt --sweep param.x=1,4,10 --sweep view.lodExponent=0,0.25,0.5,0.75,1 --reference view.lodExponent=1 --reference-reps 3
```

- **A grid.** `--sweep` repeats; the run covers the grid of all axes, here 3 × 5 = 15 points per scene. `--sweep-file grid.json` takes axes and an explicit list of points, for grids that aren't full products.
- **Reference.**
  - `--reference <axis>=<value>`: each point is compared with the point that has the same other coordinates and the reference value on that axis.
  - `--reference-reps N` repeats the reference points N times, which gives the noise floor for pixel difference. The α study found about 2% of pixels change run to run. A difference within the floor reads "within noise".
  - A reference can also be a variant outside the grid (`--reference view.shadows=false`). Its points are added and run once per combination of the other axes.
- **Engines and order.**
  - Points run as configurations of one run, so they alternate within each repetition as today, and drift spreads across them.
  - Baseline reuse and early stop apply per point.
  - The reference points are never reused, since they set the noise floor.
- **The record.**
  - `results.sweep` becomes `{ axes: [{ id, values }], reference?, points: [{ coords: { "param.x": 10, "view.lodExponent": 0.5 }, configs: [...] }] }`.
  - A one-axis record from before reads as one axis.
  - Each point's configuration id spells its coordinates (`2.0+param.x=10+view.lodExponent=0.5`), so every existing reader (Trends' configuration lists, Compare, the scorecard) keeps working.
- **Cost.** The CLI prints the number of points × scenes × repetitions before it starts, and asks for `--yes` above 60 browser runs. There is no time estimate: the count is what the owner sees.

### The development metrics

They are recorded per run for group D scenes and, where the adapter can read them, for catalog scenes too. They go into `RunMetrics.dev` and into the summary's cells like any metric, so Trends, Compare and the sweep view can plot them.

| Metric | Key | How |
| --- | --- | --- |
| Tiles drawn and known, per tileset | `tiles.<label>`, `tilesKnown.<label>` | The tileset's `stats` after settling. Tilesets are named by a `label` the example gives them (vertical exaggeration: `terrain`, `osm`); unnamed ones by index. |
| Requests by host class | `requests.imagery`, `requests.ionContent`, `requests.ionEndpoint`, `requests.google`, `requests.other` | The browser's request log, classified by host, as `alphaSweep.mjs` does. Never the URL, which can carry a key. Local requests are ignored. |
| Requests by tileset | `requests.<label>` | The tileset's own `requestsTotal`. |
| Bytes by host class | `bytes.<class>` | As requests. |
| Triangles and draws | `triangles`, `draws`, `trianglesTerrainOnly` | Engine stats. Terrain only is measured by hiding other tilesets for a moment, as the α script did, where the scene asks for it. |
| The largest stretched error | `stretchedErrorMax`, `stretchedErrorP99`, `stretchedErrorOver` | `probe=sse` (`widgets/sseProbe.ts`), in a second page load, only when the scene or the command asks for it (`--probe sse`), since the probe changes timing. |
| Settled | `settled` (0 or 1), `settleMs`, `settleReason`, `requestRateEnd` | Section 3's rule. A point that didn't settle is drawn hollow in every chart. |
| GPU per pass | `gpuPass.<name>` (median), `gpuPassP90.<name>` | `gpuSample` over `--gpu-ticks` (default 120) continuous ticks after settling, as the α script did. Pass names come from the engine; the sweep view groups the small ones as "other". |
| Pixel difference from the reference | `pixelDiffShare` (share of pixels whose linear luminance changes by more than 0.1), `pixelDiffMean`, `flipRef` (FLIP mean), `flipRefP95` | The settled canvas against the reference point's, over the whole image or a named crop (`crop` in the scene). FLIP uses the existing FLIP page. |
| Page errors | `pageErrors` | Counted; a point with errors is marked. |

The existing `flipEnd` stays what it is: the image difference from the baseline *engine*. `flipRef` is the difference from the reference *point* of the same engine.

### The sweep view

One component shows a sweep run. It appears in two places: a run's report (Runs), and a study's page, where each sweep in the study's evidence is a section (section 16 folds the Sweeps tab into Studies). It follows DESIGN.md's charts.

- **Controls:** the scene (or the geometric mean), the x axis (any swept axis), "lines by" (another axis), "panels by" (the third, as small multiples) and a metric group.
- **Charts:**
  - one line per value of the "lines by" axis, and one panel per value of the "panels by" axis;
  - the reference as a dashed line or a marked point;
  - hollow markers for points that didn't settle;
  - the noise floor as a band on pixel-difference charts;
  - a table twin under every chart.
- **Image grid.**
  - A thumbnail per point, laid out by the same two axes. Each carries its pixel difference from the reference as words ("within noise", "4.1% of pixels").
  - A click opens the pair in the Images view's compare modes (side by side, swipe, flicker, FLIP heatmap). These take any two images, not only a check and its approved image.
- **Expectations:** the run's (or its study's) primary metric and guardrails, with the scorecard's result per point against the reference.
- **Later:** parallel coordinates and parameter importance (§16.9). Three axes read well as small multiples.

## 5. Branches, worktrees and purpose

### What a run records

Every run kind adds these fields to its result and summary:

| Field | Value | Source |
| --- | --- | --- |
| `id` | `<ISO stamp>-<machine>`, e.g. `2026-11-14T09-12-03-512Z-mac` | The file name, now with the machine alias, so two machines never collide (section 8). The Images server's run-name check changes with it. |
| `purpose` | `dev` or `baseline` | `--purpose`, default `dev`. |
| `item` | `CS-<n>` | `--item`, or inherited from `--study`. The CLI warns on anything not of the form `CS-<n>`. |
| `study` | `2026-11-14-alpha-default` | `--study`. |
| `plan` | `{ primary, guardrails, tolerance, hypothesis }` | The study's expectations and hypothesis, or the run's own options (`--primary`, `--guardrails`, `--tolerance`, `--hypothesis`), which override them. |
| `branch` | `claude/plan-dyno-harness-18e1ff` | Unchanged (`treeRef`). For a run on the runner, the requester's branch. |
| `worktree` | `plan-dyno-harness-18e1ff` or `main checkout` | The basename of the worktree's top level, never the full path (it carries the user name). For a run on the runner, the requester's worktree. |
| `base` | `{ ref: "cesium-2.0-webgpu-poc", sha }` | `git merge-base HEAD <integration branch>`. The integration branch is a catalog setting: `cesium-2.0-webgpu-poc` today, `main` after the merge. |
| `machine` | `mac`, `win` | `BENCH_MACHINE`, else a short alias derived from the platform and GPU, set once per machine by `npm run setup`. |
| `requestedBy` | `mac` | Runs made on a runner at another machine's request (section 8). |

- **Baselines are guarded.**
  - `--purpose baseline` is accepted only from a clean tree (`dirty: false`) on the integration branch, and only for `bench` and `images` runs. Anything else is refused with the reason.
  - A baseline run is the integration branch, measured; nothing else is.
- **Old runs** (no `purpose` field) read as baseline runs: they are the history.
- **A run says what it is.** The CLI's first line names the purpose, item, study, branch and machine. Its last lines print the run ID and the Dyno paths (`#/runs/<id>`, `#/studies/<study>`, `#/images?run=<id>`).

### This branch against its base

- **In one run.** The best before-and-after is inside one run, where configurations alternate. `--against-base` adds `2.0@<base sha>` to the run as the baseline engine, with the working tree as the candidate.
- **No new machinery.** It uses the existing engines at refs (snapshot worktrees under `.bench/<sha>`, built once).
- **For sweeps,** it adds the base engine at the reference point only.
- **The default way to measure a change** (accepted, question 4).

### Trends, Runs and Compare

- **Trends** shows baseline runs by default.
  - The toolbar gains a purpose choice (Baselines, Development, All), a branch picker and an item picker; the free-text search stays. Saved views and the URL carry them.
  - Development runs drawn on a trend are dots off the line, never part of the control band or change-point detection.
  - Decision annotations from concluded studies mark the commits where their decisions landed.
- **Runs** gains columns for purpose (a badge with a word), item, study, branch, worktree and machine, and filters on each.
  - A run's page shows its identity above the report, with a link to its study.
- **Compare** defaults to "this branch against its base" when opened from a branch (the Runs filter, a run's page, or `?branch=`).
  - B is the branch's newest run.
  - A is the newest baseline run at or before its base commit with the same scenes and configuration, on the same machine.
  - With no branch, today's default stays. The page says which rule picked the pair.
- **Alerts** read baseline runs only. A development run can't raise an alert.
  - "Investigate" on an alert opens a new study with the alert's runs attached and its question prefilled ("Why did `cpuP50` change between `<commit>` and `<commit>` on these scenes?").

### One run at a time per machine

Two runs at once share the GPU, and their timings mean nothing.

- **The lock.** The CLI takes a machine-wide lock, `~/.cesium-bench/run.lock` (process id, worktree, command, start), for any run that drives a browser, local or requested through the runner.
- **Waiting.** A second run waits, with a line saying whose run holds the lock; `--no-wait` exits instead. A lock whose process is gone is taken over.
- **Live dev servers aren't covered.** People look at pages while runs happen. A run records how many other browser GPU processes were alive at its start, and the report flags a busy GPU.

### Ports

- **CLI runs start their own servers** and need no Dyno page open. Their ports already move when taken.
- **To look at results,** a session opens Dyno on its own port. `npm run dyno` picks the first free port from 5200 to 5299 and prints the URL; it never stops or reuses a server someone else started. The main checkout keeps 5190.
- **Links work everywhere.** Every Dyno reads the same store, so a link's path (`#/runs/<id>`, `#/studies/<id>`) works in any of them. Agents report the path; the reader opens it in the Dyno they already have.

## 6. Bringing results back

- **Results stay in the shared store.**
  - Only numbers, run IDs and study IDs go into commits, as prose in plans, the handbook and commit messages.
  - No CSVs, PNGs or report HTML in the repo, and no temporary folders.
- **Work with a hypothesis is a study.** An agent opens a study (or joins the one its item already has), states the question and hypothesis before running anything, makes its runs with `--study`, and records a verdict when the evidence is in. An agent that can't conclude records "inconclusive" with what would settle it, or leaves the study open with a note.
- **An agent's report carries IDs:**
  - the study ID and its verdict in a sentence, or "open" with the latest note;
  - for each run, the run ID, the command, one line of what it showed, and the Dyno path;
  - larger findings in the shared notes folder, with the same IDs.
- **The main session finds them** with `cli.mjs studies --item CS-<n>`, `study show <id>`, and `cli.mjs runs` with filters (`--item`, `--study`, `--branch`, `--worktree`, `--purpose`, `--machine`, `--since`, `--kind`). `cli.mjs show <id>` prints a run's header, expectations, result and the development metrics per point. These commands read summaries and study files only, so they are fast.
- **The owner finds them** in Dyno:
  - Studies (open ones first, each with its verdict or latest note);
  - a study's page (question, evidence, verdict);
  - Runs, filtered by item, study or branch.

  The tracker's Work page shows each decision item's studies and verdicts once it exists.
- **Plans cite studies and runs** where they state a measured number, as they now cite commits: "valley ×4: 471 tiles at α 0.25 (study `2026-11-14-alpha-default`, run `2026-11-14T…-mac`)". A verdict pins the runs it cites; `cli.mjs pin <id>` pins others, so no clean-up removes them.

## 7. Unit tests in Dyno

**Decided (question 1): ingest vitest results; don't run tests from Dyno.** Plain `npm test` records too (question 2).

- **Why ingest.**
  - Tests already run where the code is: in each agent's worktree, through `npm test` and focused `npx vitest run`.
  - What is missing is memory: which tests fail where, which flake, which are slow.
  - A reporter that writes each vitest run into the store gives that from every worktree, at no cost to the agents.
- **Why not run from Dyno.**
  - Dyno's dev server has no endpoint that starts processes, and that property is worth keeping. An endpoint that runs commands from a web page is a hole.
  - A test run started from the Dyno of one worktree would test only that worktree.
  - A "copy command" button covers the convenience.

**How it works.**

- **The reporter.** A small vitest reporter, `bench/suite/testsReporter.ts`, registered in the vitest block of `vite.config.ts` beside the default one. When the store exists and `CI` is not set, it writes `<store>/tests/<id>.json` with:
  - per file and per test: the status (passed, failed, skipped), duration and retry count;
  - the run's branch, worktree, commit, `dirty`, `diffSha256` and machine;
  - its scope: `full` when no file filter was given, else `focused`;
  - the vitest and Node versions.
- **Environment-only failures** are told apart by a table in the repo, `bench/suite/testEnvironment.json`: a test file, the precondition it needs, and how to check it. Two to start:
  - `test/volumes.test.ts` needs 1.x's generated shaders (`packages/engine/Source/Shaders/**/*.js`, gitignored build output). They are absent in fresh worktrees, and its oracle import then fails.
  - `test/data/**` needs `FRAMES_DATA` and the setup store.

  A failing test whose precondition is unmet is recorded as `environment`, not `failed`, with the precondition named.
- **Flakes** are computed, not declared.
  - A test that both passed and failed on the same tree (same commit and `diffSha256`) is flaky. Its flake rate is failures over runs on unchanged trees.
  - `test/noSceneGains.test.ts` is the known case. Its cause isn't established yet; the guesses are a time-dependent uniform word, or the 30 s timeout under load.
- **Tagging.** `cli.mjs tests [-- vitest args]` runs vitest with the reporter plus `--purpose`, `--item` and `--study`, for an agent that wants to tag a test run (a flake investigation, say). Plain `npm test` records untagged.
- **A Tests view** in the rail's first group, with the other queues (section 16). It shows:
  - failing now (the newest full run per branch);
  - flaky tests, with their rate and last failure;
  - environment-only failures, with their precondition;
  - the slowest files over time;
  - one test's history across branches.
- **Retention:** the newest 200 full runs and 500 focused runs. Older ones are dropped, except runs a study cites (question 9).

## 8. The second machine: a runner on the local network

**Decided at review (question 5, changed):** no Bentley-internal results repository for now. A machine on the local network, the owner's Windows laptop with its NVIDIA GPU, runs suite runs on request from another machine (this Mac), and the results come back into the requester's store. Archives moved by hand (DH-11) stay as the fallback, and they are the format the runner returns.

### Roles

| Role | Machine | Command |
| --- | --- | --- |
| Runner | The laptop (`win`) | `cli.mjs runner serve`: listens while it runs, in a terminal the owner started. Nothing installs a service or starts it at login. |
| Requester | The Mac (`mac`) | `cli.mjs run … --on win` and `cli.mjs images … --on win`: the same commands, run elsewhere. |

A machine can be both. Pairing is per pair of machines, and each direction is paired on its own.

### Discovery and pairing

- **Discovery is an address the person types:** `host:port`, where `laptop.local` works if the network resolves mDNS names. Nothing is broadcast. An mDNS advertisement carrying only the alias and the certificate fingerprint is a later convenience, not part of this plan.
- **Pairing, once per pair:**
  1. On the runner: `cli.mjs runner pair`. It creates the runner's key and certificate on first use, prints the runner's alias, its address and a one-time pairing code (eight characters from an unambiguous alphabet), and waits.
  2. On the requester: `cli.mjs runner add win --address laptop.local:5280 --code <code>`.
  3. The two sides prove they hold the code without sending it, bound to the runner's certificate fingerprint and fresh nonces from both sides. A machine in the middle would need the code and would change the fingerprint. The code works once and allows three tries, and it expires when `runner pair` exits.
  4. On success, the runner generates a random 256-bit **pair secret** and sends it over the now-verified channel. Each side stores the other's alias, the runner's certificate fingerprint and the secret in `~/.cesium-bench/runner/pairs.json`, readable by the user only.
- **Unpairing:** `cli.mjs runner remove <alias>` on either side deletes the entry. The other side's requests then fail authentication.

### The channel

- **LAN only.**
  - The runner binds to the LAN interface the person names (or all private interfaces), never a public address. It refuses connections from outside private and link-local ranges (10/8, 172.16/12, 192.168/16, 169.254/16, fc00::/7, fe80::/10).
  - The runner tells the person to allow it on private networks only in the Windows firewall.
  - No UPnP, no port forwarding, no relay, nothing reachable from the internet.
- **Authenticated and encrypted.**
  - The requester talks to the runner over TLS. It pins the runner's certificate by the fingerprint learned at pairing; there is no certificate authority.
  - Every request is also signed with the pair secret: HMAC-SHA256 over the method, the path, a timestamp, a nonce and the body's SHA-256.
  - The runner rejects an unknown alias, a bad signature, a timestamp outside a small window, or a nonce it has already seen.
  - How the TLS key and certificate are made is DH-18's call. Node can't issue X.509 certificates by itself, so the choice is between a self-signed certificate made with OpenSSL (on Windows, the one bundled with Git) or a small reviewed dependency, and TLS with a pre-shared key derived from the pair secret. The requirements are fixed either way: authenticated both ways, encrypted, no certificate authority, nothing new listening when `runner serve` isn't running.
- **Endpoints** (all signed): `POST /v1/have` (which commits the runner has), `POST /v1/requests` (a request and its bundle), `GET /v1/requests/<id>/events` (progress), `DELETE /v1/requests/<id>` (cancel), `GET /v1/requests/<id>/archive` (the result). Nothing else answers.

### What a request carries

```json
{
  "request": "mac-2026-11-14T09-30-00Z-k3f9",
  "command": "run",
  "options": {
    "scenes": ["vex-valley", "vex-zermatt"],
    "sweep": ["param.x=1,4,10", "view.lodExponent=0,0.25,0.5,0.75,1"],
    "reference": "view.lodExponent=1",
    "referenceReps": 3,
    "purpose": "dev",
    "item": "CS-<n>",
    "study": "2026-11-14-alpha-default"
  },
  "commit": "<frozen sha>",
  "labels": { "branch": "claude/…", "worktree": "…", "machine": "mac" }
}
```

- **The commit.**
  - The requester freezes its working tree into a commit, exactly as a local run does (`frozen.mjs`: a commit object for a dirty tree, HEAD for a clean one).
  - It asks the runner which of the commit's ancestors it has (`/v1/have`, with the frozen commit, its base and the integration branch's tip). It sends a `git bundle` of the frozen commit, excluding what the runner has, plus the base commit when `--against-base` needs it.
  - The runner runs `git bundle verify`, then fetches the bundle into its own ref namespace (`refs/dyno/<requester>/<request>`), with no tags and no other refs.
  - A size cap applies to the bundle.
- **The command** is one of the suite's own: `run` or `images`. It is never a string to execute, and never a path, an environment variable or a shell fragment.
  - Options are a structured object checked against the same option schema the CLI uses. Each option is allowlisted and typed.
  - Scenes, settings (the registry), metrics and engine specs are validated against the runner's catalog at the requested commit. Engines at refs may only name commits inside the bundle.
  - Not allowed: `--dev`, `BENCH_MANIFEST`, `report`, `compare`, `annotate`, `resummarize`, `import`, `export`, file arguments of any kind.
  - The runner builds the argument list itself and starts `node cli.mjs` without a shell.
- **The ion token is never in a request.** Each machine uses its own: the runner's frozen checkout copies the runner's own `.env.local`, as `checkoutFrozen` already does, or its Dyno token setting. The result archive never includes either.
- **Trust.** "Only the suite's commands" bounds the entry point, not the code. Building and running a commit runs that commit's code (its Vite config, its pages, the engine). Pairing therefore means the runner trusts the requester's commits as it would trust checking out the requester's branch. Both machines are the owner's (question 16).
- **Dependencies.** The runner never installs packages from a request. If the commit's `package-lock.json` differs from what the runner has installed, the request fails with "package-lock.json differs: run `npm ci` on the runner". Nothing downloads on a requester's say-so.

### The runner side

- **States:** `queued` → `fetching` → `building` → `running` → `packing` → `done`, or `failed`, or `cancelled`.
- **Its own worktree.** The runner checks the commit out into `.bench/remote/<requester>`, reused between requests, and builds the frozen pages there. The runner's own checkout and its other worktrees are untouched.
- **Its own lock.** A request takes the same machine-wide run lock as a local run (DH-1), so the laptop never runs two things at once. While a request waits, its events say whose run holds the lock.
- **Identity.** The run is recorded on the runner with `machine: win`, `requestedBy: mac`, the request ID, and the requester's labels (branch, worktree, item, study).
- **Baseline runs on the runner** are allowed when the requested commit is reachable from the integration branch's tip, which the runner fetches into its namespace and checks with `merge-base --is-ancestor`, and the tree was clean (question 18).
- **The result** is an archive of exactly that run's files (result, summary, report, assets), made with DH-11's `export`. The runner keeps it until the requester has fetched it, or until the newest 20 archives push it out. The runner's own store keeps the run too, so its Trends sees it.

### Progress and cancellation

- **Progress.** `/v1/requests/<id>/events` streams the state changes and the CLI's progress as structured lines: `{ phase, done, total, scene, config }`, plus the queue position while waiting. The requester's CLI prints them as a local run would. Dyno's Runs page shows requested runs in flight, with their state, read from the requester's local record of open requests.
- **Disconnects.** If the requester disconnects, the run continues. `cli.mjs runner status` lists open requests; `cli.mjs runner fetch <request>` collects the archive later and imports it.
- **Cancellation.** Ctrl-C in the requester's CLI asks "cancel the run on win?". `cli.mjs runner cancel <request>` does the same. The runner stops the run's process tree, releases the lock, deletes partial results, and keeps the worktree for reuse.

### Getting results home

- **Import.** The requester imports the archive with DH-11's `import`. The run's ID carries `win`, so it never collides. The run appears in the Mac's Runs, Trends (under the laptop's hardware class), its study's evidence, and `cli.mjs runs --machine win`.
- **Reach.** Studies work across machines. A verdict can cite runs from both, and Dyno warns when a timing claim mixes hardware classes.
- **The fallback.** Archives by hand: `cli.mjs export` on one machine, `scp`, `cli.mjs import` on the other. The merge rules are below, and they are the same ones the runner's results use.

### Archives and their merge rules (DH-11)

- **`cli.mjs export [--since <id or date>] [--out file]`** writes a `.tar` of run files (results, summaries, reports, assets, test runs, image runs) newer than the last export to that machine, plus the mutable files (triage, approved images, annotations, studies).
- **`cli.mjs import <file>`** merges:
  - run files by ID (they carry the machine alias, so they never collide; an existing ID is skipped);
  - `triage.json` per alert key: the newer edit wins, with both kept in a `history` list;
  - approved images per renderer class: the two machines' classes differ (Apple M2 against an NVIDIA laptop GPU), so they don't conflict; a same-class conflict keeps both and lists it for review in Images;
  - studies per ID: the newer `updatedAt` wins, with the other version in `history`; a different study under the same ID gets a suffix;
  - annotations by date and text.
- **Names.** The archive's name says the source machine and the newest run ID, as the git bundles name their tip commit.

## 9. Recording from a live session

The recorder already writes every tick's numbers and optional frames into `~/.cesium-bench/inspector`. Two additions make a recording a run.

1. **Metadata.**
   - When recording starts, the page posts one metadata body to a new endpoint, `/__record/meta?page=<id>`, before any rows. It carries:
     - the path and parameters, with query values matched against an allowlist of known parameters (anything that looks like a key or token, and any unknown parameter, is dropped);
     - the example id and the camera pose;
     - the view's settings (`lodExponent`, `shadows`, debug view);
     - the canvas size and pixel ratio, and the adapter's description.
   - The server adds branch, worktree, commit, `dirty` and machine.
   - It is written beside the CSV as `<name>.meta.json`, through the same same-origin and size checks the plugin has.
2. **Save as run.**
   - After a recording stops, the inspector's recorder section offers "Save as run", with a purpose, an item, a study and a note, prefilled from the URL's `item=` and `study=` if present.
   - The dev server reduces the CSV into a `recording` run in the results store:
     - CPU and GPU per tick (median, p95), and GPU per pass;
     - tick interval percentiles from `t_ms`;
     - tiles and requests at the end and at their peak; bytes; uploads;
     - the first tick the loop went idle after loading;
     - the time series itself (the CSV copied into the run's asset folder, frames too).
   - `cli.mjs import-recording <csv>` does the same from the terminal, for recordings already on disk.

In Dyno, a recording shows in Runs with a "Recording" badge. Its page shows the columns as time series (sparklines, a crosshair readout across all of them, the captured images on the timeline), since time series are how we read performance problems. Recordings never become baseline runs and are never compared by the scorecard: they have no repetitions and no controlled conditions, and their page says so. A study may cite one for what happens and when, never for what is faster.

## 10. Acceptance cases

Both are studies from start to finish.

### A. The α study, redone through Dyno

```bash
node packages/next/bench/suite/cli.mjs study new alpha-default --item CS-<n> --question "Which error exponent α should the vertical exaggeration default to?" --hypothesis "α 0.25 to 0.5 draw α 1's image within noise with a third of its terrain tiles or fewer" --primary tiles.terrain --guardrails pixelDiffShare,gpuP50
```

```bash
node packages/next/bench/suite/cli.mjs run --study <study id> --scenes vex-valley,vex-zermatt --sweep param.x=1,4,10 --sweep view.lodExponent=0,0.25,0.5,0.75,1 --reference view.lodExponent=1 --reference-reps 3 --gpu-ticks 120 --probe sse
```

The decision this study informs was already made (α 0.3, the owner, 2026-11-13). The study records its evidence in Dyno after the fact, and its verdict names that decision.

**Done when:**

- **The run.** One run holds the 30-point grid (2 views × 3 factors × 5 values of α) plus the reference repetitions, in the store and in the study's evidence, with an ID the CLI printed.
- **The study page** shows, by factor and α with one panel per view:
  - terrain and OSM tiles, and triangles;
  - GPU per pass (median and p90);
  - time to settle, and whether it settled;
  - requests by host class and by tileset;
  - the largest stretched error;
  - pixel difference from α 1, with the noise band.

  Its image grid shows all 30 images.
- **The numbers agree** with the 13 November sweep, within the noise, or the difference is explained by commits since. That sweep (`scripts/alphaSweep.mjs`) found, for valley ×4:
  - 471 and 760 terrain tiles for α 0.25 and 0.5, against 2,161 at α 1;
  - GPU 70 and 90 ms, against 146;
  - α 0 differing from α 1 by 4.1% of pixels.
- **The α 1 runaway shows as it should:** valley ×10 at α 1 is drawn hollow (not settled at the cap), with its request rate at the end and imagery requests in the tens of thousands, not reported as a failed run.
- **The verdict** is recorded (supported, refuted or inconclusive) with the cited run and the decision item.
- **Cleanup.** `scripts/alphaSweep.mjs` is deleted in the same change, and the transform-graph plan's α paragraph cites the study.
- **The second machine.** After DH-19, the same run with `--on win` lands in the Mac's store as `machine: win` and joins the study's evidence.

### B. The ×10 cliff-band study: image checks and a sweep

The live hypothesis: the dark bands on ×10 cliffs form a regular grid seen at an angle, so they are most likely shadow acne. The shadow map's texel grid is projected onto a ×10 wall at grazing incidence, where the bias is too small. The suspects:

- the receiver's normal offset, 2 cascade texels along a normal that may not be the drawn (warped) one;
- a slope-scaled bias that doesn't see the wall's drawn slope.

```bash
node packages/next/bench/suite/cli.mjs study new x10-cliff-bands --item CS-<n> --question "What draws the regular dark bands on ×10 cliffs?" --hypothesis "Shadow acne: the bands fade as the normal offset and slope bias grow at ×10, and ×1 doesn't change" --primary pixelDiffShare
```

**Needs, from the engine:** the cliff-band study's own work, not Dyno's:

- `tune.shadow.normalOffsetTexels`, `tune.shadow.slopeBias` and `tune.shadow.depthBias`;
- `tune.shadow.offsetNormal`, which is `geometric` or `drawn` (the fix candidate);
- a `debug=cascade` view that tints by cascade index.

**Step 1, image checks.** Group D checks on `vex-x10-zermatt` and its ×1 and ×4 siblings: shadows on, shadows off, sun off, `debug=cascade`, `debug=skirts`. Run with `cli.mjs images --study <id> --scenes vex-x10-zermatt,vex-x4-zermatt,vex-x1-zermatt`. These pin today's look as approved images for the investigation. The cascade tint shows whether the band spacing follows one cascade's texel size.

**Step 2, the sweep.**

```bash
node packages/next/bench/suite/cli.mjs run --study <id> --scenes vex-x10-zermatt,vex-x1-zermatt --sweep tune.shadow.normalOffsetTexels=0,1,2,4,8 --sweep tune.shadow.slopeBias=-0.5,-1.5,-3,-6 --reference view.shadows=false --reference-reps 3
```

- **The primary metric** is the pixel difference from shadows off, within the `cliff` crop at ×10. Acne darkens sun-facing walls that should be lit, so it falls as the bias becomes enough.
- **The guardrail is ×1.** There are no bands at ×1, so the same settings must leave ×1 within noise of its default. A bias that moves ×1 is detaching shadows (peter-panning), not fixing acne.

**Step 3, the fix candidate.** A third run sweeps `tune.shadow.offsetNormal=geometric,drawn` at the default biases. If the drawn normal alone removes the bands at ×10 and leaves ×1 unchanged, that is the fix, and the bias sweep explains why.

**Done when:**

- The study page holds all three runs as evidence.
- Its image grid (normal offset across, slope bias down, ×10 and ×1 panels) shows where the bands go, and the crop's pixel-difference charts say the same in numbers.
- The cascade-tinted check is approved or rejected with a note.
- The verdict cites the runs. The transform-graph plan's streak paragraph is updated with the study ID and the conclusion, whichever it is.

## 11. Milestones

How they are run:

- **Size and models.** Each milestone is sized for one agent. Per the cost rules, Sonnet by default. Opus for the design-heavy and risky ones:
  - DH-4: the settings registry and the sweep record;
  - DH-6: the sweep view;
  - DH-16: the study model;
  - DH-17: the study page;
  - DH-18: the runner's channel.
- **Checks.** Each milestone runs typecheck, eslint and prettier on its files, plus its own tests. The full `npm test` runs once at the end of DH-6, DH-12, DH-17 and DH-19.
- **UI milestones** (DH-2, DH-6, DH-9, DH-10, DH-15, DH-17) follow DESIGN.md and StrataKit. They are checked in both themes, at 380 px, by keyboard and with a clean console, and the owner reviews them by clicking around.
- **No durations:** order and dependencies only.
- **Names:** DH-1 to DH-19 become `CS-<n>` items under a development-harness initiative when the tracker lands.

| # | Milestone | Files | Done when | Needs |
| --- | --- | --- | --- | --- |
| DH-1 | **Run identity and the lock.** `purpose`, `item` (`CS-<n>`), `study`, `worktree`, `base`, `machine`, `requestedBy` and the new `id` on every run kind (bench, images). The baseline guard and `--against-base`. The CLI's first and last lines, naming the run and its Dyno paths. The machine-wide run lock; `npm run dyno` on a free port. Old runs read as baseline runs. New commands get their own modules, so later milestones touch `cli.mjs` less. | `bench/suite/cli.mjs`, new `bench/suite/identity.mjs`, `runLock.mjs`; `images.mjs`, `report.mjs` (`summarizeRun`), `data.ts`, `schema.ts`, `vite.config.ts` (the Images run-name check), `scripts/setup.mjs` (`BENCH_MACHINE`), `package.json` (`dyno`) | A dev run from a worktree records every field. `--purpose baseline` is refused from a dirty tree and from a feature branch (tested). Two runs started together run one after the other, the second saying whose run it waited for. An existing store still loads in Dyno unchanged. | nothing |
| DH-2 | **Purpose, branch, item and study in the views.** Trends defaults to baseline runs and gains purpose, branch and item filters. Runs gains the columns and filters. A run's page shows its identity. Compare gets its "this branch against its base" default. Alerts work on baseline runs only. | `views/Trends.tsx`, `trendsModel.ts`, `Runs.tsx`, `runParts.tsx`, `Compare.tsx`, `Report.tsx`, `Alerts.tsx`, `changepoints.mjs`, `routes.tsx` | With a store holding baseline runs and dev runs from two branches, Trends draws only the baseline runs until asked. Compare opened from a branch picks the branch's newest run against the baseline run at its base, and says so. Change-point tests show dev runs don't move alerts. Owner review. | DH-1 |
| DH-3 | **Finding runs from the terminal.** `cli.mjs runs` (filters, table and JSON), `show <id>`, `pin <id>`. | new `bench/suite/commands/runs.mjs`; `cli.mjs` (dispatch) | The commands list and show runs from summaries only. `--json` output is stable and tested. A pinned run is listed as pinned. | DH-1 |
| DH-4 | **The settings registry and multi-axis sweeps.** (Opus.) `settings.mjs`, and validation before a run. `engine.` and `view.` settings applied by the catalog adapter (`lodExponent`, `shadows`, `debug`, `occlusionCull`, `coarsen`, `lod`). Repeated `--sweep`, `--sweep-file`, `--reference`, `--reference-reps`, the point count and `--yes`. The sweep record with `axes`, `reference` and `points`, reading old one-axis records. | new `bench/suite/settings.mjs`; `cli.mjs`, `engineBuilds.mjs`, `engines.mjs` (labels), `suite.ts` (the adapter), `schema.ts`, `report.mjs` | `--sweep lodExponent=0,1` is refused with the list of settings. A two-axis sweep on a catalog scene records every point and its coordinates. `view.lodExponent` reaches the view: a test reads it back from the page. Old sweep runs still plot. | DH-1 |
| DH-5 | **Example scenes and the development metrics.** `catalog/dev.json` and group D; `example.html` in the frozen build. The host pose contract (`camera=`) and declared example parameters. The settle rule, with "not settled". The metrics of section 4: tiles and requests per tileset, requests and bytes by host class, triangles and draws, GPU per pass, `probe=sse`, page errors. Tileset labels in the vertical-exaggeration example. Group D kept out of headline means, Overview and budgets. "Measure this" in the Examples view. | new `bench/suite/catalog/dev.json`, `example.html`, `exampleDriver.ts`; `manifest.mjs`, `cli.mjs`, `frozen.mjs`, `schema.ts`, `report.mjs` (`METRICS`), `examples/index.ts`, `views/exampleRun.ts`, `views/Examples.tsx`, `examples/vertical-exaggeration/main.ts` (labels only), `scorecard.mjs` | `run --scenes vex-x10-zermatt` measures the example from the frozen build and records every metric in the table. A capped run is reported as not settled, not failed. `param.x` sweeps. Group D scenes don't change Overview's numbers. | DH-4 |
| DH-6 | **Reference images and the sweep view.** (Opus.) Captures per point. Pixel difference and FLIP against the reference point, over the whole image and crops. The noise floor from reference repetitions. The sweep view as a component (axes as lines and panels, hollow unsettled points, noise band, table twins, the image grid), shown in a sweep run's report and, until DH-17, in Analysis's Sweeps tab. Images' compare modes for any two images. | `cli.mjs` (capture), new `bench/suite/reference.mjs`, new `views/SweepView.tsx`; `views/Report.tsx`, `views/Analysis.tsx`, `analysis.css`, `views/Images.tsx` (compare any pair), `charts.mjs` | A three-axis sweep reads as small multiples with an image grid. A point within noise says so. A click on a thumbnail opens the pair in swipe and flicker. Owner review. | DH-4, DH-5 |
| DH-7 | **Acceptance A: the α study.** Run it as a study, check it against the 13 November numbers, record the verdict, delete `scripts/alphaSweep.mjs`, cite the study in the transform-graph plan. | `scripts/alphaSweep.mjs` (deleted), `docs/superpowers/plans/2026-11-12-transform-graph.md` | Section 10A's "done when". | DH-6, DH-17 |
| DH-8 | **Image checks for group D and sweeps.** `images.mjs` runs example and Lab scenes (`checks: ["settled"]`). It takes `--sweep`, `--reference` and `--study`, and records crops. Images labels group D checks and links them to their study. | `images.mjs`, `cli.mjs`, `views/Images.tsx` | `images --scenes vex-x10-zermatt` captures, compares against its approved image, and is reviewable. A swept image run shows as a grid. | DH-5, DH-6 |
| DH-9 | **Recordings as runs.** The metadata endpoint and body (allowlisted parameters, no tokens, tested). "Save as run" and the reducer; `import-recording`. The recording page, with time series. | `scripts/vitePluginRecord.ts`, `widgets/recorder.ts`, `widgets/inspector.ts`, new `bench/suite/recording.mjs`, `views/Report.tsx` (or a new `Recording.tsx`), `cli.mjs` | A recording saved from the vertical-exaggeration example appears in Runs with its metadata and time series. A URL with an unknown or key-like parameter records without it (tested). The existing recorder tests pass. Owner review. | DH-1 |
| DH-10 | **Test results.** The vitest reporter, `testEnvironment.json`, flake computation, `cli.mjs tests`, retention, and the Tests view in the rail's first group. | new `bench/suite/testsReporter.ts`, `testEnvironment.json`, `commands/tests.mjs`, `views/Tests.tsx`, `tests.css`; `vite.config.ts` (vitest block, a read endpoint), `routes.tsx`, `shell.tsx` (rail) | A full `npm test` in a fresh worktree records `test/volumes.test.ts` as environment-only, with its precondition. A test made to fail one run in three shows as flaky, with its rate. Nothing is written under `CI`. Owner review. | DH-1 |
| DH-11 | **Archives: export and import.** The merge rules of section 8 (runs, triage, approved images, annotations, and studies once DH-16 exists), archive naming, and Machines with both stores. | new `bench/suite/commands/sync.mjs`; `cli.mjs` | Exporting from one store and importing into another twice gives the same store as importing once. A triage edit on each side keeps the newer, with the other in its history. Approved images of two renderer classes merge without review. All tested on two temporary stores. | DH-1 |
| DH-12 | **Lab into the store.** One registry for Lab and `bench/run.mjs`, which fixes the six broken commands. Lab scenes in group D. Lab's "Run and record" records a `lab` run. Spikes' checks recorded. | `bench/run.mjs`, `lab/pages.ts`, `lab/harness.ts`, `views/Lab.tsx`, `cli.mjs`, `manifest.mjs` | Every id Lab shows runs headless. `run --scenes globe-parity` records FLIP per view. A recorded Lab run shows in Runs. | DH-1, DH-5 |
| DH-13 | **Acceptance B: the ×10 cliff-band study.** The image checks and the sweeps of section 10B as one study; the verdict; the conclusion in the transform-graph plan. | the plan; the study | Section 10B's "done when". | DH-8, DH-17, and the engine's shadow knobs and `debug=cascade` (the cliff-band study's own task) |
| DH-14 | **AGENTS.md and the skill, with the tracker.** Section 12's text lands in one coordinated AGENTS.md change with the tracker's "Work items" section, and both skills in `.claude/skills/`, adjusted to what was built. A first version after DH-1, DH-3 and DH-16 covers tagging, studies, run IDs, the lock, and the commands that exist. The full version follows DH-17. | `packages/next/AGENTS.md`, `.claude/skills/measuring-with-dyno/SKILL.md` (committed past the local exclude), with the tracker's own skill beside it | A fresh session, given only "find out what α does at ×10", opens a study, runs a tagged Dyno sweep, records a verdict, and reports the study and run IDs. | DH-1, DH-3, DH-16 (first); DH-17 (full); the tracker's section |
| DH-15 | **The navigation rail** (section 16).The rail regrouped by what people come to do, with a reserved first place for the tracker's Work page. Images beside Overview and Alerts. Machines moved into Overview. Examples in the looking group. The footer's Settings item. The redirect for `?tab=machines`. Shortcuts and the command palette updated. DESIGN.md's who-it-is-for list, information architecture, words and the shell's comment updated. Analysis keeps its name and place until DH-17 replaces it. | `bench/suite/shell.tsx`, `routes.tsx`, `views/Analysis.tsx` (Machines out), `views/Overview.tsx` (Machines), `views/FirstRun.tsx` (links), `DESIGN.md`, the route and link tests | Every route in section 16's inventory is reachable from the rail, a run, a scene or the palette, and highlights the right rail item. Old links land on their new homes. The rail fits a 900 px tall window, collapsed and expanded. DESIGN.md's table matches `shell.tsx`. Owner review by clicking around. | DH-2 |
| DH-16 | **Studies: the model and the commands.** (Opus.) The study schema and files. `study new`, `note`, `attach`, `verdict`, `abandon`, `reopen`, `show`; `studies`. `run --study`, inheriting item and expectations; the implicit study for `--hypothesis`. Pins for cited runs. The dev server's read and write endpoints, validated and capped. The study merge rule in `import`, if DH-11 has landed; otherwise DH-11 adds it. | new `bench/suite/studies.mjs`, `commands/studies.mjs`; `cli.mjs` (dispatch, `--study`), `schema.ts`, `vite.config.ts` (endpoints), `data.ts` | A study made, run against, noted and concluded from the CLI reads back with its evidence. A verdict citing an invalid run warns. A run with `--hypothesis` and no study opens one. The endpoint rejects a malformed or oversized body (tested). `studies --item CS-<n> --json` is stable for the tracker. | DH-1 |
| DH-17 | **The Studies page.** (Opus.) Studies, a list with status, item, question and latest evidence. A study's page: the question, hypothesis and expectations; the design as copyable commands, each marked with the run that executed it; the evidence, with each sweep in the sweep view, image runs as grids, and before-and-after runs as forest plots with their results; notes; the verdict form (outcome, reasoning, cited runs picked from the evidence, decision item). Analysis replaced: `/analysis` redirects to Studies, and sweep runs without a study open in their run report. Overview's "Open studies". "Investigate" on alerts. Decision annotations on Trends. | new `views/Studies.tsx`, `views/Study.tsx`, `studies.css`; `views/Analysis.tsx` (removed), `routes.tsx`, `shell.tsx` (the rail item), `views/Overview.tsx`, `views/Alerts.tsx`, `trendsModel.ts`, `DESIGN.md` | The α study (DH-7) reads from question to verdict on one page. A verdict recorded in the page appears in `study show`, and the reverse. Old `/analysis?sweep=` links land on the run's report or its study. Owner review by clicking around. | DH-6, DH-15, DH-16 |
| DH-18 | **The runner: pairing and the channel.** (Opus.) `runner pair`, `add`, `remove`, `serve` (accepting nothing yet but `/v1/have`). The pairing proof, the pair secret, TLS with the pinned runner certificate, and request signing with replay protection. The LAN-only bind and the source-address check. The choice of how certificates are made, recorded in this plan. | new `bench/suite/runner/pairing.mjs`, `channel.mjs`, `commands/runner.mjs`; `cli.mjs` (dispatch) | Tests on loopback with two temporary homes: pairing succeeds with the code and fails with a wrong one (three tries);. an unpaired, replayed, stale or altered request is refused;. a connection from a public source address is refused;. nothing listens without `runner serve`;. `pairs.json` is readable by the user only. | DH-1 |
| DH-19 | **The runner: remote runs.** `run --on` and `images --on`. Freezing, the `have` negotiation and the bundle. The validated command schema; the runner's worktree, build and lock. The `package-lock.json` check. Progress events; disconnect, `status`, `fetch` and cancel. The result archive through DH-11's `export` and `import`. Requested runs in flight on Dyno's Runs page. | new `bench/suite/runner/requests.mjs`, `runnerSide.mjs`; `commands/runner.mjs`, `cli.mjs`, `frozen.mjs` (bundle helpers), `views/Runs.tsx` (in flight) | The α study's run, requested from the Mac with `--on win`, runs on the laptop and lands in the Mac's store as `machine: win`, in the study's evidence. A request with a disallowed option, a path, or an unknown scene is refused before anything is fetched (tested). Cancelling mid-run frees the laptop's lock and leaves no partial run. A differing `package-lock.json` fails with the instruction. | DH-1, DH-4, DH-11, DH-18 |

**Order.**

1. **DH-1 first.**
2. **Then, in parallel:** DH-2, DH-3, DH-4, DH-9, DH-10, DH-11, DH-16 and DH-18. They touch different files, except `cli.mjs`, where each adds only a dispatch line once DH-1 has split the commands. DH-10 and DH-15 both touch the rail in `shell.tsx`: whichever lands second places Tests in the first group.
3. **DH-14's first version** follows DH-3 and DH-16.
4. **DH-15** follows DH-2 (both change `routes.tsx`).
5. **The sweep chain:** DH-5 follows DH-4, then DH-6.
6. **DH-17** follows DH-6, DH-15 and DH-16.
7. **Then:** DH-7 follows DH-17; DH-8 follows DH-5 and DH-6; DH-12 follows DH-5; DH-13 waits for DH-8, DH-17 and the engine's knobs; DH-19 follows DH-4, DH-11 and DH-18.

## 12. Draft: AGENTS.md section and skill

These land in one coordinated AGENTS.md change with the tracker's "Work items" section (DH-14). The two sections refer to each other: items say what to do, studies say what was found. Both skills live in `.claude/skills/` (question 6).

### For `packages/next/AGENTS.md` (proposed text; not applied)

```markdown
## Measuring with Dyno

Dyno (`bench/suite/`, plan §16) is where we measure. Its results store
(`~/.cesium-bench/results`, `BENCH_RESULTS`) is outside the repo and shared by
every worktree on the machine, so a run you make is visible to the main
session and the owner as soon as it finishes. The skill
`measuring-with-dyno` walks through it.

- **When a measurement must be a Dyno run.** Any number that goes into a
  plan, the handbook, a commit message or a question for the owner. Any
  before-and-after of a change. Any sweep. Any measurement you make a second
  time.
- **Quick probes** (one number to steer your next edit, reported to nobody)
  may use the dev handle, the inspector or a short script. A probe you repeat,
  or want to report, becomes a Dyno scene or sweep first. Scripts that write
  CSVs or PNGs to temporary folders are not a way to report results.
- **A question is a study.** Before measuring anything you expect to change,
  open a study (or use your item's): `cli.mjs study new <slug> --item CS-<n>
  --question "…" --hypothesis "…" --primary <metric> --guardrails <metrics>`.
  Make its runs with `--study <id>`. When the evidence is in, record the
  verdict (`study verdict`: supported, refuted or inconclusive, with the runs
  it cites and the decision item it informs). Write the hypothesis before
  you look at results.
- **Commands** (from the repository root, `node packages/next/bench/suite/cli.mjs …`):
  - `list`: scenes, including development scenes (group D: gallery examples
    with parameters and a pose, and Lab pages).
  - `run --study <id> --scenes <ids> --against-base`: your branch against its
    base in one run.
  - `run --study <id> --scenes <ids> --sweep <setting>=a,b,c [--sweep …]
    [--reference <setting>=v]`: a sweep over settings (`settings` lists them;
    an unknown one is refused).
  - `images --study <id> --scenes <ids>`: image checks.
  - `… --on win`: the same run on the laptop's GPU, results returned here.
  - `studies --item CS-<n>`, `study show <id>`, `runs --study <id>`,
    `show <run>`: find and read results.
- **Tag every run** with `--study` (which carries the item) or `--item CS-<n>`.
  Runs are development runs by default. Never pass `--purpose baseline` from
  a worktree: baseline runs are the integration branch, clean, made by the
  main session.
- **One run at a time.** The CLI holds a machine-wide lock and waits for
  another session's run; let it. Don't measure while your own dev server
  renders in a visible page.
- **Your own port.** CLI runs start their own servers. To look at results,
  `npm run dyno` opens Dyno on a free port; never stop or reuse a server
  someone else started.
- **Report IDs.** The study ID and its verdict (or "open" and the latest
  note); for each run, its ID, the command, one line of what it showed, and
  the Dyno path the CLI printed. Don't paste CSVs or commit images.
- **Tests record themselves.** `npm test` writes its results to the store
  (failures, flakes, environment-only failures such as missing 1.x shaders).
  Check Dyno's Tests view before deciding a failure is yours.
- Never put an ion token on a command line or in a request to the runner;
  each machine's Dyno and examples take theirs from Dyno's token setting or
  `.env.local`.
```

### The skill (proposed text)

```markdown
---
name: measuring-with-dyno
description: Use when you need a number about rendering, streaming, GPU or
  image output in packages/next — before and after a change, a sweep of a
  setting, an image check, or an investigation — so it lands in Dyno's shared
  store as part of a study and you can report its IDs.
---

# Measuring with Dyno

1. **Probe or measurement?** A probe steers your next edit and is reported
   to nobody: use the dev handle or the inspector. Anything you will report,
   repeat or compare is a measurement: continue.
2. **Open or find the study.** `cli.mjs studies --item CS-<n>`. If none fits,
   `study new` with the question, the hypothesis, the primary metric and the
   guardrails. Write them before you look at any result.
3. **Pick or make the scene.** `cli.mjs list`. Catalog scenes compare 1.x and
   2.0; group D scenes are gallery examples with parameters and a pose, and
   Lab pages. If yours doesn't exist, add it to `bench/suite/catalog/dev.json`
   (public content only) in your change.
4. **Run the smallest thing that answers it,** always with `--study <id>`.
   - A change: `run --scenes … --against-base --tier quick`.
   - A setting: `run --scenes … --sweep <setting>=… [--sweep …]
     --reference <setting>=<value> --reference-reps 3`.
   - How it looks: `images --scenes …`.
   - The NVIDIA laptop: add `--on win`.

   The CLI prints the point count first; above 60 browser runs it asks for
   `--yes`. Cut axes rather than repetitions of the reference.
5. **Read it.** `study show <id>`, `show <run>`, or the Dyno paths printed.
   A point drawn hollow didn't settle. A pixel difference "within noise" is
   no difference. A run's result (pass, marginal, fail) is input, not the
   verdict.
6. **Conclude.** `study verdict <id> --outcome supported|refuted|inconclusive
   --cite <run>:"what it showed" --reasoning "…" --decision CS-<n>`.
   Inconclusive says what would settle it. Or leave the study open with a
   `study note`.
7. **Report.** The study ID and verdict; run IDs, commands, one line each;
   Dyno paths. Cite the study in any plan paragraph that states the number.
8. **Promote what you repeat.** A script you ran twice becomes a scene, a
   setting in `bench/suite/settings.mjs` or a development metric, and the
   script is deleted.
```

## 13. Decisions and open questions

### Decided at review (owner, 2026-11-13)

| # | Question | Decision |
| --- | --- | --- |
| 1 | Unit tests: ingest or run from Dyno? | **Ingest** (section 7). No process-starting endpoint in Dyno. |
| 2 | Does plain `npm test` record? | **Yes**, when the store exists and `CI` isn't set. |
| 3 | Who may make baseline runs? | **Only clean runs of the integration branch**, enforced by the CLI. Old runs count as baseline runs. |
| 4 | The default way to measure a change? | **In one run against the base engine** (`--against-base`). |
| 5 | The second machine? | **Changed:** a runner on the local network (section 8), with archives by hand as the fallback. A Bentley-internal results repository later, perhaps. |
| 6 | Where does the skill live? | **`.claude/skills/measuring-with-dyno/SKILL.md`, committed** past the local exclude, beside the tracker's skill. |
| 7 | The engine's development knobs: public or development-only? | **Development-only**, through the dev handle, not in `api/surface.txt`. |
| 8 | Group D scenes on Scenes and in Overview? | **On Scenes under their own heading; never in Overview, headline means or budgets.** |
| 9 | Retention? | **Keep bench and image runs; prune test runs and recordings by count; never prune a cited or pinned run.** |
| 10 | How is the rail grouped? | **By what people come to do** (proposal A). |
| 11 | Rename Analysis to Sweeps and move Machines into Overview? | **Accepted**, then superseded by studies: Analysis becomes **Studies** (sweeps fold into study pages), and Machines moves into Overview. |
| 12 | Where do Scenes go? | **With results.** |
| 13 | The footer? | **One Settings item** for Theme and Keyboard shortcuts, beside Getting started and the ion token. |

### Open questions

Each has a recommendation; the plan assumes it.

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| 14 | Where do studies live, and are they tracker items? | **In Dyno's store, with date-and-slug IDs, each linked to one `CS-<n>` item.** They hold machine details by reference and cite runs that stay internal; the tracker reads them by item. One item may have several studies. | Studies as a tracker item type (`CS-<n>` each): one list of everything, but the tracker then holds evidence about private runs, and a study can't exist before its item. |
| 15 | Who records a verdict, and does a verdict close a decision? | **Agents may record verdicts on studies. A verdict that informs a decision item is shown on that item, and closing the decision stays the owner's step in the tracker.** | Only the owner records verdicts: slower, and agents' conclusions sit in notes until reviewed. |
| 16 | Does the runner accept requests from a paired machine automatically? | **Yes, automatically.** Both machines are yours, the commands are allowlisted, and the runner prints every request it starts. `runner serve --confirm` asks before each, for when you want it. | Confirm every request on the laptop: safer against a compromised Mac, and it needs someone at the laptop for every run. |
| 17 | Does `--hypothesis` on a run without `--study` open a study? | **Yes**, named from the item and the date, so no hypothesis is left on a lone run. | Refuse, and require `study new` first: one more step for agents, a cleaner store. |
| 18 | May the Mac request baseline runs on the laptop? | **Yes, when the commit is on the integration branch and the tree is clean.** The laptop holds the history, and the main session can then keep its Trends current from the Mac. | Baseline runs only from the laptop's own checkout: simpler rules, and someone at the laptop for each baseline run. |

## 14. Non-goals and follow-ups

- **Not here:**
  - running benchmarks on CI or runner machines beyond the owner's two (§16.8 v2);
  - the handbook reading the store instead of `bench/results` (a handbook change after DH-12);
  - parallel coordinates and parameter importance;
  - popping in motion as a metric. The α study measured static frames only. The transform-graph plan defines a pop as the largest screen displacement when tiles swap; that metric is a follow-up once a camera path runs on example scenes;
  - runner discovery by mDNS;
  - a Bentley-internal results repository.
- **Follow-ups owned elsewhere:**
  - the engine's shadow tuning knobs and `debug=cascade` (the cliff-band study);
  - a 1.x ×10 parity page at the example's close-up camera and sun (the transform-graph plan);
  - `view.converged()` (the refinement plan, which DH-5 adopts when it lands);
  - the Work page and the tracker's reading of studies (the tracker).

## 15. Risks

- **The store becomes a dump.** Many sessions making dev runs could bury the history. The defences are the purpose default, the baseline guard, Trends' default, studies and the item filter; retention handles the rest.
- **Studies nobody concludes.** Open studies pile up. Overview lists open studies with their latest note, and the tracker's Work page shows the ones behind decisions. A study with no runs for a while is flagged as stale on Studies, by count of newer runs on its item, not by a date.
- **Verdicts that overreach.** A verdict claims more than its runs show. The defences are citations with what each run showed, warnings for invalid runs or mixed hardware classes, and the owner's step on decisions.
- **Sweeps that cost too much.** Grids grow fast. The printed point count, the confirmation above 60 browser runs and early stop limit it; the skill says to cut axes first.
- **A setting that isn't applied.** The registry closes the silent no-op for known settings. DH-4's test reads a setting back from the page, so an adapter that stops applying it fails a test, not a study.
- **Example scenes drift from the examples.** An example may change its parameters or presets. Declared parameters make the CLI fail loudly when one disappears, and group D image checks show a changed look.
- **Timings from a busy machine.** The lock serializes runs, but a person's open dev server still renders. The run records other GPU processes and flags them. Development runs are judged within one run, against the base engine, which cancels most of it.
- **The runner as an attack surface.** It listens on the LAN and builds code it is sent. The defences:
  - pairing with a one-time code;
  - a pinned certificate and signed requests with replay protection;
  - private source addresses only, and nothing listening unless `runner serve` runs;
  - allowlisted commands and options, no shell, and no package installs.

  The residual risk is that a compromised paired Mac can run code on the laptop through a commit. That is the trust pairing grants, stated in section 8 and question 16.
- **Secrets in metadata or requests.** URLs, recordings and requests could carry keys. The defences:
  - requests are classified by host, never stored as URLs;
  - recording metadata keeps only allowlisted parameters;
  - runner requests have no field for a token, and their archives exclude `.env.local`;
  - DH-9 and DH-19 test it.

## 16. Dyno's navigation rail (owner, 2026-11-13)

The owner asked for a rethink of the left rail: the order and grouping of the pages no longer make obvious sense, and this plan adds pages. This section takes stock of what is built, groups it by what people come to do, and proposes a rail with one alternative.

- **Decided at review:** proposal A, Scenes with results, Machines into Overview, and the Settings footer (questions 10 to 13).
- **Changed with studies:** the Experiment group is now Studies and Lab.
- **Adjusted with the main session:** the tracker's Work page takes the first place in "Needs a look".
- **Building it:** DH-15 regroups the rail; DH-17 brings Studies.

### What the rail shows today

From `shell.tsx` (`GROUPS`, the footer) and `routes.tsx`. The rail is StrataKit's `NavigationRail`:

- a "Go to…" button at the top, which opens the command palette (Ctrl K);
- three groups separated by dividers, with no headings;
- a footer.

DESIGN.md's table lists two groups as the code has them, but leaves out Examples, and its footer row lists only Getting started and the ion token.

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
- **Analysis is two unrelated pages.** Sweeps is experimenting. Machines is "where things stand", per machine.
- **The queues are split.** Alerts sits in group 1 and Images in group 2, though both are "what needs a look" with counts.
- **The new pages have no obvious home:**
  - the tracker's Work page;
  - Studies;
  - Tests (a queue and a history);
  - development runs by branch, item or study (filters, not a page);
  - group D scenes;
  - recordings (runs of a new kind).
- **The rail runs out of height.** The footer has four items, and the rail gains items. Collapsed, 13 destinations (Work, Studies and Tests replacing Analysis), the palette and four footer items don't fit a 900 px tall window without scrolling.

### What people come to do

DESIGN.md's list, extended for the harness and the tracker:

1. **See what needs a look:**
   - decisions waiting on the owner;
   - where 2.0 stands;
   - regressions to triage, images to approve, failing or flaky tests;
   - open studies.
2. **Read results:** one run, two runs compared, metrics over time, one scene's history.
3. **Look at content live:** a scene in one or two engines, any content in one engine, an example.
4. **Find things out:** a study, with its sweeps, image checks and verdict; a focused Lab check.
5. **Set up:** first run, the ion token, theme and shortcuts.

### Proposal A (decided): by what people come to do

| Group (a DESIGN.md name; the rail shows dividers) | Items, in order | Changes |
| --- | --- | --- |
| Needs a look | Work · Overview · Alerts · Images · Tests | Work is reserved for the tracker's board (kanban by lifecycle, dependency graphs, the decision backlog), with a count of decisions waiting on the owner. The tracker builds the page; until it exists, the rail shows nothing in its place. Images moves up beside Alerts, and Tests (DH-10) joins; the three queues carry counts. Overview gains Machines (from Analysis, DH-15) and "Open studies" (DH-17). |
| Results | Trends · Runs · Scenes | Scenes moves here: its pages are history. Runs holds every run kind (bench, images, Lab, recordings; test runs open in the Tests view), filtered by purpose, branch, item, study and machine (DH-2), with requested runs in flight (DH-19). Compare stays off the rail. |
| Look | Explorer · Viewer · Examples | The three live tools together. Examples keeps its page; its "Measure this" points at its group D scene. |
| Experiment | Studies · Lab | Studies replaces Analysis (DH-17). Sweeps fold into study pages, and a sweep run without a study shows its sweep view in its run report. Lab keeps its pages, with "Run and record" (DH-12). |
| Footer | Getting started · ion token · Settings | Settings, a menu, holds Theme and Keyboard shortcuts. Getting started lists paired runners and whether each answers (DH-19). |

- **Order inside the rail:** attention first, because that is where a person starts a day and where Overview's "to look at" list points; then results; then looking and experimenting; setup in the footer.
- **Shortcuts:**
  - Existing letters stay: `o t r a s e v i x l`.
  - New ones: Work `w`, Tests `u`, Studies `y`.
  - `n`, which opened Analysis, opens Studies.
  - The palette also searches studies, plan items and branches ("Studies for `CS-<n>`", "Runs on `<branch>`").
- **Routes:**
  - New: `/studies`, `/studies/$study`, `/tests`; `/work` is reserved for the tracker.
  - Redirects: `/analysis` goes to `/studies`; `/analysis?tab=machines` to `/overview#machines`; `/analysis?sweep=<run>` to that run's study if it has one, else its report.
- **Parent highlighting:** child pages highlight their parent. A run's report and a recording highlight Runs, a study highlights Studies, a scene highlights Scenes, a Lab page highlights Lab, an example highlights Examples, and Compare highlights Runs.
- **Group D scenes** appear on Scenes under their own heading (question 8), never in Overview's verdict line.
- **Names:**
  - Names stay where they work: Overview, Trends, Runs, Alerts, Images, Scenes, Explorer, Viewer, Examples, Lab.
  - "Studies" replaces "Analysis", because the page is studies once Machines leaves and sweeps fold in.
  - DESIGN.md keeps "experiment" out of page names, so the group name "Experiment" lives in DESIGN.md only, not on screen.

### Proposal B (not taken): by kind of object

| Group | Items |
| --- | --- |
| Results | Work · Overview · Trends · Runs · Alerts · Images · Tests |
| Content | Scenes · Examples · Explorer · Viewer |
| Workbench | Studies · Lab |
| Footer | Getting started · ion token · Keyboard shortcuts · Theme |

The smaller change from today. Against it: a Results group of seven mixes the queues with history, and Scenes (history) sits with the live tools.

### StrataKit and DESIGN.md

- **No custom chrome.** The rail stays StrataKit's `NavigationRail`, with dividers between groups and the footer.
- **Group headings.** If the rail gains section headings, the group names above are their labels. Until then, the missing headings go in `STRATAKIT_FEEDBACK.md` with the reason: a 13-item rail is hard to scan without them.
- **Counts stay as they are:** a badge with an accessible label ("3 to look at"), now on Work, Alerts, Images and Tests.
- **DESIGN.md changes with the rail.** DH-15 and DH-17 rewrite, in the same change as the code:
  - DESIGN.md's "Who it is for" list (the five jobs above);
  - the information architecture table (proposal A as built);
  - the words list (section 2's vocabulary);
  - `shell.tsx`'s header comment.
