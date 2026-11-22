# A job system for background work (design and first slice, 2026-11-13)

**What this holds:** The job system's design and first slice (2026-11-13). Its ports are the job system's project in `work/`. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Why.** A CPU profile of the vertical-exaggeration example (`?x=4`) showed ticks about 120 ms apart while the render took about 3 ms of CPU. The terrain refit alone took about 7 of 25 s on the main thread; it now runs in the decode worker (merged 7358ab5310). The owner wants one system for multi-tick background work, modeled on game engines: jobs with priorities, dependencies and cancellation on a pool of workers, a tick in fixed phases, and a time budget only for what has to stay on the device's thread.

## Prior art

All pages read 2026-11-13.

| System                                                                               | Date                                                                       | What matters here                                                                                                                                                                                                                                                                                                            | Source                                                                                    |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Unreal Tasks System (`UE::Tasks`)                                                    | UE 5.0, released 2022-04-05 (that it first appeared in 5.0 is unconfirmed) | A graph of tasks with prerequisites, and waiting on one doesn't block a worker. Five priorities, from High to BackgroundLow. Pipes run a chain of tasks one after another. It shares TaskGraph's workers. The docs don't mention cancellation or work stealing.                                                              | dev.epicgames.com/documentation/en-us/unreal-engine/tasks-systems-in-unreal-engine        |
| Unity C# Job System                                                                  | 2018.1 (blog 2018-05-02)                                                   | Each job gets a copy of its data in native memory, never managed references. A `JobHandle` makes one job depend on others, and `CombineDependencies` merges them. The main thread calls `Complete()` before it reads a result. A worker that runs out of work takes jobs from other workers' queues (work stealing).         | docs.unity.com …/job-system/overview, …/job-dependencies                                  |
| Unity Async Upload Pipeline                                                          | blog 2018-10-08                                                            | `QualitySettings.asyncUploadTimeSlice`: at most this many ms per frame (1–33, default 2) of texture and mesh uploads on the render thread, with a ring buffer (`asyncUploadBufferSize`). Advice: the largest slice that doesn't drop frames, raised during loading screens.                                                  | unity.com/blog/engine-platform/understanding-the-async-upload-pipeline                    |
| Naughty Dog, "Parallelizing the Naughty Dog Engine Using Fibers" (Christian Gyrling) | GDC 2015                                                                   | A fiber-based job system, with The Last of Us Remastered running at 60 fps on PS4. Two details come only from secondhand copies of the slides: jobs wait on atomic counters as their dependencies, and there are three priority queues with worker threads locked to cores. FiberTaskingLib, built from the talk, does both. | gdcvault.com/play/1022186; github.com/RichieSams/FiberTaskingLib                          |
| Bevy task pools (`bevy_tasks`)                                                       | Bevy 0.2, 2020-09-19                                                       | Three pools: compute (work that must finish for the next frame), async compute (work that may span frames) and I/O. Built on `async-executor`. Its docs don't say whether it steals work.                                                                                                                                    | docs.rs/bevy_tasks; bevy.org/news/bevy-0-2                                                |
| Browser `scheduler.postTask`                                                         | Chrome 94, Firefox 142, no Safari; a WICG draft (2025-05-30)               | Three priorities: user-blocking, user-visible and background. A `TaskController` aborts a task or changes its priority later. Exposed in workers too. It orders work within one thread; it doesn't spread work across threads.                                                                                               | developer.mozilla.org/docs/Web/API/Scheduler/postTask; wicg.github.io/scheduling-apis     |
| OffscreenCanvas, worker `requestAnimationFrame`, `SharedArrayBuffer`                 | Baseline since March 2023 (the first two)                                  | `requestAnimationFrame` works only in dedicated workers that have an owner window. `SharedArrayBuffer` needs cross-origin isolation: COOP `same-origin` plus COEP `require-corp` or `credentialless`.                                                                                                                        | MDN: OffscreenCanvas, DedicatedWorkerGlobalScope.requestAnimationFrame, SharedArrayBuffer |

What we take: Unity's and Bevy's split between work that must finish this tick and work that may span ticks; Unreal's and Unity's prerequisites and Naughty Dog's counters as dependencies; Unity's upload time slice as the model for one main-thread budget; `postTask`'s `TaskController` as the model for canceling and re-prioritizing from outside the job. What doesn't carry over: fibers and shared-memory work stealing need threads that share a heap, which browser workers don't, except through `SharedArrayBuffer`.

## The design

