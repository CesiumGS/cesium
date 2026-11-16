# Dyno as the development harness: design plan

**Status (2026-11-13):** reviewed by the owner and revised. Nothing is built.

- **Accepted as recommended:** questions 1 to 4 and 6 to 13 (section 13 records each).
- **Final answers (2026-11-13):**
  - **Question 14:** studies live in the repository, beside the tracker's items (`packages/next/work/studies/`), not in the results store (section 2).
  - **Questions 5, 16 and 19:** other machines and devices reach the Mac through a Dyno-managed local certificate authority and one hub process (section 8). The laptop runs a small runner that connects out and lends its browser; phones pair the same way (CS-408). SSH and Tailscale are rejected, with the reasons. Archives moved by hand stay as the fallback.
- **Added:** studies, and the data model behind them (section 2). A study holds a question, a hypothesis, the runs that test it and a recorded verdict. Sweeps fold into study pages, and the rail's Experiment group becomes Studies and Lab (section 16).
- **Adjusted with the main session:**
  - Items are the work tracker's global IDs (`CS-<n>`, the prefix the tracker's files use), with no per-plan prefixes or letters.
  - The rail reserves the first place for the tracker's Work page.
  - This plan's AGENTS.md section lands in one coordinated change with the tracker's "Work items" section, with both skills in one place.
- **Items:** the plan is project CS-389 under the development-harness initiative (CS-6). Its milestones are items CS-390 to CS-408 (section 11); its second acceptance case is CS-166 in the transform graph's project; the owner's open questions are decision items CS-409 to CS-411.
- **Open questions:** 15, 17 and 18 (section 13, decision items CS-409 to CS-411), each with a recommendation the plan assumes.

**Goal:** every measurement that steers development goes through Dyno, so it lands in the results store, shows in Trends, and can be found again by its run and its study. Today the numbers behind recent decisions (the error exponent α, the ×10 cliff bands, the culling gains) came from one-off Playwright scripts that wrote CSVs and PNGs to temporary folders. Those numbers can't be compared with later ones, nobody can find them a week on, and the reasoning that turned them into a decision lives in chat.

- **Development cases are scenes.** A gallery example with its URL parameters, a pose and a debug view is a scene Dyno can run, measure and capture, beside the catalog's 1.x and 2.0 scenes.
- **Sweeps cover any setting Dyno knows** (engine, view, example parameter), over several axes at once, with the metrics we have been collecting by hand.
- **Every run says what it is for:** development or baseline, the tracker item it serves, the study it belongs to, its branch, worktree and machine. Development runs never pollute the baselines.
- **A study turns runs into a decision:** a question and a hypothesis, stated before results; the runs that test it; a verdict with its reasoning and the runs it cites.
- **Results come back by ID.** Agents leave their results in the shared store and report study and run IDs; the main session and the owner find them by item, study or branch.
- **Other sources reach the same store:** test results, live inspector recordings, and runs the Mac drives in the laptop's browser.
- **New sessions learn it from AGENTS.md** and a short skill.

**Sources:**

- The benchmark suite's design, all of it:
  - `docs/design/benchmark-suite.md`, in particular "Interfaces: agents, scripts and people", "Engines and versions", and "Findings to work through (r33)" (frozen builds, reuse, early stop, areas and tiers);
  - `docs/design/benchmark-analysis-and-experience.md` (sweeps, the Workspace, Alerts);
  - `docs/design/image-regression-in-dyno.md` (image checks).
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
4. **What did we conclude?** These are judgments, made by a person or an agent: a study's verdict, an alert's triage, an approved image, an annotation. They are mutable, and each records who made it and when.
5. **Why did we measure, and what is it for?** This is the work: the tracker's items (`CS-<n>`), including the decisions waiting on the owner. It lives in the tracker, not in Dyno.

A **study** is the judgment that ties questions 2, 4 and 5 together. It holds a question and a hypothesis written before results, the runs that test it, and a verdict that cites them and informs a decision. A study doesn't execute anything; runs do. A run doesn't conclude anything; a study does.

### The model

Where each layer lives follows one rule. Judgments about the work (studies) live with the work, in the repository, on the branch. Judgments about runs (triage, approved images, pins) live with the runs, in the store on the machine that holds them.

```text
WORK (repo, the tracker)   Item CS-<n> ─────────── decision items
                              │ serves                  ▲ informs
JUDGMENTS (repo)          Study ─ question, hypothesis, expectations, status
                              │      design: the runs it plans (commands)
                              │      notes: dated observations
                              │      verdict: outcome, reasoning, cited runs, decision ──┘
                              │ evidence: runs made for it, and runs attached to it (by ID)
                              ▼ (a verdict may also cite any run, baselines included)
EXECUTIONS (store)         Run ─ kind, purpose, machine, commit, branch, worktree, item, study
                              │    design: configurations × scenes or checks or a Lab page,
                              │            optional sweep (axes, reference)
                              │    cells: scene × scenario × configuration → metric samples
                              │    captures (images, time series), result (scorecard), validity
DERIVED (computed)         Summary · Series · Change point · Flake rate · Noise floor
JUDGMENTS (store)         Alert triage (on change points) · Approved image (on checks)
                           Annotation (on series) · Pin (on runs)
DEFINITIONS (repo)         Dataset · Scene (groups A to D) · Scenario · Check · Lab page
                           Setup · Setting · Metric · Budget · Area · Tier · Example
```

### Every concept, placed