- **Job types.** A job is a request type the content worker knows (`worker.ts`): a pure function of its payload, whose large arrays are transferred (`JobSpec.transfer`), never shared. Its main-thread step (`JobSpec.apply`) is separate and runs only in the apply phase. A job that fetches says so (`io: true`); in time, fetching moves out of the job and the job becomes the decode alone, over the bytes it is handed.
- **Priority.** A job's priority is its tile's request priority, the same number the tileset orders requests by (`Budgeted`: band plus distance, lower first; `Tile.requestPriority`). It is a function, read each time the queue or the apply phase sorts, so a job follows its tile as the camera moves. Screen-space error enters through the bands; a pure SSE order would be a change to `Budgeted`, not to the jobs.
- **Dependencies.** `JobSpec.after` lists jobs that must apply first; the payload may be a function of their values, read when the job is posted. Example (the slice): a tile whose parent's surface isn't resident measures its deviation after the parent's decode job applies. A canceled dependency cancels its dependents; a failed one fails them.
- **Cancellation.** The tile's `AbortSignal` (deselected, a caster yielding, the tileset destroyed) or `Job.cancel()` (`TerrainSource.unloadTile`: evicted) ends a job wherever it is: never posted from the queue, told to stop on its worker (its fetches abort; the worker stays counted busy until it answers), or its arrived result discarded (`JobSpec.discard`) before the apply phase.
- **Worker pool.** One queue on the main thread, sorted by priority when read. A worker takes the most urgent ready job when it has room: at most `CPU_PER_WORKER` (2) CPU jobs at once, one running and one in its message queue, so the order holds; I/O jobs aren't held to it (the request scheduler bounds them per origin). With no per-worker queues there is nothing to steal: a central queue that idle workers pull from is the message-passing equivalent of Unity's work stealing: no worker sits idle while a job it could run waits. Per-worker deques with stealing need shared memory (below).
- **Main-thread apply.** One phase at the end of each tick (`Engine.loop`, after the after-tick listeners): finished jobs' steps, most urgent first, until `Engine.jobBudgetMs` (4 ms) is spent; a step expected (from its type's recent cost) to overrun waits for the next tick, but at least one runs. Its results (content for the upload queue) are there for the next tick's selection and uploads. While no loop runs (tests, `stop()`), results apply as they arrive, as before. The inspector's Frame section shows the phase's time and count, and the jobs queued, running and waiting to apply (`FrameStats.jobs`); the recorder has `jobs_*` columns.
- **Shared memory, detected (the owner, 2026-11-13).** The rule of [architecture.md](architecture.md), "Unified streaming and tile selection (streaming/)" stands: nothing may require `SharedArrayBuffer`, because many deployers can't set COOP and COEP. So the engine detects isolation (`globalThis.crossOriginIsolated`, on the page and in each worker) and uses shared memory only when it is there. The `Jobs` API is the same either way, callers never branch, and the inspector shows the mode ("Job memory: shared memory" or "transfer"; `JobStats.memory`).
  - **Done in this slice.** A decoded terrain tile's kept heights (u, v, h, triangles, normals) go into one `SharedArrayBuffer`, so every later post of them shares instead of the page copying them. That covers a child's morph and refit requests, upsampling and deviation jobs. Checked under COOP `same-origin` with COEP `credentialless`: all 1,216 resident tiles held shared heights, with no errors.
  - **Next.**
    - The SoA tile table ([architecture.md](architecture.md), "Unified streaming and tile selection (streaming/)", [tile-selection-and-memory.md](tile-selection-and-memory.md), "Structure and formats") in shared memory, so traversal can run in a worker over the live table.
    - Rings in shared memory between workers and the device thread. Workers park on `Atomics.wait`. The page can't block, so it polls once a tick in the apply phase, or uses `Atomics.waitAsync` (Chrome 90, Firefox 145, Safari 16.4).
    - Per-worker deques with stealing.
    - Decode workers writing vertex data straight into a shared upload ring. `queue.writeBuffer` and `writeTexture` take `AllowSharedBufferSource`, so the device thread uploads from the ring with no copy.
  - **Deployment notes.**
    - An iframe gets isolation only from an isolated parent and `allow="cross-origin-isolated"`. That permission is in Chrome 88 and later; Firefox and Safari don't support it (MDN compat data).
    - COEP `credentialless` eases third-party assets: Chrome 96, Firefox 119, not in Safari (MDN compat data, read 2026-11-13). So Safari needs `require-corp`, with CORP or CORS on every asset.
- **Progressive jobs (the owner, 2026-11-13).** `Jobs.slice({ step(budgetMs) → { partial?, done }, onPartial, priority, signal, cancel })` is a resumable walk on the device's thread.
  - Each slice can hand back a partial result the engine uses at once, for example a sound lower bound that only tightens.
  - Slices share what the apply phase has left, most urgent first.
  - A changed input aborts the walk, and the caller starts a new one.
  - The body occluder's walk on `dev/horizon` (`BoundJob.step(budgetMs) → { s?, done }`, `bodyOccluder.ts`) has exactly this shape. It is the second workload to move once it lands, followed by imagery compositing, geometry-stats recounts and a progressive renderer's accumulation ([investigations-2026-11-13.md](investigations-2026-11-13.md)'s "refinement" item: a progressive job can report as a refinement source).
  - Where a walk's data can move, the same step function runs on a worker. Each partial then comes back as a result applied in the phase.

## Where it plugs in

The loop's phases today (`src/scene/Engine.ts`, `loop` then `tick`):

| Phase                  | What runs                                                                                                                                     | Budget today                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1 Tick listeners       | the app's clocks and animations; bulk slices (`tickSlices`)                                                                                   | bulk: 4 ms                                                              |
| 2 Camera layer         | placements (`cameras.update`)                                                                                                                 | none                                                                    |
| 3 Warp fits            | `warpTick`                                                                                                                                    | `warpBudgetMs` 4 ms                                                     |
| 4 Tick                 | sky upload slice; links; change detection; selection, requests and uploads (`updateTilesets`); warp fits for placed tiles; idle picks; render | uploads: bytes and ms (`uploadBudget`); external tile trees: one a tick |
| 5 After-tick listeners | the app                                                                                                                                       | none                                                                    |
| 6 Apply (new)          | jobs' main-thread steps                                                                                                                       | `jobBudgetMs` 4 ms                                                      |

Outside the loop, worker replies used to run their main-thread steps as messages arrived, between ticks and unbudgeted; the terrain refit's page-side fallback ran on its own `setTimeout`, 2 ms per 16 ms. Both now run in phase 6 when the engine is running. Later, the budgets of phases 1, 3, 4 and 6 should come from one tick budget (the time left before the next vsync), not four fixed ones.

**Main-thread hot spots.** Measured with `profilePage` (500 µs samples, which inflate wall time) and `profileTree` (inclusive time) on `#/examples/vertical-exaggeration?x=4` and `?x=10&view=zermatt-close`, headless Edge on this machine's GPU, 25 s each, 2026-11-13.

| Hot spot                               | x=4 before the refit merge (337427411e) | x=4 now (7358ab5310) | zermatt-close now | Where it goes                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------- | -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile: wall / main thread busy       | 40.8 s / 17.9 s                         | 63.7 s / 16.8 s      | 97.3 s / 37.7 s   |                                                                                                                                                                                                                                                                                                                                                                                                               |
| Terrain decode completion (`loaded`)   | 9.0 s, 8.9 s of it the refit            | under 0.1 s          | under 0.1 s       | Refit: decode worker (merged). The rest: the apply phase (this slice); the fallback becomes deviation jobs.                                                                                                                                                                                                                                                                                                   |
| Tile selection (`updateTilesets`)      | 5.4 s                                   | 11.5 s               | 27.6 s            | The biggest by far. Not a background job: it needs this tick's camera. Make it cheaper first (`display` 6.2 / 14.1 s, `updateVisibility` 4.8 / 10.6 s, screen-space error 2.1 / 4.0 s, the warp's `drawnTile` 1.1 / 2.7 s), then traverse in a worker over the tile table in shared memory ([tile-selection-and-memory.md](tile-selection-and-memory.md), "Structure and formats"), or move the whole engine. |
| Occlusion asks (`askOcclusion`)        | 0.4 s                                   | 1.25 s               | 2.8 s             | Part of selection; GPU feedback                                                                                                                                                                                                                                                                                                                                                                               |
| Requests (`tilesetLoad.request`)       | 0.5 s                                   | 1.1 s                | 2.4 s             | Stays (per tile, cheap)                                                                                                                                                                                                                                                                                                                                                                                       |
| Render (`renderTick.render`)           | 0.7 s                                   | 1.1 s                | 3.3 s             | Device thread                                                                                                                                                                                                                                                                                                                                                                                                 |
| Imagery update (`GlobeImagery.update`) | 0.6 s                                   | 0.8 s                | 2.5 s             | Compositing as a progressive job                                                                                                                                                                                                                                                                                                                                                                              |
| Warp fits (`warpTick`)                 | 0.3 s                                   | 0.4 s                | 1.3 s             | Already budgeted; a progressive job                                                                                                                                                                                                                                                                                                                                                                           |
| Uploads (`tilesetUpload.upload`)       | 0.2 s                                   | 0.3 s                | 0.8 s             | Device thread, budgeted (`uploadBudget`)                                                                                                                                                                                                                                                                                                                                                                      |
| The example's React UI                 | 0.45 s                                  | 0.8 s                | 1.2 s             | The app's                                                                                                                                                                                                                                                                                                                                                                                                     |

**What fills the time between ticks.** Each profile sample was classed by the task it ran in. At x=4 before the merge, a tick plus the gap after it averaged about 150 ms: 51% idle, 25% terrain decode completion, 14% the tick, the rest other tasks. After the merge, the decode completion is gone, but the main thread is still idle for 62% of that time at x=4.

The ticks are held by the GPU. Each submit takes a median of 206 ms (x=4) and 189 ms (zermatt-close) from `queue.submit` to `onSubmittedWorkDone`, while the page's own `requestAnimationFrame` runs at 16.7 ms. Other sessions were using this GPU, so these numbers can't separate the example's own GPU cost from contention.

So the "120 ms apart" seen earlier was main-thread work only in part. Before the merge, a quarter of the gap was the refit. At zermatt-close, selection fills about half of each gap. A trace with nothing else on the GPU should come next (next steps, below).

## First slice (this change)

- `src/io/Jobs.ts`: the queue, the dependencies, cancellation and the apply phase, over a port (`JobPort`) so tests use a fake worker. `WorkerPool` now sends every request through it: `request()` is a job with no priority and no apply step (as before); `submit()` takes the rest.
- `Engine`: the apply phase as the loop's last step (`jobBudgetMs`, default 4 ms), a `jobs` tick reason while results wait, `FrameStats.jobs`, and the inspector's and recorder's rows.
- The workload migrated, terrain (`TerrainSource.jobs`, set by `addTerrain` and `addEllipsoid`):
  - A tile's decode is an I/O job with its tile's request priority, and its decode completion (`loaded`: availability, children, bounds, the refit's bookkeeping) is the job's apply step.
  - The refit's page-side fallback (pairs the decode worker couldn't measure because the parent's surface wasn't resident) is now a `terrainDeviation` CPU job on a worker. It runs after the parent's decode job when the child came first, and is canceled when either surface leaves or the parent's decode is canceled. It replaces the fallback's own 2 ms per 16 ms `setTimeout` budget, which stays for a source without jobs (tests).
- Tests:
  - `test/jobs.test.ts` (27): priority order and re-reading, the CPU limit, the apply phase and its budget, cancellation (queued, running and arrived), dependencies with values, failure, and progressive jobs (partials, sharing the budget, cancellation).
  - `test/sharedMemory.test.ts` (3): shared heights when isolated, transferred otherwise, and the mode.
  - Three in `test/terrainRefit.test.ts`: the same errors as measuring on the page; a child measured after its parent's decode, in the apply phase; and cancellation by eviction and by the parent's decode.
  - Full suite, 2026-11-13, on a machine heavily loaded by other sessions: the failures were timeouts, plus `internalMembers` (skipLibCheck) and `warpGlobe` (stepwise under a warp), which fail on the base 7358ab5310 too, and `volumes`, which needs 1.x's generated shaders that this worktree lacks. Two `casterLoop` tests failed only after earlier tests in the file timed out, and pass alone on both builds.