| Concept | Layer | What it is | Relation to studies | Where it lives |
| --- | --- | --- | --- | --- |
| **Item** | Work | A tracker item, `CS-<n>`: a task, a decision, an investigation. | A study serves one item; several studies may serve one item. | The tracker. Dyno stores the ID only. |
| **Study** (new) | Judgment | A question, a hypothesis, expectations, a design, notes, a status (open, concluded or abandoned) and a verdict. No machine details; runs cited by ID. | It is the study. | The repo: `packages/next/work/studies/<id>.md`, beside the tracker's items |
| **Expectations** | Judgment | The primary metric, the guardrails and the tolerance, declared before results (the "Decide" practice in `docs/design/benchmark-analysis-and-experience.md`). | A study declares them; its runs copy them into `plan`, so each run's scorecard tests them. | The study; a copy in each run |
| **Verdict** (new) | Judgment | Supported, refuted or inconclusive, with the reasoning, the runs cited (each with what it showed) and the decision it informs (`CS-<n>`). | It ends a study. | The study |
| **Run** | Execution | One invocation, one result file, one machine and commit. Its **kind** is `bench`, `images`, `lab`, `recording` or `tests`. | Evidence: a run made for a study records `study`. An earlier run can be attached. | `<store>/<id>.json`, with its summary and assets |
| **Purpose** | Execution | `baseline` (the integration branch, clean, the history Trends draws) or `dev` (everything else). | Study runs are dev runs. A verdict may cite baseline runs. | The run |
| **Sweep** | Execution | Part of a run's design: axes, points and a reference. It is one run because its points must alternate in one session for the statistics to hold. | A study's design may call for several runs (a sweep, an image run, a before and after); each sweep is one of them. | The run (`results.sweep`) |
| **Configuration** | Execution | An engine build with a setup and setting values, as a run resolved it (`2.0@main+view.lodExponent=0.5`). | Points of a sweep are configurations. | The run |
| **Cell**, **measurement** | Execution | Scene × scenario × configuration, with each metric's samples per repetition. | What the verdict's numbers come from. | The run |
| **Result** (a run's) | Derived | The scorecard's pass, marginal or fail on the run's expectations. | Input to the verdict, never the verdict itself. | Computed from the run |
| **Validity** | Derived | Valid, valid with warnings, or invalid, from the recorded conditions. | A verdict cites valid runs; Dyno warns when it doesn't. | Computed from the run |
| **Summary** | Derived | The run's compact form for lists and charts. | | `<id>.summary.json` |
| **Series** | Derived | Baseline runs of one scene, scenario, setup and machine for one metric, over commits: one line on Trends. | A study about a regression starts from a series. | Computed from summaries |
| **Change point**, **alert** | Derived, then judgment | A detected shift in a series (E-Divisive means), grouped across scenes into an alert with a triage state. | "Investigate" on an alert opens a study with the alert's runs attached. | Computed; triage in `triage.json` |
| **Noise floor** | Derived | The spread of a metric over repeated reference points. | It makes "within noise" a statement a verdict can rest on. | Computed from the run |
| **Flake rate** | Derived | A test's failures over runs on unchanged trees. | A study can investigate a flake like any regression. | Computed from test runs |
| **Scene**, **scenario** | Definition | Content with a camera path, in groups A to D (D: gallery examples and Lab pages, section 3); a scenario is what happens in a scene. | A study's runs name them. | `bench/suite/catalog/` |
| **Check** | Definition | A scene at a moment of its camera path (or settled), captured and compared. | Image runs capture checks; a study cites them. | The scene (`checks`) |
| **Approved image** | Judgment | The image a check is compared against, per renderer class (the files say "baselines"). | A study may approve a new image as part of its verdict. | `<store>/baselines/<class>/` |
| **Setup**, **setting** | Definition | A setup is named engine settings without a build (`2.0+stepwise`); a setting is one variable in the registry (section 4). | Sweep axes are settings. | The catalog; `bench/suite/settings.mjs` |
| **Engine** | Definition | 1.x or 2.0, from a release, the working tree or a git ref (`docs/design/benchmark-suite.md`, "Engines and versions"). | | `engines.mjs` |
| **Metric**, **budget** | Definition | A measured quantity with units and a direction; a budget is a limit on one per scene. | Expectations name metrics. | `report.mjs`, the catalog |
| **Lab page** | Definition | A harness with `mount` and `run`. | A group D scene can name one. | `lab/pages.ts` |
| **Machine**, **runner**, **device** | Execution context | A machine is a computer with an alias (`mac`, `win`) and a hardware class. A runner is a machine that lends its browser and GPU to runs another machine drives and serves; a device is any paired browser (section 8). "Served remotely" is part of a machine's identity. | A study can use runs from every machine and device, and Dyno warns when a timing claim mixes them. | `BENCH_MACHINE`; the hub's device registry |
| **Recording** | Execution | A run of kind `recording`: a live session's time series, with no repetitions and no controlled conditions. | Evidence for "what happens when", never for "faster". | The run |
| **Annotation** | Judgment | A dated note on series: method, machine, data, or (new) **decision**. | A concluded study whose decision lands adds a decision annotation at that commit. | `annotations.json`, the store |
| **Pin** | Judgment | Keeps a run out of retention. | Retention also keeps every run a study file cites or attaches, on any local branch. | The run's sidecar |

### Studies in detail

**Decided (question 14): studies live in the repository**, beside the tracker's items, in `packages/next/work/studies/`. There are three reasons, the same ones that put the tracker on the branch:

- they are versioned with the work they judge;
- they are visible on every machine that has the branch;
- they are reviewable in diffs.

A study holds no machine details. It cites runs by ID only (an ID carries the machine's alias, `-mac` or `-win`, and nothing else), and the runs stay in the store.

**The file.** One Markdown file per study, in the tracker's own format: a frontmatter block in the tracker's YAML subset (`key: value` lines, inline and block lists, no multi-line values), then sections. The name is the ID: `packages/next/work/studies/2026-11-14-alpha-default.md`.

```markdown
---
id: 2026-11-14-alpha-default
title: The error exponent α for vertical exaggeration
item: CS-<n>
status: concluded
created: 2026-11-14
primary: tiles.terrain
guardrails: [pixelDiffShare, gpuP50]
tolerance: 0.03
attached: [2026-11-13T…-win]
outcome: supported
decision: CS-<n>
cites:
  - 2026-11-14T…-mac
---

## Question

Which α should the vertical exaggeration default to?

## Hypothesis

α 0.25 to 0.5 draw α 1's image within noise with a third of its terrain tiles or fewer.

## Design

- α × factor in two views: `run --scenes vex-valley,vex-zermatt --sweep param.x=1,4,10 --sweep view.lodExponent=0,0.25,0.5,0.75,1 --reference view.lodExponent=1 --reference-reps 3`

## Notes

- 2026-11-14: α 1 at ×10 in the valley never settles.

## Verdict

Supported. (The reasoning, in prose.)

- `2026-11-14T…-mac`: valley ×4, 471 terrain tiles at α 0.25 against 2,161 at α 1, image within noise.
```

- **IDs** are the creation date and a short slug. The CLI refuses an ID that already exists on any local branch (it looks through `git ls-tree` on each), so two agents don't create the same study on different branches.
- **Lifecycle.**
  - `open`: the hypothesis may be missing while the study explores; it must be stated before any run that tests it.
  - `concluded`: has a verdict.
  - `abandoned`: has a reason.
  - A concluded study can be reopened. Git keeps the old verdict, and the file says it was reopened, when and why.
- **Evidence** is every run in this machine's store whose `study` field names the study, plus the runs the file lists under `attached` (runs made before the study existed, or baseline runs it relies on). Runs stay immutable: attaching edits the study file, not the run. A cited or attached run that isn't in this machine's store shows as "not in this store (made on `win`)", with its ID, instead of disappearing.
- **A verdict is a statement with citations:**
  - Each cited run says what it showed, in a sentence with numbers and units.
  - Dyno warns when a cited run is invalid, belongs to another machine class than the claim, or is a recording used for a timing claim.
  - "Inconclusive" is a full verdict: it says what would settle the question.
  - **Retention never drops a cited run.** Before pruning, the store's clean-up reads the study files on every local branch (through git, without checking them out) and keeps every run they cite or attach. Pins remain for runs no study cites.
- **Decisions.** The verdict names the decision item it informs. The tracker reads study files from the same directory and shows the verdict on the decision. Closing the decision is the tracker's step (question 15).
- **A hypothesis on a run without a study** (`run --hypothesis "…"` with no `--study`) creates a study file for it, named from the item and the date, so no hypothesis is left without a home (question 17).
- **Writes are file writes,** and nothing commits them. The CLI writes study files in the current worktree. Dyno's dev server writes them through the same validation (`POST /bench-results/studies/<id>` validates, then writes the file into its own worktree). An agent commits study changes with its work, as it does tracker items; the owner commits changes made in Dyno.
  - Dyno marks a study with uncommitted changes.
  - The tracker's `check` (`scripts/work/views.mjs check`) validates study files beside items.
- **Studies on other branches.** Dyno and the CLI read studies from the current branch's files. `studies --all-branches` and Dyno's Studies page also list studies that exist only on other local branches (read through git, read-only, labeled with their branch). The main session can therefore see an agent's study before it merges.
- **Conflicts** are ordinary merge conflicts in a Markdown file. One branch owns a study at a time, the way a claimed item is owned: the study's `item` is claimed by that branch in the tracker.
- **Archives don't carry studies.** They travel with the branch.

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

- **`study new`** creates the file.
- **`study note <id> "…"`** adds a dated observation.
- **`study attach <id> <run>`** adds an earlier run as evidence.
- **`study verdict <id>`** records the verdict. `--cite` repeats as `run:what it showed`.
- **`study abandon <id> --reason`** and **`study reopen <id>`** change the status.
- **`study show <id> [--branch <b>]`** prints the study and its evidence.
- **`studies [--item] [--status] [--all-branches] [--json]`** lists studies.
- **`run --study <id>`** inherits the study's item and expectations. Explicit options override them, and the run records the override.

Each writes the file and prints "commit `packages/next/work/studies/<id>.md` with your work".

### Words for DESIGN.md

Added to the vocabulary, one meaning each:

- **study**, **question**, **hypothesis**, **expectations** (primary metric, guardrails, tolerance), **evidence**;
- **verdict**, for studies only (supported, refuted, inconclusive);
- **result**, a run's scorecard (pass, marginal, fail);
- **validity** (valid, warning, invalid);
- **purpose**, **baseline run**, **development run**, **item** (`CS-<n>`);
- **sweep**, **axis**, **point**, **reference**, **setting**, **configuration**;
- **series**, **machine**, **runner**, **device**, **hub**, **recording**.

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
  - For an arbitrary pose, the host gives examples one shared contract: a `camera` parameter (`lon,lat,height,heading,pitch,range`, in degrees and meters, height above the ellipsoid as drawn). The host applies it after the example's own setup, through the engine's camera API.
  - An example opts out by declaring `pose: false` in `examples/index.ts`, for examples whose camera is the point of the example.
  - The Explorer's and the Viewer's "save this view" writes the same six numbers.
- **When it is settled.**
  - Until the refinement plan's `view.converged()` lands (CS-136, after CS-134 and CS-138), the driver uses `alphaSweep.mjs`'s rule, generalized. Every tileset reports nothing in flight, queued or loading, and the drawn triangle and tile counts hold for `holdMs`. The cap is `capSeconds`.
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
- **Later:** parallel coordinates and parameter importance (`docs/design/benchmark-analysis-and-experience.md`, "Explore"; CS-333). Three axes read well as small multiples.

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
| `branch` | `claude/plan-dyno-harness-18e1ff` | Unchanged (`treeRef`). |
| `worktree` | `plan-dyno-harness-18e1ff` or `main checkout` | The basename of the worktree's top level, never the full path (it carries the user name). |
| `base` | `{ ref: "cesium-2.0-webgpu-poc", sha }` | `git merge-base HEAD <integration branch>`. The integration branch is a catalog setting: `cesium-2.0-webgpu-poc` today, `main` after the merge. |
| `machine` | `mac`, `win` | `BENCH_MACHINE`, else a short alias derived from the platform and GPU, set once per machine by `npm run setup`. |
| `servedFrom` | `mac` | Runs whose browser and GPU were on a runner while the pages came from this machine (section 8). Part of the machine identity. |

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

- **The lock.** The CLI takes a machine-wide lock, `~/.cesium-bench/run.lock` (process id, worktree, command, start), for any run whose browser is on this machine. A run on the runner takes the runner's lock instead, on the runner (section 8).
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
- **Work with a hypothesis is a study.** An agent opens a study (or joins the one its item already has), states the question and hypothesis before running anything, makes its runs with `--study`, and records a verdict when the evidence is in. It commits the study file with its work. An agent that can't conclude records "inconclusive" with what would settle it, or leaves the study open with a note.
- **An agent's report carries IDs:**
  - the study ID, its branch, and its verdict in a sentence, or "open" with the latest note;
  - for each run, the run ID, the command, one line of what it showed, and the Dyno path;
  - larger findings in the shared notes folder, with the same IDs.
- **The main session finds them** with `cli.mjs studies --item CS-<n>`, `study show <id>`, and `cli.mjs runs` with filters (`--item`, `--study`, `--branch`, `--worktree`, `--purpose`, `--machine`, `--since`, `--kind`). `cli.mjs show <id>` prints a run's header, expectations, result and the development metrics per point. These commands read summaries and study files only, so they are fast. `studies --all-branches` and `study show <id> --branch <b>` read an agent's study from its branch through git, before it merges.
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

## 8. Other machines and devices: a local certificate authority and a hub

**Decided at review (questions 5, 16 and 19):** there is no results repository for now, and no SSH or Tailscale. The design:

- **One process on the requesting machine,** the Mac, serves every device on the LAN over HTTPS, signed by a small local certificate authority that Dyno manages.
- **Each device trusts that authority once** and pairs once.
- **The Windows laptop runs a small runner** that connects out to the Mac and lends its browser and GPU.
- **Phones and other browsers** pair the same way and open run links by hand (CS-408).

The Mac builds, serves, drives and records; results land directly in its store. Archives moved by hand (CS-400) stay only as a manual fallback.

### Why this, and not the alternatives

| Option | Why not |
| --- | --- |
| SSH forwarding to each device's `localhost` | Setup on each device: Windows' OpenSSH server is an OS feature to enable. Phones can't take part at all (except Android over `adb`). |
| Tailscale or another overlay network | It won't run on the owner's work laptop, and a required third-party service isn't open-source friendly for contributors. |
| The browser flag `--unsafely-treat-insecure-origin-as-secure` | No encryption. The flag is fixed when the browser launches, and phones can't set flags. |
| Plain HTTP on the LAN | Not a secure context, so no WebGPU and no cross-origin isolation. Nothing is encrypted. |
| A local certificate authority (chosen) | One mechanism for every device. HTTPS gives the secure context and the encryption. Setup on a device is one certificate install, done by the user, and a pairing code. It needs no OS feature, no admin rights on Windows (the current user's root store) and no third-party service. |

### The pieces

| Piece | Where | What it does |
| --- | --- | --- |
| **The certificate authority** | The Mac, `~/.cesium-bench/ca/` (outside the repo, the key readable by the user only) | Created once by `cli.mjs ca init`. It issues the hub's server certificate for the Mac's `.local` name and its LAN addresses. It is never exported, archived or copied. |
| **The hub** | The Mac, `cli.mjs hub` (`npm run hub`) | One process, listening on the LAN only while it runs. It serves the pairing page, the device registry, the runner's connection and the run links, and fronts each run's servers over HTTPS. Dyno's own dev server stays on `127.0.0.1`. |
| **The runner** | The laptop, `cli.mjs runner` from its checkout | Node and Playwright only. It connects out to the hub with its device token, and lends a browser to runs the Mac drives. Nothing listens on the laptop beyond its own loopback. |
| **Devices** | Phones, other browsers | Paired browsers. They open run links (CS-408). |

### The certificate authority

- **Like mkcert:** an ECDSA P-256 root, made once, with leaf certificates for the hub.
- **Name Constraints.** The root carries a Name Constraints extension that limits it to `.local` names and private address ranges, so a stolen key can't sign a certificate for any public site. CS-406 checks that each target platform honors the extension (Windows, macOS, iOS, Android, Linux Firefox) and records the result. A platform that rejects a constrained root gets the constraint dropped only after the owner agrees.
- **Leaf certificates** are short-lived and renewed by the hub itself, within Apple's limit for certificates under user-installed roots (825 days). They name `<mac>.local` and each private LAN address the Mac has, so devices that don't resolve `.local` names (some Android versions) use the address.
- **Made with a small reviewed dependency.** Node can't issue X.509 certificates by itself. The candidate is a WebCrypto-based X.509 library such as `@peculiar/x509`, as a pinned development dependency, health-checked when it is added; OpenSSL isn't on every machine.
- **Rotation.** `cli.mjs ca rotate` makes a new root. Every device then installs the new certificate and pairs again; the old root stops being served.

### Installing the authority on a device, once

The pairing page can't be trusted before the authority is, so the certificate comes first, over plain HTTP from a second port that serves nothing else.

- **The plain-HTTP page** (`http://<mac>.local:<port>/ca`) offers the certificate as a download and as a QR code, with the steps for the device it detects. It also shows the certificate's SHA-256 fingerprint.
- **Comparing fingerprints.** The owner compares that fingerprint with the one Dyno shows on the Mac (Settings, Devices) before trusting it. The certificate is public; only its fingerprint needs checking.
- **Per platform** (the steps on the page):
  - **Windows:** open the `.crt` and install it into the current user's Trusted Root Certification Authorities. No admin rights. Edge and Chrome honor the current user's roots.
  - **iOS and iPadOS:** a configuration profile (`.mobileconfig`) download, installed in Settings, then Settings › General › About › Certificate Trust Settings › enable full trust for the root.
  - **Android:** Settings › Security › Encryption and credentials › Install a certificate › CA certificate.
    - Apps trust user-installed authorities only if they opt in. CS-408 checks which browsers honor them (Chrome, Firefox, which needs its "use third-party CA certificates" setting, Samsung Internet, Edge) and on which Android versions, and records the result in `bench/suite/DEVICES.md`.
  - **macOS and Linux:** the requester itself doesn't need to trust its own authority. Other Macs use Keychain Access, and Linux Firefox its own certificate settings.
- **The runner** doesn't use the operating system's trust store. At pairing it saves the authority's certificate (checked against the fingerprint) and trusts only that certificate for the hub connection.

### Pairing, the same on every device

1. **On the Mac:** Dyno's Settings › Devices › "Pair a device" (or `cli.mjs hub pair`) shows a one-time code (eight characters from an unambiguous alphabet) and a QR code of `https://<mac>.local:<port>/pair?code=…`.
2. **On the device:** open `https://<mac>.local:<port>/pair` and enter or scan the code, and give the device an alias (`win`, `iphone-ios18`, `pixel-mali`).
   - The runner does the same from its command line: `cli.mjs runner pair https://<mac>.local:<port> --code <code> --alias win`.
3. **The hub issues a device token,** a random 256-bit value.
   - A browser keeps it as a `Secure`, `HttpOnly`, `SameSite=Strict` cookie on the hub's origin.
   - The runner keeps it in `~/.cesium-bench/runner/token`, readable by the user only.
   - The hub stores only its hash, with the alias, kind (runner or browser), and when it was paired and last seen, in `~/.cesium-bench/hub/devices.json`.
4. **The code** works once, allows three tries, and expires when its dialog or command closes.
5. **Revoking.** Settings › Devices lists every paired device and revokes any of them. A revoked runner's connection closes at once, and its token no longer works.

### The hub's boundaries

- **LAN only.**
  - The hub binds to the Mac's private interfaces, never a public address, and refuses connections from outside the private and link-local ranges (10/8, 172.16/12, 192.168/16, 169.254/16, fc00::/7, fe80::/10).
  - No UPnP, no port forwarding on the router, no relay, nothing reachable from the internet.
  - macOS asks once whether to allow incoming connections for Node; the hub tells the owner to expect it.
- **Every HTTPS request carries a device token,** except three: the pairing page and the `/pair` exchange itself (which need the code), and the plain-HTTP certificate page (which serves only the public certificate and its instructions).
- **The hub fronts each run's servers on the LAN.** The CLI's servers (the frozen tree, each snapshot server for an engine at a ref) stay bound to the Mac's `127.0.0.1`, as today. For a run on another device, the hub gives each one a LAN HTTPS port for the length of the run, checks the run's session cookie on every request, and forwards to the server.
  - The CLI rewrites every origin it hands to a page (`page.server` included) to the hub-side origin.
  - Each run's cookie is set by the CLI into every browser context it creates (`context.addCookies`) and expires with the run.
- **Never:**
  - the ion token in a log;
  - the authority's private key in the repo, an archive or a request;
  - any exposure beyond the LAN.

### The runner on the laptop

- **Connecting.** `cli.mjs runner` (from the laptop's checkout, using its installed Playwright) opens one WebSocket to `wss://<mac>.local:<port>/runner` with its device token, and keeps it open, reconnecting when the hub comes back. Nothing on the laptop listens on the network. No inbound firewall rule is needed.
- **A job is a browser session, and the Mac drives it.**
  - When a run with `--on win` starts, the hub sends the runner a job: open a browser session with the flags from `bench/suite/browserArgs.mjs`, one with vsync and one uncapped.
  - The runner takes the laptop's machine-wide run lock (CS-390's `run.lock`, on the laptop), holds the laptop's wake lock, and starts Edge with Playwright's `launchServer` on the laptop's `127.0.0.1` with a random endpoint token.
  - It then carries the Playwright protocol between that endpoint and the hub inside its own WebSocket. The Mac's CLI calls `chromium.connect()` on a local endpoint the hub provides, so the whole run (contexts, timing, captures, FLIP) is driven from the Mac, exactly as a local run.
  - Edge loads the pages from the hub's HTTPS origins: a secure context with cross-origin isolation, because the Mac's servers send COOP and COEP as they do locally.
- **Why the Mac drives,** instead of the runner running the measurement itself from its checkout: the measuring code (the CLI's per-run driver, its method key in `reuse.mjs`) would then come from a different commit on each machine and drift. Driving from the Mac keeps one copy, the requester's, and the laptop supplies only the browser, the GPU, the lock and the telemetry.
- **Telemetry and conditions.** The runner streams the laptop's telemetry over the same connection (GPU temperature, clocks, power and slowdown reasons from `nvidia-smi`, CPU speed and utility, power source). The CLI uses it wherever it uses its local sampler today: cooldown, the quiet rule, conditions per run, timelines.
- **The lock.**
  - Runs on the laptop serialize on its own lock, whether started there or from any paired machine. While a job waits, the Mac is told whose run holds the lock.
  - The Mac's lock isn't taken, since its GPU isn't measuring.
- **Progress and cancellation.**
  - Progress is the CLI's own output on the Mac.
  - Ctrl-C on the Mac ends the job. The runner closes the browser and releases its locks whenever a job ends, including when the connection drops.
  - A dropped connection fails the run like a crashed local browser, and leaves nothing running on the laptop.
- **Versions.**
  - Playwright's client (the Mac) and server (the laptop) must match exactly, and the browser flags must match `browserArgs.mjs`. The runner reports its Playwright, Edge and flags at connection.
  - The Mac refuses a mismatch with the fix: "Playwright 1.62.1 here, 1.61.0 on win: run `npm ci` in the laptop's checkout at a commit with 1.62.1".
  - The runner uses its checkout's pinned Playwright, never a version fetched on the Mac's say-so.

### Identity, timing and the ion token

- **The run records** `machine: win` (where the GPU and browser are) and `servedFrom: mac` (where the pages and engine came from).
  - The hardware class and telemetry come from the laptop.
  - The browser version comes from the remote browser.
  - The commit, branch, worktree, item and study come from the Mac.
- **"Served remotely" is part of the machine identity.** `win, served from mac` is a different machine key from `win` served locally. So:
  - baseline reuse (`reuse.mjs`) never mixes the two;
  - Trends draws them as separate series;
  - Compare warns when it pairs them.
- **The link is measured at the start of each run:** the round-trip time and throughput through the hub, by fetching a fixed asset a few times. They are recorded with the conditions, and a run whose link is far slower than the runner's recorded norm is flagged.
- **What remote serving affects.** The engine bundle, its wasm, workers and the suite pages come over the LAN in every cold context.
  - **First content and time to settle:** affected.
  - **Requests and bytes:** counts unchanged, timing affected.
  - **Frame time, CPU and GPU per frame, memory, image metrics:** unaffected once loaded.
  - **Content tiles** go from ion and Google straight to the laptop.
  - **1.x releases and refs** are served by the Mac too, so every engine in a run pays the same; within-run comparisons stay fair.
- **The ion token** reaches the remote page exactly as it reaches a local one.
  - It crosses the LAN only inside HTTPS (the pages) and the runner's TLS WebSocket (the Playwright protocol), and it lives in the remote browser's memory and its temporary profile, which Playwright deletes when the browser closes.
  - Neither the hub nor the runner logs page traffic or request URLs. Playwright's debug logging and tracing are off on the runner, and the CLI never puts a token in a URL, an argument or a log.
  - Both machines are the owner's.

### The device lab (later: CS-408)

The same split (the Mac serves, drives where it can, and records) reaches any paired browser.

- **Browsers Playwright can drive** run through the same runner on their machine: Firefox on Linux, through `firefox.launchServer`. Android Chrome can be driven over `adb` by a runner on the machine the phone is plugged into, using Playwright's Android support.
- **Browsers Playwright can't drive** (iOS Safari, for example) open a run link by hand.
  - `cli.mjs device-run --scenes … --device iphone-ios18` asks the hub for a one-time run link, shown with a QR code.
  - The paired device opens it. The suite page runs the same scene, check or capability report the Playwright driver would: `runScene`, `runCheck`, and a capability report of the adapter, limits, features and WebGL 2 extensions.
  - The page posts the results to the hub with the device's cookie and the link's token. The hub hands them to the waiting CLI, which writes the run.
- **Identity and validity.**
  - A device run records the device's alias and the hardware class its browser reports.
  - Manual device runs have no controlled conditions (no cooldown, no quiet rule, no telemetry), so they are valid with warnings by design.
  - Their timings are evidence for "it runs, and roughly how fast", never for small differences.
- **What it is for:**
  - the WebGL 2 browser research's device measurements (CS-43, and the probe runs CS-47 on the devices CS-46 names): an iPhone on iOS 18, an Android phone with a Mali or Xclipse GPU, Firefox on Linux;
  - the engine profiles' real-device facts, gathered as runs in the store and cited by studies instead of copied by hand.

### Archives by hand (CS-400, the fallback)

- **`cli.mjs export [--since <id or date>] [--out file]`** writes a `.tar` of run files newer than the last export to that machine (results, summaries, reports, assets, test runs, image runs), plus the store's mutable files (triage, approved images, annotations).
- **`cli.mjs import <file>`** merges:
  - run files by ID (they carry the machine alias, so they never collide; an existing ID is skipped);
  - `triage.json` per alert key: the newer edit wins, with both kept in a `history` list;
  - approved images per renderer class: the two machines' classes differ, so they don't conflict; a same-class conflict keeps both and lists it for review in Images;
  - annotations by date and text.
- **Studies don't travel in archives:** they are files on the branch.
- **When to use it:** to bring the laptop's own history (runs made locally, before or without the runner) into the Mac's store, and back.

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
- **The second machine.** After CS-407, the same run with `--on win` measures in the laptop's browser and lands in the Mac's store as `machine: win`, served from `mac`, in the study's evidence.

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
  - CS-393: the settings registry and the sweep record;
  - CS-395: the sweep view;
  - CS-404: the study model;
  - CS-405: the study page;
  - CS-406: the certificate authority, the hub and pairing.
- **Checks.** Each milestone runs typecheck, eslint and prettier on its files, plus its own tests. The full `npm test` runs once at the end of CS-395, CS-401, CS-405, CS-407 and CS-408.
- **UI milestones** (CS-391, CS-395, CS-398, CS-399, CS-403, CS-405) follow DESIGN.md and StrataKit. They are checked in both themes, at 380 px, by keyboard and with a clean console, and the owner reviews them by clicking around.
- **No durations:** order and dependencies only.
- **Items:** each row is a work item in `packages/next/work/` (project CS-389). The item files hold the same text; `node packages/next/scripts/work/views.mjs ready` shows which can start.

| # | Milestone | Files | Done when | Needs |
| --- | --- | --- | --- | --- |
| CS-390 | **Run identity and the lock.** `purpose`, `item` (`CS-<n>`), `study`, `worktree`, `base`, `machine`, `servedFrom` and the new `id` on every run kind (bench, images). The baseline guard and `--against-base`. The CLI's first and last lines, naming the run and its Dyno paths. The machine-wide run lock; `npm run dyno` on a free port. Old runs read as baseline runs. New commands get their own modules, so later milestones touch `cli.mjs` less. | `bench/suite/cli.mjs`, new `bench/suite/identity.mjs`, `runLock.mjs`; `images.mjs`, `report.mjs` (`summarizeRun`), `data.ts`, `schema.ts`, `vite.config.ts` (the Images run-name check), `scripts/setup.mjs` (`BENCH_MACHINE`), `package.json` (`dyno`) | A dev run from a worktree records every field. `--purpose baseline` is refused from a dirty tree and from a feature branch (tested). Two runs started together run one after the other, the second saying whose run it waited for. An existing store still loads in Dyno unchanged. | nothing |
| CS-391 | **Purpose, branch, item and study in the views.** Trends defaults to baseline runs and gains purpose, branch and item filters. Runs gains the columns and filters. A run's page shows its identity. Compare gets its "this branch against its base" default. Alerts work on baseline runs only. | `views/Trends.tsx`, `trendsModel.ts`, `Runs.tsx`, `runParts.tsx`, `Compare.tsx`, `Report.tsx`, `Alerts.tsx`, `changepoints.mjs`, `routes.tsx` | With a store holding baseline runs and dev runs from two branches, Trends draws only the baseline runs until asked. Compare opened from a branch picks the branch's newest run against the baseline run at its base, and says so. Change-point tests show dev runs don't move alerts. Owner review. | CS-390 |
| CS-392 | **Finding runs from the terminal.** `cli.mjs runs` (filters, table and JSON), `show <id>`, `pin <id>`. | new `bench/suite/commands/runs.mjs`; `cli.mjs` (dispatch) | The commands list and show runs from summaries only. `--json` output is stable and tested. A pinned run is listed as pinned. | CS-390 |
| CS-393 | **The settings registry and multi-axis sweeps.** (Opus.) `settings.mjs`, and validation before a run. `engine.` and `view.` settings applied by the catalog adapter (`lodExponent`, `shadows`, `debug`, `occlusionCull`, `coarsen`, `lod`). Repeated `--sweep`, `--sweep-file`, `--reference`, `--reference-reps`, the point count and `--yes`. The sweep record with `axes`, `reference` and `points`, reading old one-axis records. | new `bench/suite/settings.mjs`; `cli.mjs`, `engineBuilds.mjs`, `engines.mjs` (labels), `suite.ts` (the adapter), `schema.ts`, `report.mjs` | `--sweep lodExponent=0,1` is refused with the list of settings. A two-axis sweep on a catalog scene records every point and its coordinates. `view.lodExponent` reaches the view: a test reads it back from the page. Old sweep runs still plot. | CS-390 |
| CS-394 | **Example scenes and the development metrics.** `catalog/dev.json` and group D; `example.html` in the frozen build. The host pose contract (`camera=`) and declared example parameters. The settle rule, with "not settled". The metrics of section 4: tiles and requests per tileset, requests and bytes by host class, triangles and draws, GPU per pass, `probe=sse`, page errors. Tileset labels in the vertical-exaggeration example. Group D kept out of headline means, Overview and budgets. "Measure this" in the Examples view. | new `bench/suite/catalog/dev.json`, `example.html`, `exampleDriver.ts`; `manifest.mjs`, `cli.mjs`, `frozen.mjs`, `schema.ts`, `report.mjs` (`METRICS`), `examples/index.ts`, `views/exampleRun.ts`, `views/Examples.tsx`, `examples/vertical-exaggeration/main.ts` (labels only), `scorecard.mjs` | `run --scenes vex-x10-zermatt` measures the example from the frozen build and records every metric in the table. A capped run is reported as not settled, not failed. `param.x` sweeps. Group D scenes don't change Overview's numbers. | CS-393 |
| CS-395 | **Reference images and the sweep view.** (Opus.) Captures per point. Pixel difference and FLIP against the reference point, over the whole image and crops. The noise floor from reference repetitions. The sweep view as a component (axes as lines and panels, hollow unsettled points, noise band, table twins, the image grid), shown in a sweep run's report and, until CS-405, in Analysis's Sweeps tab. Images' compare modes for any two images. | `cli.mjs` (capture), new `bench/suite/reference.mjs`, new `views/SweepView.tsx`; `views/Report.tsx`, `views/Analysis.tsx`, `analysis.css`, `views/Images.tsx` (compare any pair), `charts.mjs` | A three-axis sweep reads as small multiples with an image grid. A point within noise says so. A click on a thumbnail opens the pair in swipe and flicker. Owner review. | CS-393, CS-394 |
| CS-396 | **Acceptance A: the α study.** Run it as a study, check it against the 13 November numbers, record the verdict, delete `scripts/alphaSweep.mjs`, cite the study in the transform-graph plan. | `scripts/alphaSweep.mjs` (deleted), `docs/superpowers/plans/2026-11-12-transform-graph.md` | Section 10A's "done when". | CS-395, CS-405 |
| CS-397 | **Image checks for group D and sweeps.** `images.mjs` runs example and Lab scenes (`checks: ["settled"]`). It takes `--sweep`, `--reference` and `--study`, and records crops. Images labels group D checks and links them to their study. | `images.mjs`, `cli.mjs`, `views/Images.tsx` | `images --scenes vex-x10-zermatt` captures, compares against its approved image, and is reviewable. A swept image run shows as a grid. | CS-394, CS-395 |
| CS-398 | **Recordings as runs.** The metadata endpoint and body (allowlisted parameters, no tokens, tested). "Save as run" and the reducer; `import-recording`. The recording page, with time series. | `scripts/vitePluginRecord.ts`, `widgets/recorder.ts`, `widgets/inspector.ts`, new `bench/suite/recording.mjs`, `views/Report.tsx` (or a new `Recording.tsx`), `cli.mjs` | A recording saved from the vertical-exaggeration example appears in Runs with its metadata and time series. A URL with an unknown or key-like parameter records without it (tested). The existing recorder tests pass. Owner review. | CS-390 |
| CS-399 | **Test results.** The vitest reporter, `testEnvironment.json`, flake computation, `cli.mjs tests`, retention, and the Tests view in the rail's first group. | new `bench/suite/testsReporter.ts`, `testEnvironment.json`, `commands/tests.mjs`, `views/Tests.tsx`, `tests.css`; `vite.config.ts` (vitest block, a read endpoint), `routes.tsx`, `shell.tsx` (rail) | A full `npm test` in a fresh worktree records `test/volumes.test.ts` as environment-only, with its precondition. A test made to fail one run in three shows as flaky, with its rate. Nothing is written under `CI`. Owner review. | CS-390 |
| CS-400 | **Archives: export and import** (the manual fallback). The merge rules of section 8 (runs, triage, approved images, annotations; studies travel with the branch), archive naming, and Machines with both stores. | new `bench/suite/commands/sync.mjs`; `cli.mjs` | Exporting from one store and importing into another twice gives the same store as importing once. A triage edit on each side keeps the newer, with the other in its history. Approved images of two renderer classes merge without review. All tested on two temporary stores. | CS-390 |
| CS-401 | **Lab into the store.** One registry for Lab and `bench/run.mjs`, which fixes the six broken commands. Lab scenes in group D. Lab's "Run and record" records a `lab` run. Spikes' checks recorded. | `bench/run.mjs`, `lab/pages.ts`, `lab/harness.ts`, `views/Lab.tsx`, `cli.mjs`, `manifest.mjs` | Every id Lab shows runs headless. `run --scenes globe-parity` records FLIP per view. A recorded Lab run shows in Runs. | CS-390, CS-394 |
| CS-166 | **Acceptance B: the ×10 cliff-band study.** An existing item in the transform graph's project (CS-17), "confirm shadow acne under the warp and fix it", which is the same investigation; it is not duplicated here. Run as a study: the image checks and the sweeps of section 10B; the verdict; the conclusion in the transform-graph plan. | the plan; the study | Section 10B's "done when". | Not blocked: run as a study once CS-397 and CS-405 land, with the engine's shadow knobs and `debug=cascade` (CS-166's own engine work). |
| CS-402 | **AGENTS.md and the skill, with the tracker.** Section 12's text lands in `packages/next/AGENTS.md` beside the tracker's "Work items" section (already merged), the two cross-referenced, with this plan's skill beside the tracker's `work-items` skill in `packages/next/.claude/skills/`, adjusted to what was built. A first version after CS-390, CS-392 and CS-404 covers tagging, studies, run IDs, the lock, and the commands that exist. The full version follows CS-405. | `packages/next/AGENTS.md`, `packages/next/.claude/skills/measuring-with-dyno/SKILL.md`, beside `work-items/SKILL.md` | A fresh session, given only "find out what α does at ×10", opens a study, runs a tagged Dyno sweep, records a verdict, and reports the study and run IDs. | CS-390, CS-392, CS-404 (first); CS-405 (full); the tracker's section |
| CS-403 | **The navigation rail** (section 16). The rail regrouped by what people come to do, with a reserved first place for the tracker's Work page. Images beside Overview and Alerts. Machines moved into Overview. Examples in the looking group. The footer's Settings item. The redirect for `?tab=machines`. Shortcuts and the command palette updated. DESIGN.md's who-it-is-for list, information architecture, words and the shell's comment updated. Analysis keeps its name and place until CS-405 replaces it. | `bench/suite/shell.tsx`, `routes.tsx`, `views/Analysis.tsx` (Machines out), `views/Overview.tsx` (Machines), `views/FirstRun.tsx` (links), `DESIGN.md`, the route and link tests | Every route in section 16's inventory is reachable from the rail, a run, a scene or the palette, and highlights the right rail item. Old links land on their new homes. The rail fits a 900 px tall window, collapsed and expanded. DESIGN.md's table matches `shell.tsx`. Owner review by clicking around. | CS-391 |
| CS-404 | **Studies: the model, the files and the commands.** (Opus.) The study file format (the tracker's frontmatter subset and sections) in `packages/next/work/studies/`, with its validator, shared with the tracker's `check`. `study new`, `note`, `attach`, `verdict`, `abandon`, `reopen`, `show`; `studies` (with `--all-branches`, reading other branches through git). `run --study`, inheriting item and expectations; the implicit study for `--hypothesis`. ID uniqueness across local branches. Retention keeping every run a study cites or attaches. The dev server's read endpoints and its validated write endpoint, which writes files into its own worktree. | new `bench/suite/studies.mjs`, `commands/studies.mjs`, `packages/next/work/studies/README.md`; `cli.mjs` (dispatch, `--study`), `schema.ts`, `vite.config.ts` (endpoints), `data.ts`, the store's clean-up; the tracker's `scripts/work/views.mjs` (`check` calls the validator) | A study made, run against, noted and concluded from the CLI reads back with its evidence, and its file diffs cleanly. A verdict citing an invalid run warns. A run with `--hypothesis` and no study creates a file. A study on another local branch lists with its branch. The endpoint rejects a malformed or oversized body and never writes outside `work/studies/` (tested). A cited run survives retention. `studies --item CS-<n> --json` is stable for the tracker. | CS-390, and the tracker's `work/` folder |
| CS-405 | **The Studies page.** (Opus.) Studies: a list with status, item, question, latest evidence, branch, and a mark for uncommitted changes; studies on other local branches, read-only. A study's page: the question, hypothesis and expectations; the design as copyable commands, each marked with the run that executed it; the evidence, with each sweep in the sweep view, image runs as grids, before-and-after runs as forest plots with their results, and runs not in this store shown by ID and machine; notes; the verdict form (outcome, reasoning, cited runs picked from the evidence, decision item), which writes the file. Analysis replaced: `/analysis` redirects to Studies, and sweep runs without a study open in their run report. Overview's "Open studies". "Investigate" on alerts. Decision annotations on Trends. | new `views/Studies.tsx`, `views/Study.tsx`, `studies.css`; `views/Analysis.tsx` (removed), `routes.tsx`, `shell.tsx` (the rail item), `views/Overview.tsx`, `views/Alerts.tsx`, `trendsModel.ts`, `DESIGN.md` | The α study (CS-396) reads from question to verdict on one page. A verdict recorded in the page writes the file and appears in `study show`, and the reverse. Old `/analysis?sweep=` links land on the run's report or its study. Owner review by clicking around. | CS-395, CS-403, CS-404 |
| CS-406 | **The certificate authority, the hub and pairing.** (Opus.) `ca init` and `ca rotate`: an ECDSA root with Name Constraints, short-lived leaves for `<mac>.local` and the LAN addresses, made with a reviewed X.509 dependency, the key kept outside the repo. `hub`: LAN-only binding with the source-address check; the plain-HTTP certificate page with fingerprint and per-platform steps; the pairing page and `/pair`; device tokens (cookie or file), the registry, revocation. Settings › Devices in Dyno (list, pair, revoke, the authority's fingerprint). The platform check of Name Constraints, recorded. | new `bench/suite/hub/ca.mjs`, `hub.mjs`, `pairing.mjs`, `devices.mjs`, `commands/hub.mjs`, `views/Devices.tsx`; `cli.mjs` (dispatch), `routes.tsx`, `shell.tsx` (the Settings menu), `package.json` (`hub`, the X.509 dependency) | Tests with two temporary homes on loopback: the issued leaf verifies under the root, and a certificate for a public name can't be issued. A request without a token, with a revoked token, or from a public source address is refused. A code works once and fails after three wrong tries. The authority's key is never written inside the repo or into an archive, and the hub logs no token. The owner pairs the laptop's Edge and an iPhone by clicking around. | CS-390 |
| CS-407 | **The runner and remote runs.** `runner pair` and `runner` on the laptop: the outbound WebSocket, the device token, the pinned authority, jobs as browser sessions (`launchServer` on loopback, the Playwright protocol carried in the WebSocket), the laptop's run lock and wake lock, the telemetry stream, the versions and flags report. `bench/suite/browserArgs.mjs` shared by both sides. On the Mac: `run --on` and `images --on`, the hub fronting each run's servers with a session cookie, origins rewritten for pages, `chromium.connect` to the hub's local endpoint, the runner's telemetry in place of the local sampler, the link measured, `servedFrom` and the machine key, the runner's state on Getting started. | new `bench/suite/runner/runner.mjs`, `bench/suite/hub/jobs.mjs`, `hub/front.mjs`, `browserArgs.mjs`; `commands/runner.mjs`, `cli.mjs`, `images.mjs`, `telemetry.mjs`, `reuse.mjs` (the machine key), `views/FirstRun.tsx` | The α study's run, started on the Mac with `--on win`, measures in the laptop's Edge in a secure, cross-origin-isolated context and lands in the Mac's store as `machine: win`, served from `mac`. A remote run's first content differs from a local one on the laptop while frame time doesn't, and the two never share a series or reuse each other's repetitions. A second job waits on the laptop's lock and is told whose run holds it. Ctrl-C on the Mac, or a dropped connection, leaves no browser or lock on the laptop. A Playwright mismatch is refused with the fix. Nothing listens on the laptop's network interfaces. | CS-390, CS-406 |
| CS-408 | **The device lab.** The runner for Firefox on Linux, and for Android Chrome over `adb` from the machine the phone is plugged into. Manual device runs: `device-run` with one-time links and QR codes, the suite page's post-back of scenes, checks and the capability report, device aliases and hardware classes, validity "warning" by design. Which Android browsers and versions honor user-installed authorities and resolve `.local` names, checked and recorded in `bench/suite/DEVICES.md`. | `commands/device.mjs`, new `bench/suite/hub/deviceRuns.mjs`, `capabilities.ts`, `DEVICES.md`; `suite.ts` (post-back), `runner/runner.mjs` (Firefox, Android), `manifest.mjs`, `views/Runs.tsx` (devices) | A paired iPhone opens a run link, and its capability report and one scene's timings land in the Mac's store under its alias. Firefox on Linux runs a scene automatically. An Android phone runs a WebGPU scene in a secure context. A link works once. | CS-394, CS-404, CS-407 |

**Order.**

1. **CS-390 first.**
2. **Then, in parallel:** CS-391, CS-392, CS-393, CS-398, CS-399, CS-400, CS-404 and CS-406. They touch different files, except `cli.mjs`, where each adds only a dispatch line once CS-390 has split the commands. CS-399 and CS-403 both touch the rail in `shell.tsx`: whichever lands second places Tests in the first group.
3. **CS-402's first version** follows CS-392 and CS-404.
4. **CS-403** follows CS-391 (both change `routes.tsx`).
5. **The sweep chain:** CS-394 follows CS-393, then CS-395.
6. **CS-405** follows CS-395, CS-403 and CS-404.
7. **Then:** CS-396 follows CS-405; CS-397 follows CS-394 and CS-395; CS-401 follows CS-394; CS-166 waits for CS-397, CS-405 and the engine's knobs; CS-407 follows CS-406; CS-408 follows CS-394, CS-404 and CS-407.

## 12. Draft: AGENTS.md section and skill

These land in `packages/next/AGENTS.md` beside the tracker's "Work items" section, which merged first (CS-402). The two sections refer to each other: items say what to do, studies say what was found. Both skills live in `packages/next/.claude/skills/` (question 6).

### For `packages/next/AGENTS.md` (proposed text; not applied)

```markdown
## Measuring with Dyno

Dyno (`bench/suite/`, `docs/design/benchmark-suite.md`) is where we measure. Its results store
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
  you look at results. Study files live in `work/studies/`, beside the work
  items: commit them with your work, as you do items.
- **Commands** (from the repository root, `node packages/next/bench/suite/cli.mjs …`):
  - `list`: scenes, including development scenes (group D: gallery examples
    with parameters and a pose, and Lab pages).
  - `run --study <id> --scenes <ids> --against-base`: your branch against its
    base in one run.
  - `run --study <id> --scenes <ids> --sweep <setting>=a,b,c [--sweep …]
    [--reference <setting>=v]`: a sweep over settings (`settings` lists them;
    an unknown one is refused).
  - `images --study <id> --scenes <ids>`: image checks.
  - `… --on win`: the same run in the laptop's browser and GPU, served and recorded here.
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
- Never put an ion token on a command line, in a URL or in a log;
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
   `study note`. Commit `work/studies/<id>.md` with your work.
7. **Report.** The study ID, its branch and its verdict; run IDs, commands, one line each;
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
| 5 | The second machine? | **Changed:** no results repository for now. The laptop lends a browser endpoint over the LAN; the Mac builds, serves, drives and records (section 8). Archives by hand stay as the fallback. A Bentley-internal results repository later, perhaps. |
| 6 | Where does the skill live? | **`packages/next/.claude/skills/measuring-with-dyno/SKILL.md`, committed**, beside the tracker's `work-items` skill. |
| 7 | The engine's development knobs: public or development-only? | **Development-only**, through the dev handle, not in `api/surface.txt`. |
| 8 | Group D scenes on Scenes and in Overview? | **On Scenes under their own heading; never in Overview, headline means or budgets.** |
| 9 | Retention? | **Keep bench and image runs; prune test runs and recordings by count; never prune a cited or pinned run.** |
| 10 | How is the rail grouped? | **By what people come to do** (proposal A). |
| 11 | Rename Analysis to Sweeps and move Machines into Overview? | **Accepted**, then superseded by studies: Analysis becomes **Studies** (sweeps fold into study pages), and Machines moves into Overview. |
| 12 | Where do Scenes go? | **With results.** |
| 13 | The footer? | **One Settings item** for Theme and Keyboard shortcuts, beside Getting started and the ion token. |
| 14 | Where do studies live? | **In the repository**, beside the tracker's items (`packages/next/work/studies/`), with date-and-slug IDs, each linked to its `CS-<n>` item. No machine details; runs cited by ID. Agents commit study changes with their work. |
| 16 | How do other machines get a secure context and an encrypted channel? | **A Dyno-managed local certificate authority and one hub** on the requesting machine (section 8). Rejected: SSH (setup on each device; phones can't take part) and Tailscale (unavailable on the work laptop; not open-source friendly). |
| 19 | Do test devices install the authority? | **Yes, once per device,** from the hub's certificate page, then pair with a one-time code. |

### Open questions

Each has a recommendation; the plan assumes it.

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| 15 (CS-409) | Who records a verdict, and does a verdict close a decision? | **Agents may record verdicts on studies. A verdict that informs a decision item is shown on that item, and closing the decision stays the owner's step in the tracker.** | Only the owner records verdicts: slower, and agents' conclusions sit in notes until reviewed. |
| 17 (CS-410) | Does `--hypothesis` on a run without `--study` open a study? | **Yes**, named from the item and the date, so no hypothesis is left on a lone run. | Refuse, and require `study new` first: one more step for agents, a cleaner store. |
| 18 (CS-411) | May the Mac make baseline runs in the laptop's browser? | **Yes, from a clean integration-branch commit on the Mac.** They form their own series (`win, served from mac`), beside the laptop's locally served history. | Baseline runs only from the laptop's own checkout, served locally: one series, and someone at the laptop for each baseline run. |

## 14. Non-goals and follow-ups

- **Not here:**
  - running benchmarks on CI or dedicated runner machines beyond the owner's two (`docs/design/benchmark-suite.md`, "Later (v2 and beyond)"; CS-323 and CS-324);
  - the handbook reading the store instead of `bench/results` (a handbook change after CS-401);
  - parallel coordinates and parameter importance;
  - popping in motion as a metric. The α study measured static frames only. The transform-graph plan defines a pop as the largest screen displacement when tiles swap; that metric is a follow-up once a camera path runs on example scenes;
  - discovery beyond the Mac's `.local` name and LAN addresses (devices type or scan them);
  - the laptop building or running its own copy of the engine (it only lends a browser);
  - a Bentley-internal results repository.
- **Follow-ups owned elsewhere:**
  - the engine's shadow tuning knobs and `debug=cascade` (the cliff-band study);
  - a 1.x ×10 parity page at the example's close-up camera and sun (the transform-graph plan);
  - `view.converged()` (the refinement plan, which CS-394 adopts when it lands);
  - the Work page and the tracker's reading of studies (the tracker).

## 15. Risks

- **The store becomes a dump.** Many sessions making dev runs could bury the history. The defenses are the purpose default, the baseline guard, Trends' default, studies and the item filter; retention handles the rest.
- **Studies nobody concludes.** Open studies pile up. Overview lists open studies with their latest note, and the tracker's Work page shows the ones behind decisions. A study with no runs for a while is flagged as stale on Studies, by count of newer runs on its item, not by a date.
- **Verdicts that overreach.** A verdict claims more than its runs show. The defenses are citations with what each run showed, warnings for invalid runs or mixed hardware classes, and the owner's step on decisions.
- **Sweeps that cost too much.** Grids grow fast. The printed point count, the confirmation above 60 browser runs and early stop limit it; the skill says to cut axes first.
- **A setting that isn't applied.** The registry closes the silent no-op for known settings. CS-393's test reads a setting back from the page, so an adapter that stops applying it fails a test, not a study.
- **Example scenes drift from the examples.** An example may change its parameters or presets. Declared parameters make the CLI fail loudly when one disappears, and group D image checks show a changed look.
- **Timings from a busy machine.** The lock serializes runs, but a person's open dev server still renders. The run records other GPU processes and flags them. Development runs are judged within one run, against the base engine, which cancels most of it.
- **The hub as an attack surface.** It listens on the LAN while it runs and serves the run's pages. The defenses:
  - private source addresses only;
  - a device token on every request, except the pairing exchange (which needs a one-time code) and the public certificate page;
  - revocation from Dyno;
  - a session cookie per run on the fronted servers;
  - nothing listening when the hub isn't running.

  The runner opens no port at all.
- **The certificate authority's key.** Whoever holds it can sign certificates that paired devices trust. The defenses:
  - it never leaves `~/.cesium-bench/ca/` (readable by the user only), and never enters the repo, an archive or a request;
  - Name Constraints limit what it can sign to `.local` names and private addresses, where the platforms honor them;
  - `ca rotate` replaces it, and devices re-pair.
- **Devices that don't trust the authority.** Some Android browsers ignore user-installed authorities. CS-408 records which; those browsers take part over `adb` (Chrome on the phone's `localhost`) or not at all.
- **Studies out of sight on branches.** A study lives on its branch until it merges. `studies --all-branches` and the Studies page read other local branches through git, and the agent's report names the branch. Two branches editing one study conflict like any file; the tracker's claim on the study's item keeps one owner at a time.
- **Timings skewed by the link.** Engine assets cross the LAN in every cold context. "Served remotely" is part of the machine identity, the link is measured and flagged, and first content and settle are named as affected. Within-run comparisons, where every engine pays the same, stay the default.
- **Version drift between the machines.** Playwright, the browser and the flags must match. The runner reports all three and the Mac refuses a mismatch with the fix.
- **Secrets in metadata or requests.** URLs, recordings and requests could carry keys. The defenses:
  - requests are classified by host, never stored as URLs;
  - recording metadata keeps only allowlisted parameters;
  - everything on the LAN is HTTPS or TLS WebSocket under the local authority, and neither the hub nor the runner logs page traffic, URLs or tokens;
  - CS-398, CS-406 and CS-407 test it.

## 16. Dyno's navigation rail (owner, 2026-11-13)

The owner asked for a rethink of the left rail: the order and grouping of the pages no longer make obvious sense, and this plan adds pages. This section takes stock of what is built, groups it by what people come to do, and proposes a rail with one alternative.

- **Decided at review:** proposal A, Scenes with results, Machines into Overview, and the Settings footer (questions 10 to 13).
- **Changed with studies:** the Experiment group is now Studies and Lab.
- **Adjusted with the main session:** the tracker's Work page takes the first place in "Needs a look".
- **Building it:** CS-403 regroups the rail; CS-405 brings Studies.

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
| Needs a look | Work · Overview · Alerts · Images · Tests | Work is reserved for the tracker's board (kanban by lifecycle, dependency graphs, the decision backlog), with a count of decisions waiting on the owner. The tracker builds the page; until it exists, the rail shows nothing in its place. Images moves up beside Alerts, and Tests (CS-399) joins; the three queues carry counts. Overview gains Machines (from Analysis, CS-403) and "Open studies" (CS-405). |
| Results | Trends · Runs · Scenes | Scenes moves here: its pages are history. Runs holds every run kind (bench, images, Lab, recordings; test runs open in the Tests view), filtered by purpose, branch, item, study and machine (CS-391); runs on the runner and devices show their machine. Compare stays off the rail. |
| Look | Explorer · Viewer · Examples | The three live tools together. Examples keeps its page; its "Measure this" points at its group D scene. |
| Experiment | Studies · Lab | Studies replaces Analysis (CS-405). Sweeps fold into study pages, and a sweep run without a study shows its sweep view in its run report. Lab keeps its pages, with "Run and record" (CS-401). |
| Footer | Getting started · ion token · Settings | Settings, a menu, holds Theme, Keyboard shortcuts and Devices (paired runners and devices, pairing, revocation, CS-406). Getting started says whether the hub is running and which runners are connected (CS-407). |

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
- **DESIGN.md changes with the rail.** CS-403 and CS-405 rewrite, in the same change as the code:
  - DESIGN.md's "Who it is for" list (the five jobs above);
  - the information architecture table (proposal A as built);
  - the words list (section 2's vocabulary);
  - `shell.tsx`'s header comment.