- Measurement tools: `profilePage.mjs` keeps the raw profile (`PROFILE_OUT`), and `scripts/profileTree.mjs` sums inclusive time by function.

**Before and after**, recorder only (no profiler), alternating builds, three runs of 25 s each. Before is the merged base 7358ab5310; after is this slice. Tick gaps are from 3 s on.

| Page          | Build  | Tick gap p50 / p90, ms (per run)  | Long tasks, s (per run) | Apply phase, ms (p50 / p99 / max) |
| ------------- | ------ | --------------------------------- | ----------------------- | --------------------------------- |
| x=4           | before | 183 / 250 · 33 / 117 · 50 / 167   | 0.65 · 1.87 · 1.49      | —                                 |
| x=4           | after  | 167 / 217 · 117 / 200 · 50 / 167  | 0.05 · 0.57 · 0.82      | 0.2 / 3.5 / 4.0                   |
| zermatt-close | before | 150 / 267 · 83 / 117 · 133 / 250  | 12.6 · 21.2 · 13.2      | —                                 |
| zermatt-close | after  | 100 / 117 · 117 / 133 · 117 / 167 | 23.0 · 20.4 · 17.4      | 0.6 / 3.4 / 7.7                   |

What this shows:

- The tick spacing differs between runs of the same build by more than between the builds. With the GPU holding the ticks (above), the slice can't move it in these runs, and it doesn't.
- At x=4, long tasks were fewer after (0.05–0.82 s against 0.65–1.87 s), but three runs are too few to claim a gain.
- The apply phase keeps to its budget: p99 3.4–3.6 ms, with one step over it (7.7 ms, a step longer than the budget runs alone).
- Main-thread busy time, from the profiles: x=4 16.8 s before and 13.9 s after, zermatt-close 37.7 s and 51.9 s. The runs' wall times differ (64 and 50 s, 97 and 113 s), so these are noise as well.
- What the slice changes is where the work runs and that it is bounded and visible. The cost that remains is selection, on the main thread.

## Spike: the whole engine in a worker (measurements only, not merged)

The spike page is `spikes/workerLatency.html` on the branch `spike/offscreen-worker`, which is not merged; it builds on the M0 smoke test ([m0-spike-results.md](../history/m0-spike-results.md), `spikes/worker.html`), which was rerun as well. It runs the M0 worker spike's scene with the ellipsoid globe streaming under it: the globe's tiles decode in content workers, which are nested ones when the engine itself is in a worker. The same probe code runs with the engine on the page (`?mode=main`) or in a dedicated worker on a transferred `OffscreenCanvas` (`?mode=worker`).

A script drives the page in headless Edge on this machine's GPU (1280 by 800 CSS px). Each mode runs with the page idle, and then with a 50 ms busy-wait on the page every 200 ms (`busy`):

- Frame stability: the camera turns every tick for 8 s, and we time the engine's ticks.
- Input: 60 real pointer moves, 100–140 ms apart, each setting the camera's heading. We time from the event's `timeStamp` to the end of the tick that renders it ("submit"), and to `onSubmittedWorkDone` for that frame ("GPU done"). GPU done stands in for the photon. Display latency adds the compositor's frame or two, which a headless browser can't show.
- Picks: 30 picks of the view's center, timed on the page's clock from the call to the answer.

Headless Edge, this machine's GPU (shared with other sessions), 2026-11-13. Two rounds; each cell gives round 1 then round 2.

| Measure                                   | Main thread                    | Main, busy page     | Worker                           | Worker, busy page     |
| ----------------------------------------- | ------------------------------ | ------------------- | -------------------------------- | --------------------- |
| Tick gap p90 / p99, ms                    | 16.7 / 16.8 · 33 / 50          | 16.8 / 33 · 33 / 50 | 33 / 50 · 16.7 / 16.8            | 33 / 67 · 50 / 83     |
| Ticks over 25 ms                          | 0% · 28%                       | 9% · 25%            | 14% · 0.2%                       | 13% · 24%             |
| Input → submit, p50 / p90, ms             | 10 / 16 · 11 / 17              | 12 / 26 · 13 / 52   | 12 / 18 · 11 / 18                | 12 / 28 · 15 / 56     |
| Input → GPU done, p50 / p90, ms           | 20 / 25 · 30 / 42              | 26 / 60 · 39 / 86   | 25 / 39 · 22 / 28                | 28 / 50 · 55 / 98     |
| Pick, p50 / p90, ms                       | 4.2 / 14.5 · 14 / 18           | 5.8 / 53 · 13 / 55  | 1.3 / 1.9 · 1.5 / 3.0            | 1.3 / 2.5 · 1.7 / 8.2 |
| HTML pin behind the canvas, p90 / max, ms | 0 / 0 (written in the tick)    | 0 / 0               | 0.2 / 2 · 0.1 / 0.2              | 34 / 111 · 32 / 48    |
| Ready (page load to first frame), ms      | 785 · 2,250; later 1,554–1,739 |                     | 2,594 · 3,854; later 2,738–3,992 |                       |

- The M0 smoke test (`spikes/worker.html`) still passes. Its heading went from 11° to 95° across a 3 s block of the page.
- `?mode=auto` probes in the worker: `navigator.gpu`, then an adapter, then a WebGPU context on a throwaway `OffscreenCanvas(1, 1)`. Its answer came 1.7–2.1 s after page load, mostly the worker's module load (the dev server serves modules unbundled). Startup was then 3.2–3.8 s, against 2.7–4.0 s when the worker was asked for directly. So in two runs the probe added no time that could be told apart from noise.
- Frame stability is inconclusive: the two rounds disagree, and the GPU wasn't ours alone. These findings held in both rounds:
  - A busy page delays input in either mode, since input arrives on the main thread. The worker doesn't help input.
  - Picks answer faster from the worker (1.3–1.7 ms p50).
  - A worker's HTML overlays trail the canvas by about two frames at p90 (32–34 ms) when the page is busy, and up to seven. Labels drawn in the engine have no such lag.
  - Starting in a worker costs about 1.2–2 s more in development.

**What the app-facing API would need.** Today the API is synchronous and in-thread: 843 exported names over six entry points, 506 of them in the core. Applications read engine state every tick: the vertical-exaggeration example's readings, pins and sites read cameras, heights and stats in tick listeners, and its panels are DOM. There are two ways to put the engine in a worker:

- **Proxying.** Page-side handles mirror `Engine`, `View`, `World` and the tilesets. Every read becomes async, or a snapshot pushed each tick, and `onTick` listeners can no longer change the scene in the tick they run in. That is a second API, and its reads lag a tick behind the image.
- **Running app code in the worker.** The application's engine-facing module runs in the worker with the API unchanged. Its UI stays on the page and talks to that module over the application's own messages. The engine would ship a small bridge for this: input forwarding (pointer, wheel and key events as plain data, with coalesced moves), resize and pixel ratio, picks, and the widgets' data. `engineSnapshot` and the recorder's rows are already plain data.

The second is far smaller and keeps one API, so it is the recommendation if we go this way. The core touches no DOM (handbook API tab), so nothing in it blocks either option.

**Risks for an app that embeds the engine.**

- Input arrives only on the main thread. A busy page still delays input on its way to the worker; the spike measures this.
- HTML overlays (labels, pins) are placed from worker results a message later than the canvas they sit on, so they lag the image by a hop. Labels drawn in the canvas don't.
- A host that already uses WebGPU on the page can't share our device with it: a device lives on one thread. So a host with its own WebGPU work would have to move that work into the worker too.
- Nested workers: our content workers then start from inside a worker. They do in Edge (measured here) and, per the compat data, in Safari from 15.5.
- The worker's script and its blob trampoline (`workerStart`) need `worker-src` in the host's CSP, as the content workers already do.
- Screenshots and readbacks (`toBlob`, `readHdr`) go through the worker.
- WebXR sessions are owned by the page; an XR mode would need the engine back on the main thread or a WebXR-in-worker path. Unchecked.
- Debugging spans two threads, and errors surface in the worker.

**Decision table.**

| Question                                      | Answer                                                                                                                                                                                                                                                 | Basis                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Does the engine run unchanged in a worker?    | Yes                                                                                                                                                                                                                                                    | M0 smoke test rerun; this spike with a streaming globe and nested content workers |
| Is the app-facing API the same in both modes? | **Decided (the owner, 2026-11-13)**: one main-thread API whose layer underneath runs the engine in-thread or in a worker                                                                                                                               | See "One API, two backends" below                                                 |
| Does a worker free the page?                  | For rendering, yes: it kept rendering through a 3 s block. For input, no: input reaches the worker through the page                                                                                                                                    | M0 rerun; input rows above                                                        |
| Is frame stability better in a worker?        | Can't tell from these runs                                                                                                                                                                                                                             | The rounds disagree; GPU shared                                                   |
| HTML overlay lag in a worker                  | About 2 frames at p90 under a busy page, up to 7; none in-thread; none for in-engine labels                                                                                                                                                            | Pin row                                                                           |
| Picks                                         | Faster from the worker                                                                                                                                                                                                                                 | Pick row                                                                          |
| Can it detect WebGPU in a worker?             | Yes, with a probe inside the worker (prototyped as `?mode=auto`)                                                                                                                                                                                       | See "Choosing the thread" below                                                   |
| Worker by default in Dyno?                    | **Not yet.** Make `thread: "auto"` available in Dyno (`&thread=`) and make it the default only after a headed run on an otherwise idle GPU shows smoother ticks                                                                                        | This spike                                                                        |
| Keep main-thread mode for                     | Hosts that share a WebGPU device with the engine, use WebXR, need HTML overlays in the same frame, have a CSP without `worker-src`, or run Firefox where its worker WebGPU is missing (not Windows or Apple silicon). Also tests, which need no worker | Support facts below                                                               |

**One API, two backends (decided by the owner, 2026-11-13).** In the owner's words: "the user facing API is always the same and you call it from the main thread, but under the hood we might have a layer that translates that to the engine running in a different thread or leave the execution synchronous in the main thread." What follows from it:

1. A main-thread façade over two backends: in-thread (synchronous) and worker (proxied).
2. The façade's rules:
   - Commands become an ordered queue, batched per tick, needing no reply.
   - Reads come from a per-tick snapshot store: cameras after the rig, stats, and overlay screen positions published by the engine each tick.
   - Queries (pick, heights, rays) are promises.
   - App code that must run inside the engine (warps written as closures, frame resolvers, per-tick callbacks, `addFrameCompute`) becomes worklet-style modules loaded by URL into the engine's thread.
3. Both modes offer only what both can keep. The main-thread mode offers no synchronous read that the worker mode couldn't; there, a snapshot is simply current.
4. The API test suite runs in both modes, to enforce that parity.
5. Comlink suits the query round trips (promises over messages). The per-tick command stream uses our own batched protocol.

What breaks those rules today is the migration work. An audit of the core types (2026-11-13) counts 110–130 members. A summary:

| Kind                                         | Members today (examples)                                                                                                                                                                                                                                                                                                                                                                                                                   | Becomes                                                                                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synchronous reads of engine state (about 75) | `engine.stats`, `gpuPasses`, `occlusionStats`, `errors`, `time`, `bodyCamera(view)`; `view.camera` values once a rig or link moved it, `readout()`, `anchorPlacement`, `anchorRoute(s)`, `toPixel`, `occlusionState`; `world.memory`, `pressure()`, the revision counters, `items`, the matrices of tile draws, `feature(id)`; `tileset.stats`, `idle`, `active`, `morphing`, `credits()`, `sampleHeight`, `surfaceHeight`; `Clamp.height` | Snapshot fields, plus `toPixel` positions published for chosen points. `sampleHeight` and `surfaceHeight` become promises, or a height grid streamed to the page. `feature(id)` becomes a promise. |
| Calls returning a handle                     | Page-side ids: `createWorld`, `addView`, `link`, `addEllipsoid`, `world.add`, `addClip`, `addLight`, `addAnchor`, `addHeightCapture`. A worker-side slot: `addDraw`, `addTransform`, `addMesh`, `addMaterial` (deduplicated), `allocateClip`, `removeMesh`                                                                                                                                                                                 | The page names the handle and the worker maps it, so the command needs no reply. Slot numbers and capacity errors arrive later, as events.                                                         |
| Writes in place that no command carries      | `sunDirection`, `icrfToFixed`, camera vectors plus `version++`, `viewport`, `observer`, `lighting`, `View.overlays`, the `tileset.selection` proxy                                                                                                                                                                                                                                                                                         | Setters that queue commands                                                                                                                                                                        |
| Callbacks run inside the tick                | `onTick` (it returns "busy"), `queries.standing`'s query closure, `debugTileColor`, `addFrameCompute`, `Warp.forward` / `inverse`, frame resolvers, `toParent`                                                                                                                                                                                                                                                                             | A page `requestAnimationFrame` that sends commands, plus a keep-awake command. Code that must run inside the tick becomes worklets.                                                                |
| Events                                       | `onAfterTick`, `onError`, tileset events, `onHeightsChanged`, `Camera.watch` for engine-made changes                                                                                                                                                                                                                                                                                                                                       | Delivered after the tick (already this shape)                                                                                                                                                      |
| Already async                                | `create`, `loadGltf`, `loadTileset`, `addTerrain`, `whenReady`, `compileShader`, `sampleHeightMostDetailed`, `pick`, `pickPosition`, `pickPoint`, `readHdr`, `castRays`, `queryRays`, `whenSettled`                                                                                                                                                                                                                                        | Unchanged                                                                                                                                                                                          |
| DOM                                          | `CanvasTarget(HTMLCanvasElement)`, `devicePixelRatio`, `ResizeObserver` in `watchView`, controllers' pointer listeners, `TextureSource` canvases, the widgets                                                                                                                                                                                                                                                                              | Stay on the page and send commands (resize, camera). A canvas texture becomes an `ImageBitmap`.                                                                                                    |

**Choosing the thread (the owner, 2026-11-13).** A host option, `thread: "auto" | "main" | "worker"`, default `"auto"`:

1. Start the engine's module worker. If that fails (a CSP without `worker-src`, or no module workers), use the main thread.
2. Probe inside the worker:
   - `navigator.gpu` is present;
   - `await navigator.gpu.requestAdapter()` isn't null;
   - `new OffscreenCanvas(1, 1).getContext("webgpu")` isn't null.

   The probe uses a throwaway canvas because `transferControlToOffscreen()` on the real canvas can't be undone. The adapter request overlaps work the engine does at startup anyway.

3. If the probe passes, transfer the real canvas and run there. If it fails, run on the main thread with the same API.
4. Cache the answer per user-agent string in `localStorage` (with try/catch). If the cached mode then fails, probe again.
5. The inspector shows the chosen mode and why.
6. The same probe serves a future WebGL 2 renderer (`getContext("webgl2")`).

The spike prototypes steps 1–3; the cache and the inspector row come with the façade.

**Support, as of 2026-11-13** (MDN browser-compat-data unless noted):

- WebGPU in workers (`WorkerNavigator.gpu`) and `OffscreenCanvas.getContext("webgpu")`:
  - Chrome: 113 (2023-05-02) on ChromeOS, macOS and Windows; 144 (2026-01-13) adds Linux on newer Intel GPUs.
  - Safari: 26 (2025-09-15).
  - Firefox: 141 (2025-07-22) on Windows; Apple silicon from 145 or 147 depending on the macOS version; no Intel Macs or Linux.
  - The WebGPU spec exposes the API in workers. The vendors' release posts don't mention workers.
- `requestAnimationFrame` in dedicated workers with an owner window, and `OffscreenCanvas`: Baseline since March 2023.
- Module workers: Chrome 80, Safari 15, Firefox 114. Nested workers: Safari 15.5.
- CSP: `worker-src` (Chrome 59, Firefox 58, Safari 15.5) falls back to `child-src`, then `script-src`, then `default-src`. A `blob:` worker, which is our cross-origin trampoline (`workerStart`), needs `blob:` listed; `'self'` doesn't match it (CSP3).

**Build vs adopt (the owner asked, 2026-11-13).** Read on the packages' npm and GitHub pages 2026-11-13. Downloads are for the week to 2026-11-12. Sizes are minified / gzip, from bundlephobia.

| Library                                                 | Latest                       | Weekly downloads | Open issues        | License    | Browser                                   | Size              | For us                                                                                                                                                  |
| ------------------------------------------------------- | ---------------------------- | ---------------- | ------------------ | ---------- | ----------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comlink                                                 | 4.4.2, 2024-11-07            | 4.1 M            | 79                 | Apache-2.0 | Workers; module workers not stated        | 4.3 / 1.9 kB      | RPC by `Proxy` over `postMessage`, with transfer handlers. No pool, priority, cancellation or budget. **Evaluate for the façade's query round trips.**  |
| workerpool                                              | 10.0.3, 2026-07-01           | 14.5 M           | 27                 | Apache-2.0 | Yes; module workers not stated            | 32.1 / 9.2 kB     | A pool; canceling terminates the worker. No priority, dependencies or budget.                                                                           |
| loaders.gl `WorkerFarm` / `WorkerPool`                  | 4.5.4, 2026-10-11            | 2.4 M            | 9                  | MIT        | Classic workers only                      | 13.7 / 4.7 kB     | A FIFO queue: no priority, no canceling a queued job.                                                                                                   |
| loaders.gl `RequestScheduler`                           | 4.5.4, 2026-10-10            | 2.5 M            | (same repository)  | MIT        | Yes                                       | in 36.8 / 11.9 kB | The closest prior art in our domain; mechanism below.                                                                                                   |
| CesiumJS 1.x `TaskProcessor`                            | `cesium` 1.147.0, 2026-11-02 | —                | 1,557 (repository) | Apache-2.0 | Module workers                            | —                 | One worker per instance. Over `maximumActiveTasks` it returns `undefined` and the caller retries next frame. No priority, cancellation or dependencies. |
| wasm-bindgen-rayon                                      | crate 1.3.0, 2024-12-21      | not on npm       | 7                  | Apache-2.0 | Needs isolation, nightly Rust, `+atomics` | —                 | Rayon threads for Rust/WASM only. Adopt only if heavy compute moves to Rust.                                                                            |
| `scheduler.postTask` / `yield` and `scheduler-polyfill` | polyfill 1.3.0, 2024-10-22   | 144 k            | 0                  | Apache-2.0 | Chrome 94 and 129, Firefox 142, no Safari | 6.5 / 2.3 kB      | Priorities and cancellation within one thread. Fits page-side, non-engine work, not the pool.                                                           |
| React `scheduler`                                       | 0.28.0, 2026-09-09           | 263 M            | (react repository) | MIT        | Yes; the API is marked unfinished         | 3.7 / 1.6 kB      | Time-slicing on one thread with 5 ms yields. No workers.                                                                                                |
| threads.js                                              | 1.7.0, 2021-09-25            | 0.9 M            | 102                | MIT        | Yes                                       | 34.8 / 10.6 kB    | Unmaintained since 2022 (last npm change).                                                                                                              |
| Piscina, Tinypool                                       | 5.3.2 / 2.2.0                | 16.5 M / 67 M    | 8 / 2              | MIT        | Node only (`worker_threads`)              | —                 | Not usable here.                                                                                                                                        |

How loaders.gl's `RequestScheduler` works (`request-scheduler.ts`):

- It throttles network slots: `maxRequests` is 6 by default.
- On each arrival or completion, never on a tick, it calls every queued request's `getPriority`. A negative value cancels the request, and the rest are sorted with the lowest number first. Its doc comment says the opposite.
- It has no time budget, and it can't cancel a request already in flight.

Ours re-ranks every time it orders the queue, cancels at every stage, and adds dependencies and a device-thread budget.

**Verdict.** It confirms the working recommendation. No library found combines priority re-ranking, cancellation at every stage, dependencies and a per-tick device-thread budget. So:

- Keep `WorkerPool` as the transport.
- Keep the scheduler our own (this slice).
- Evaluate Comlink for the façade's query round trips only.
- Adopt wasm-bindgen-rayon only if heavy compute moves to Rust/WASM.

No dependency is added without the owner's agreement.

## Next steps

1. Measure frame pacing headed, on an otherwise idle GPU, with `gpuprobe` (submit to done) beside the recorder. Today's tick spacing was held by the GPU, in runs where other sessions shared it.
2. Selection: cut `display` and `updateVisibility`. Then traversal in a worker over the tile table, shared when isolated ([tile-selection-and-memory.md](tile-selection-and-memory.md), "Structure and formats").
3. The body occluder's walk as the second workload (`Jobs.slice`) once `dev/horizon` lands. Then imagery compositing, the warp fits and the bulk slices, all from one tick budget instead of four fixed ones.
4. Rings in shared memory, and fetching moved out of decode jobs, so a job is the decode alone over the bytes it is handed.
5. The façade: its command protocol, the snapshot store and `thread: "auto"`, with the API tests run in both modes. Start with the reads in the migration table that examples use (`stats`, `view.camera` after a rig, `toPixel`, `sampleHeight`).

## Owner's decisions after review (2026-11-13)

**App jobs: yes, narrowly, later.** Apps will be able to submit their own jobs, but not until the internal API has settled across more engine workloads (CS-87, CS-88, CS-89, CS-90, CS-91, CS-92, CS-93, CS-94 and CS-98 below). The shape to build then:

- `engine.jobs.run(moduleUrl, name, input, { priority, signal })` returns a promise. An async-iterator form serves progressive jobs that yield partial results. An optional `apply(result)` step runs in the budgeted apply phase, for results that change the scene.
- App code loads by module URL, the worklet-style rule for app code inside the engine ([2026-11-13-architecture-decisions.md](../decisions/2026-11-13-architecture-decisions.md), threading), so it works the same in both thread modes.
- App jobs run in **their own worker group**: they share the scheduler's priorities and budget accounting, but never the engine's decode workers, so a slow or failing app job can't stall content.
- App priority bands sit below "visible content" by default. An app can raise a job to "interactive", never above the engine's own visible work.
- App jobs appear in the inspector as their own group.
- Internal job kinds, dependencies and slices stay internal until then.

**The inspector's Jobs section** (built under the inspector rules: values change, the layout doesn't; recorder columns for every value; per-tick stepping when paused):

- **Main-thread apply** as a sparkline row against its budget line, in Frame, beside CPU and GPU time.
- **A table by job kind** (decode, refit, imagery, occluder walk, warp fits, b-rep, Slang, app): running, queued, latency from submit to applied (a 30-second sparkline), worker time, canceled. A stacked chart of worker time by kind, as the GPU section stacks passes.
- **Worker utilization:** a small busy-against-idle bar per worker, per group (engine, dedicated, app).
- **Progressive jobs** with their progress, the same items the refinement API reports as sources.
- **The memory mode** in the header ("shared" when cross-origin isolated, else "transfer"), and shared-ring use in Memory.
- **Device-thread budgets** that aren't CPU jobs (imagery compositing passes, upload pacing) report in the same section, so all scheduled work is in one place.

## Porting existing work onto the job system (owner, 2026-11-13: tracked so it isn't forgotten)

Each item moves existing code onto `Jobs` (priority, cancellation, an apply step or slices, inspector visibility). Found by an inventory of `src/` on 2026-11-13 (`new Worker(`, direct `workers.request`, and main-thread budgets).

- **CS-87: content decode with priorities and cancellation.** glTF and 3D Tiles content (`engineContent.ts` `workers.request`), and the terrain request in `engineScene.ts`. They pass through `Jobs` today but with no priority, no cancellation when a tile is deselected and no apply step. Give them the tileset's request priority, cancel on deselection or eviction, and move the upload-preparing main-thread work into apply steps.
- **CS-88: one-off engine loads.** The glare kernel, the star field and the sky pack (`Engine.ts`, direct `workers.request`): priorities below visible content, cancellation on dispose.
- **CS-89: dedicated worker groups.** Workers outside the pool, which are long-lived or carry large WebAssembly, keep their own workers but are scheduled and shown through `Jobs` as dedicated groups: the Moon map (`moonMapLoad.ts`), the Slang compiler (`slang.ts`), the b-rep kernels (`brep/kernelClient.ts`, Open CASCADE and SMLib) and b-rep sections (`brep/sectionClient.ts`). This is also the mechanism app jobs use later.
- **CS-90: the horizon occluder's walk.** `BoundJob` (`globe/bodyOccluder.ts`) and its `BUDGET_MS` adapter become a progressive job of the apply phase's slices, reporting as a refinement source.
- **CS-91: warp fits.** `warpTick` (`Engine.ts`, `warpBudgetMs`) becomes progressive jobs, fits off the main thread where the warp's function can run in a worker (compiled routes, built-ins), and a main-thread slice otherwise (closures).
- **CS-92: b-rep sections' main-thread steps.** `section.step(budgetMs)` (`brep/section.ts`) moves onto the apply phase's slices.
- **CS-93: the public slicers.** `timeSlices` and `tickSlices` (`core/bulk.ts`, used by frames, measurement and engineering frames) run on the job system's slices, so app bulk work and engine work share one budget.
- **CS-94: the refit fallback's own budget.** `REFIT_BUDGET_MS` in `TerrainSource.ts`, if anything of it remains after the first slice, folds into the apply phase.
- **CS-98: tile selection off the main thread.** The biggest main-thread cost profiled (above's hot spots): the worker traversal over a transferable tile table ([tile-selection-and-memory.md](tile-selection-and-memory.md), "Structure and formats"), as jobs. Re-profile first: horizon culling, occlusion and coarsening cut the deep views' tiles from thousands to hundreds after those profiles.

**Planned work in other plans that uses the job system, not ad-hoc workers or budgets:**

- Cesium IR plan: CS-58's lazily loaded naga is a job type on a dedicated worker group, and compiles triggered by live edits (the MaterialX example) are cancelable jobs, a newer edit canceling an older compile.
- WebGL 2 plan: lattice fits, light binning and naga translation run as jobs; per-draw culling stays on the engine thread.
- Engine profiles plan: the governor and the measured step costs read job and apply-phase timings.
- The refinement plan (project CS-15): progressive jobs report as refinement sources through `JobSpec.refinement` and `SliceSpec.refinement`; one owner per item.
- The streaming robustness plan (project CS-16): one attempt is one job; a cancel during an attempt is `Job.cancel()` (CS-87); `JobStats` gains `failedTotal`.
- The transform-graph plan: warp fits (CS-91) and the occluder walk (CS-90).
- The LOD transitions plan: CS-124's retargeting recompute is a job (decode workers' group, prioritized by screen error, canceled by its give-up rule, a release or a reversal).
- The MaterialX plan: a rewire's compile and each edit's thumbnails are cancelable jobs; a newer edit cancels an older one.
