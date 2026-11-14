# Refinement and convergence: design plan

**Status (2026-11-13):** design for the owner to confirm. Nothing is built. Section 1 records the owner's answers so far and three recommendations still to confirm.

**Goal:** one model for "the image is still improving", in place of today's ad-hoc tick reasons, idle flags, `whenReady` and the tests' "N quiet frames" loops.

- A view's image converges over ticks.
- **Refinement sources** each report what they still have to do, as counts and an estimate, and whether they block convergence.
- `view.refinement` is a snapshot of them. `view.converged(options)` resolves when they're done.
- The on-demand loop ticks for changes, requests, and sources that need ticks.

**Sources:**

- `CESIUM2_WEBGPU_PLAN.md` §13.41: the renderer decisions' item 7 (progressive views as a case of refinement) and "Architecture decisions from the 2026-11-13 discussion" (threading, jobs that yield partial results, loading is refinement, inspector rules).
- `docs/superpowers/plans/2026-11-12-transform-graph.md`: "feedback must converge, not be damped" (occlusion), geomorph, the ×10 measurements.
- `docs/superpowers/plans/2026-11-13-lod-transitions.md` (branch `claude/frosty-fermi-ccee6c`): coarsening transitions and the leaving set, which are transitions too.
- Code: `src/scene/Engine.ts` (`TICK_REASONS`, `needsTicks`, `loop`, `tick`), `src/scene/engineReady.ts`, `src/streaming/Tileset3D.ts` (`idle`, `active`, `needsFrames`, `morphing`), `src/globe/GlobeImagery.ts` (`busy`, `fading`), `src/scene/HeightClamping.ts`, `src/scene/occlusionFeedback.ts`, `widgets/inspector.ts`, `widgets/engine.ts`, `widgets/recorder.ts`.

## 1. Decisions

### The owner's answers (2026-11-13)

| # | Question | Answer |
| --- | --- | --- |
| 1 | Does `converged()` replace `stats.idle`, `whenReady` and the ad-hoc settles, or sit beside them? | **Replace all three.** `whenReady` becomes `converged({ until: "correct" })`. The tests' and benchmarks' settle loops become `converged()`. |
| 2 | Where does the loop's own state (asleep or ticking) live? | **A diagnostic stat:** `stats.loop: "asleep" \| "ticking" \| "continuous"` in the per-frame snapshot, documented as cost only, never as "done". The inspector flags "converged but still ticking" as a busy loop, and the power tests assert it. |
| 3 | Levels? | **Yes:** `converged({ until: "drawn" \| "correct" \| "converged" })`, default `"converged"`. |
| 4 | Deadlines for screenshots and print? | **`within` and `freeze`:** per-kind deadlines, and an option to hold the view's selection from the deadline until the promise settles, so fades and fits finish on what has loaded. |
| 5 | Can code outside the engine add sources? | **Apps and jobs:** `engine.refinement.hold(...)` returns a handle. Each call is a command, so it works in worker mode. The job system gives yielding jobs the same handle. |

**Why "asleep" isn't a readiness signal (the owner asked how hard it is to know, and whether apps need it):**

- **It's free.** The engine already has it: one boolean, whether the loop has a frame scheduled.
- **Apps rarely need it.** They can't act on it, and what they'd use it for (screenshots, hiding a card) is really "converged".
- **The inspector and tests do need it.** "Asleep" and "converged" are independent:

| Loop | Image | Meaning |
| --- | --- | --- |
| asleep | converged | The healthy end state. |
| asleep | refining | Normal: waiting on the network or a worker, whose completion wakes the loop. |
| ticking | refining | Normal: uploads, transitions, fits, feedback. |
| ticking | converged | A busy loop. The bug class seen twice already: the exposure meter alternating between two readings 0.01% apart (`test/onDemandIdle.test.ts`), and occlusion verdicts flipping at ×10 (the transform-graph plan). The inspector flags it. |

### Recommended, to confirm

These were asked and not yet answered. The design below assumes the recommendation.

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| A | What does `converged({ timeoutMs })` do on timeout? | **Resolve with status:** `{ converged: false, pending, cut, changing }`. It rejects only on abort or a removed view. Tests assert `result.converged`. It reads the same in worker mode. Babylon and Playwright both lean this way (section 2). | Reject with an error carrying the snapshot. |
| B | Do sources cover everything that ticks the loop? | **Two groups.** Sources replace `tiles`, `loading` and `morph`, and add compiles, fits, occlusion, exposure, accumulation and jobs. Changes (camera, world, animation…) and requests (picks, queries) stay a smaller, separate set. Camera motion restarts refinement but isn't a source. | Everything is a source, with "motion" excluded from `converged` by default. |
| C | Which sources block `converged()` by default? | **Those whose finishing can change the image:** visible streaming, stand-ins, fits, clamping, transitions, the occlusion fixed point, exposure adaptation. Not prefetch, open-ended accumulation, live data, or jobs that only change cost (the horizon occluder's walk). Section 4 makes this a field, `effect`. | All block; or only streaming and compiles. |

## 2. Prior art

Read on 2026-11-13. Many doc pages carry no date: they're marked "undated". Where a page couldn't be read, the row says so.

| System | What it offers | Pitfalls and notes | Source, date |
| --- | --- | --- | --- |
| Unreal Movie Render Queue | **Engine warm-up** frames (no samples; for GPU particles, virtual texturing) and **render warm-up** frames (rendered and discarded, to build TAA history), per shot. Spatial and temporal samples accumulate per output frame. | No documented "wait for streaming" call: the mechanism is warm-up frames plus game overrides that flush streaming. UE 5.1 users saw shaders recompile on every warm-up frame from one broken material (forum, Nov 2022 to May 2023). | `UMoviePipelineAntiAliasingSetting`, UE 4.26 and 4.27 API reference (2020, 2021). Primary 5.x pages didn't render for the fetcher. |
| Unreal Movie Render Graph | One warm-up count (`MovieGraphWarmUpSettingNode.num_warm_up_frames`), per shot and per render layer. A prestreaming node exists (`CinePrestreamingGraphNode`, not read). | Warm-up counts are guesses users tune (16 to 200 frames, anecdotal). | dev.epicgames.com, "Transitioning to the Movie Render Graph", undated. |
| Cesium for Unreal under MRQ | The plugin waits for tiles during renders. | Users still got half-loaded frames on UE 5.1. The cause was the tile selection using another camera or aspect ratio. No programmatic "fully loaded" signal. | community.cesium.com thread 24954, undated (2023). |
| OSPRay | `ospRenderFrame` returns an `OSPFuture`: `ospIsReady`, `ospWait`, `ospGetProgress` (0..1, approximate), `ospCancel`. Accumulation stops at the framebuffer's `targetFrames`; `ospResetAccumulation`. `varianceThreshold` stops converged regions. | "Done" is per frame (the future). Convergence across frames is the caller's loop. Variance is an estimate, updated only after a frame finishes. | ospray.org/documentation.html, undated. |
| Arnold | Render status: `AI_RENDER_STATUS_RENDERING`, `FINISHED` (until `AiRenderEnd()`), `PAUSED`. An update callback, or poll `AiRenderGetStatus()`. Progressive passes at rising AA samples. | "Finished" is a state the caller acknowledges. Reported: status reads "rendering" inside the imager after a cancel. | Arnold API reference `group__ai__render` (search snippets only; the page didn't load), undated. |
| Blender Cycles | Viewport max samples (0 = forever), noise threshold (adaptive), time limit. Handlers `render_pre`, `render_post`, `render_complete`, `render_cancel`. | The handlers are for render jobs, not the viewport. The viewport's sample counter is UI only: no event when it finishes. | Blender manual 4.5, "Sampling"; `bpy.app.handlers` (current). |
| Omniverse RTX path tracing | `/rtx/pathtracing/totalSpp` caps samples (default 512, 0 = unlimited). At the cap, rendering stops until something changes. Adaptive sampling with a target error. | No "converged" event: stopping at the cap is the signal. Movie Capture doesn't end a frame early at the adaptive target. Whether a time change resets accumulation is a setting. | docs.omniverse.nvidia.com, "RTX Interactive (Path Tracing)", undated. |
| three-gpu-pathtracer | `samples` getter; `reset()`; every camera, material, light or environment update resets. `minSamples` before the traced image shows, a fade-in, and a raster fallback while not ready. | No convergence event or sample cap: the caller compares `samples` with a target. Sampling waits while shaders compile. | `src/core/WebGLPathTracer.js`, GitHub main, undated. |
| CesiumJS 1.x tilesets | `Cesium3DTileset.loadProgress(pendingRequests, tilesProcessing)`, `allTilesLoaded`, `initialTilesLoaded` (once), `tileFailed`, and the `tilesLoaded` property. | `allTilesLoaded` fires every time loading settles (after each camera move), per tileset only. It's edge-triggered on a change in counts. | Cesium3DTileset reference and source, current. The events predate 1.52 (2018); voxels gained the same events in 1.125 (2025-01-02, per CHANGES.md; one search result says 1.126). |
| CesiumJS 1.x globe | `Globe.tileLoadProgressEvent` (the load queue's length), `globe.tilesLoaded`. | The queues are rebuilt each frame, so the count is "wanted this frame", not "in flight", and `tilesLoaded` can be true before the frame draws. Forum (Dec 2018): `tilesLoaded` and `dataSourceDisplay.ready` were both true while rendering continued. No single flag covers a scene. | Globe reference and source, current; community.cesium.com thread 7789 (2018-12). |
| CesiumJS 1.x scene | `requestRenderMode`, `maximumRenderTimeChange`, `requestRender()` hooked to request and task completion events. | Continuous rendering bugs in request-render mode, fixed in 1.116 (2024-04-01) and 1.134 (2025-10-01): a "loaded" listener only runs if something asks for a frame. | CHANGES.md. |
| three.js | No scene-level "ready". `LoadingManager.onLoad` fires each time loaded equals total, so early and repeatedly. `WebGLRenderer.compileAsync(scene, camera)` uses `KHR_parallel_shader_compile`. `WebGPURenderer.init()` is a cached promise. | No latch on `onLoad`. | `compileAsync`: PR #19752, merged 2023-10-14, r158. `LoadingManager.js`, dev branch, undated. |
| Babylon.js | `scene.isReady()` (textures loaded, shaders compiled, render targets, registered checks), `executeWhenReady`, `whenReadyAsync`, `onReadyObservable`. | It polls every 100 ms. A built-in timeout (2 minutes) clears the callbacks. Delay-loaded resources aren't covered. | `scene.pure.ts`, master, undated. |
| Google Maps JS | `tilesloaded` (visible tiles loaded), `idle` (after a pan or zoom). | `idle` is defined loosely. | Maps JavaScript API reference, undated. |
| Mapbox GL JS, MapLibre | `idle`: after the last frame rendered before the map is idle, with no camera transition, every requested tile loaded and every fade finished. Also `loaded()`, `areTilesLoaded()`, `render`. | Any animation, or `repaint = true`, prevents `idle`. It re-fires on each settle. Commonly used before screenshots in tests. | docs.mapbox.com Map reference, undated; MapLibre `src/ui/map.ts`, main. |
| OpenLayers | `rendercomplete`: every source and tile for the current viewport has loaded and rendered. | One event, no detail of what's left. | `ol/Map` reference, undated. |
| Unity HDRP | Multiframe recording: `BeginRecording(samples, shutter…)`, `PrepareNewSubFrame()`, `EndRecording()`. | The caller drives the loop. It changes `Time.timeScale`, so apps that change it themselves can't use it. | HDRP 17.3 manual, "Multiframe rendering and accumulation", undated. |
| Playwright | `waitForLoadState("networkidle")`. | Marked discouraged for tests: assert positive, application-level readiness instead. | playwright.dev Page reference, current. |

**Lessons taken:**

1. **Level-triggered, not edge-triggered.** Cesium's `allTilesLoaded` and three's `onLoad` fire early and repeatedly. `converged()` evaluates a condition over the sources' current state at the end of a tick, and latches only inside the promise.
2. **Done must mean "drawn".** Cesium's `tilesLoaded` reads a queue and can be true before the frame shows it. `converged()` resolves only after a frame that shows the converged state has rendered (section 5).
3. **Counts where exact, estimates where not, and say which.** Pending counts are exact. A tile tree's total isn't known ahead. A path tracer's samples against a target are exact; variance is an estimate.
4. **Each source owns its done condition,** including a cap (OSPRay's `targetFrames`, Omniverse's `totalSpp`) and hysteresis for feedback.
5. **Warm-up is a count, not a guess.** MRQ's warm-up frames become an accumulation source with a known total: TAA history needs N frames, so it reports N.
6. **Camera motion re-arms.** Every library resets on a camera move. Here a change starts a new epoch for the view; counters restart.
7. **Always a timeout and a report.** Babylon times out; Cesium for Unreal users got silent half-loaded frames. The result says what was left.
8. **Animation never converges unless paused.** Mapbox's `idle` never fires under `repaint = true`. Say so, and report what kept changing.
9. **Shader compiles are a source** with a count and a failure mode (UE 5.1's recompile loop; three's `compileAsync`; Babylon's `isReady`).
10. **Make waiting observable.** A timed-out wait should say which source stalled, without guessing.

## 3. What exists today

- **`TICK_REASONS`** (`src/scene/Engine.ts`), twelve bits in `FrameStats.tickReasons`: `camera`, `global`, `requested`, `uniforms`, `tiles`, `world`, `pick`, `wake`, `animation`, `continuous`, `loading`, `morph`. The recorder logs them per tick. The inspector doesn't show them.
- **Two ways the loop stays awake:**
  - **Polling:** `needsTicks()` after each tick: a wake during the tick, a requested render, pending picks, `Tileset3D.needsFrames`, `HeightClamping.busy`, `Tileset3D.morphing`. Tick listeners and the camera layer return "busy" (recorded as `animation`), and so do the warp fits.
  - **Events:** `Engine.wake()` for asynchronous completions: loads ending, uploads, compiles, samples. Loads in flight alone don't keep the loop ticking.
  - This split matters for the design: a source either needs ticks (it does work per tick) or waits for an event (its completion wakes the loop). Section 4 keeps it as a field.
- **Readiness notions:**
  - `stats.idle`: the last tick rendered nothing, or the loop sleeps.
  - `Tileset3D.idle` (nothing a view needs is loading or waiting to upload; off-screen shadow casters excluded), `active`, `needsFrames`, `morphing`, and a private `settling` that includes "changed in the last 3 frames" and the memory-adjusted SSE moving.
  - `GlobeImagery.busy` and `fading`.
  - `Engine.whenReady(view, { draws, signal, timeoutMs })` (provisional): a frame rendered since the call, and no draw uses a stand-in (the default material while a custom shader compiles, white while its textures load, an undiced patch). It polls with `requestRender` after each tick. It doesn't wait for streaming.
  - `Clamp.settled` and `Clamp.whenSettled()` per clamped object; `World.warpStats()` (`pending`, `draws.pending`, `draws.exact`).
- **The inspector's chip** (`widgets/engine.ts`): "paused" if selection is frozen, "settled" if every tileset is `idle`, else "loading · N in flight". "Load: settled in X" and the time to re-settle after a move come from it.
- **The examples' loading cards** (`examples/transform-graph/loading.ts`, `examples/vertical-exaggeration/loading.ts`, also on `dev/analytic-warps`) poll `stats.loaded`, `stats.selected` and `warpStats()` every 250 ms, finish after 2 quiet polls, and give up after 90 s.

## 4. The source model

### What a source reports

Each source writes one entry per tick into a pooled snapshot (no allocation per tick). An entry is plain data, so it crosses to the main thread unchanged in worker mode.

```ts
/** Fixed order: the inspector's rows and the recorder's columns follow it. */
type RefinementKind =
  | "streaming" // tiles, terrain, imagery and assets the view wants: in flight, queued, decoding, awaiting upload
  | "compiles" // pipelines compiling while a stand-in draws
  | "tessellation" // patch draws not yet diced; vectors and splats being built
  | "fits" // warp fits pending
  | "clamping" // heights not yet applied to clamped content
  | "transitions" // geomorph in and out, imagery fades, 3D Tiles dithers, view transitions (exposure, colour)
  | "occlusion" // occlusion feedback reaching its fixed point
  | "adaptation" // exposure adapting to the metered image
  | "accumulation" // TAA history, still-frame supersampling, a path tracer's samples
  | "jobs" // yielding jobs that don't name another kind
  | "app"; // holds from the application

type RefinementEffect =
  | "standIn" // while pending, something is drawn wrong: a placeholder material, a white texture, an undiced patch, a draw held hidden
  | "coarse" // while pending, the image is right but less refined
  | "cost"; // finishing changes only cost, not the image (prefetch, a tighter occluder)

interface RefinementEntry {
  readonly kind: RefinementKind;
  /** What it is, for people: "OSM Buildings", "custom shader 'roofs'", "parcels". */
  readonly label: string;
  readonly effect: RefinementEffect;
  /** Blocks `converged()` by default: effect isn't "cost" and it isn't open-ended. */
  readonly blocks: boolean;
  /** Never finishes by itself: live data, accumulation without a target. */
  readonly openEnded: boolean;
  readonly unit: "tiles" | "items" | "pipelines" | "draws" | "fits" | "samples" | "frames";
  /** Items left that are known now. Exact. */
  readonly pending: number;
  /** Items finished since this view's epoch began. Exact. */
  readonly done: number;
  /** Items that failed this epoch: they no longer count as pending. */
  readonly failed: number;
  /** A known target (accumulation samples, warm-up frames), else undefined. */
  readonly total: number | undefined;
  /**
   * 0..1, how far along. Exact when `total` is known; otherwise a heuristic
   * (a tile tree's total isn't known ahead), never decreasing within an epoch.
   * Undefined: indeterminate.
   */
  readonly estimate: number | undefined;
  readonly estimateExact: boolean;
  /** "ticks": does work every tick (the loop keeps ticking). "events": waits for a completion that wakes the loop. */
  readonly wants: "ticks" | "events";
  /** ms since `pending` or `done` last changed: the inspector flags long stalls. */
  readonly stalledMs: number;
  /** Diagnostic sub-counts, fixed keys per kind: inFlight, queued, decoding, awaitingUpload, prefetch… */
  readonly detail: Readonly<Record<string, number>>;
}
```

**Defaults for `blocks`:** a source blocks unless its effect is "cost" or it is open-ended (decision C). One kind can have entries of both: streaming reports the tiles a view draws ("coarse", blocking) apart from its prefetch guard band ("cost", not blocking).

**Today's signals as sources:**

| Kind | From | Effect | Wants | Done when |
| --- | --- | --- | --- | --- |
| streaming | `Tileset3D` (`state.inFlight`, `wanted`, `ready`, `externals`, the memory-adjusted SSE), `GlobeImagery.busy`, `loadGltf` | coarse; prefetch is cost | events while only loads are in flight, else ticks (today's `needsFrames`) | nothing the view draws is wanted at the target SSE, and the selection hasn't changed for 3 ticks (today's rule, moved inside) |
| compiles | custom-shader pipelines (`World.ready`) | standIn | events | no draw uses the default material |
| tessellation | patch draws (`World.addBrep`), vectors and splats ("settle each when it's built") | standIn | ticks | every draw diced and drawn once |
| streaming (textures) | custom-shader textures (`World.ready`) | standIn | events | no draw uses the white texture |
| fits | `world.warps`, curved clips (`warpTick` returns busy, recorded as `animation` today) | standIn while held hidden, coarse while drawn at the last fit | ticks | no fit pending |
| clamping | `HeightClamping.busy` | coarse | ticks while re-clamps wait, events while a cast runs | every clamp settled |
| transitions | `Tileset3D.morphing`, `GlobeImagery.fading`, the leaving set (the LOD-transitions plan), `View.transitionSeconds` transitions | coarse | ticks | none running (each lasts at least 8 frames, 0.3–1 s) |
| occlusion | `occlusionFeedback.ts` verdicts | coarse | ticks | no verdict that would change the selection changed in the last `RESULT_MAX_AGE` results |
| adaptation | the exposure meter (`adaptExposure`) | coarse | ticks | the reading is within the settled band |
| accumulation | none yet | coarse | ticks | `total` samples or frames reached; open-ended without a target |
| jobs | the job system's yielding jobs | per job (the horizon occluder's walk: cost) | events | the job finishes |
| app | `engine.refinement.hold()` | per hold (default coarse) | events | released |

### How sources register

- **Engine-internal sources** implement one internal interface, polled once per tick after the render:

  ```ts
  /** @internal */
  interface RefinementSource {
    /** Writes this tick's entries for the views in `views` (a bit mask). */
    report(out: RefinementWriter, views: number): void;
  }
  ```

  Tilesets, imagery, clamping, warps, the world's stand-ins, the exposure meter and occlusion feedback register when they're created and unregister when they're destroyed.

- **Holds** are for code outside the engine: apps, and the job system's yielding jobs.

  ```ts
  const parcels = engine.refinement.hold({
    kind: "app", // default
    label: "Parcels",
    unit: "items",
    total: 120,
    effect: "coarse", // default
    views: [view], // default: every view
  });
  parcels.progress(40); // done so far; a command
  parcels.release(); // a command
  ```

  A hold waits for events: each `progress` and `release` wakes the loop. A hold that sees no progress shows its `stalledMs` in the inspector like any source.

- **Jobs** get a hold from the scheduler when they're declared with `refinement: { kind, label, effect }`. Each partial result calls `progress`. A cancellation because inputs changed restarts its counts with the view's epoch and isn't a failure. The job-system session gets this interface in the shared notes (`refinement-job-handle.md`).

### Per view or per engine

**Per view, collected by the engine.** Convergence is a property of a view's image.

- Sources register once on the engine and say which views each entry concerns (a view mask). Streaming already has per-view selections and view masks, so its counts are per view. Where a source can't split by view, its entry concerns every view that shows it, which is conservative.
- `view.refinement` holds the entries that concern the view. `engine.refinement` holds them all, with their view masks, for the inspector and for `engine.converged()`.

## 5. The API

### Reading: `view.refinement`

```ts
interface Refinement {
  /** The tick this snapshot was taken at (one tick old in worker mode). */
  readonly tick: number;
  /** Increments when the view's target changes: camera, viewport, content, options. */
  readonly epoch: number;
  readonly epochStartedMs: number;
  /** The highest level this state has reached. */
  readonly level: "none" | "drawn" | "correct" | "converged";
  /** Only open-ended sources remain (live data, unlimited accumulation). */
  readonly open: boolean;
  /** Active entries in kind order. Empty when converged and nothing open runs. */
  readonly entries: readonly RefinementEntry[];
}
```

- It's a snapshot read, the same in both threading modes. In main-thread mode it is the last tick's; in worker mode, the last tick the main thread has heard about.
- **Levels:**
  - `drawn`: a frame has rendered with at least one draw for the view. This ends a blocking card.
  - `correct`: no blocking "standIn" entry. Coarse is fine. This is today's `whenReady`.
  - `converged`: no blocking entry at all.

### Subscribing: `view.onRefinement`

```ts
const off = view.onRefinement((r: Refinement) => indicator.update(r));
```

- Called at most once per tick, and only when something a reader would show changed: the level, the set of kinds, or a count.
- It runs on the main thread in both modes. In worker mode it's driven by the per-frame snapshot message.
- `engine.onRefinement` does the same for every view.

### Waiting: `view.converged(options)`

```ts
interface ConvergedOptions {
  /** Default "converged". */
  until?: "drawn" | "correct" | "converged";
  /** Only these kinds block (overrides each entry's `blocks`). */
  include?: readonly RefinementKind[];
  /** These kinds don't block. */
  exclude?: readonly RefinementKind[];
  /** Only the stand-ins of these draws block (today's `whenReady({ draws })`). */
  draws?: readonly DrawHandle[];
  /** Per-kind deadlines, ms from the call: after one passes, that kind stops blocking. */
  within?: Partial<Record<RefinementKind, number>>;
  /** From the first `within` deadline until the promise settles, hold the view's selection. */
  freeze?: boolean;
  /** Overall limit, ms. Default none. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface ConvergedResult {
  /** False: the timeout came first. */
  readonly converged: boolean;
  readonly level: "none" | "drawn" | "correct" | "converged";
  readonly tick: number;
  readonly frame: number;
  readonly elapsedMs: number;
  /** Entries still active when it resolved (after a timeout or `within` cut). */
  readonly pending: readonly RefinementEntry[];
  /** Kinds whose `within` deadline passed. */
  readonly cut: readonly RefinementKind[];
  /** Change reasons active in the last ticks (camera, animation…): why it didn't settle. */
  readonly changing: readonly ChangeReason[];
  /** Failures this epoch (tiles, pipelines): it converged around them. */
  readonly failed: number;
  readonly frozen: boolean;
}
```

- `engine.converged(options)` waits for every enabled view.
- **When it resolves:** at the end of a tick, if:
  1. the level holds for the view, with the options' filters applied, and
  2. a frame for the view has rendered since the last change that affected it (or since the call, if it was already converged), and
  3. that frame's GPU work has finished (`queue.onSubmittedWorkDone()`), so a readback right after sees it.
- It's level-triggered and latched by the promise (lesson 1). There is no "N quiet frames" rule: each source owns its done condition. The tileset's "changed in the last 3 ticks" rule moves inside the streaming source.
- **It works with a manual loop.** Parity pages drive frames with `engine.renderFrame()`. Waiters are evaluated at the end of `renderFrame` too.
- **Timeout:** resolves with `converged: false` (decision A, to confirm). Abort rejects with the signal's reason. A removed view rejects.
- **`freeze`** holds the view's selection: no new refinement or coarsening. Loads in flight still finish, and fades and fits run to the end on what is drawn. The hold is released when the promise settles. It's today's `Tileset3D.freezeSelection`, made per view and per wait.

### Worker mode

The threading decision's rules hold:

- **Snapshots:** entries are plain data. The worker posts the refinement summary with each frame's snapshot, and only the parts that changed.
- **Promises:** `converged()` is a query. The main thread sends a command with an id and the options. The worker evaluates it at the end of its ticks, since only the engine knows when a frame showing the converged state has rendered. It posts the result back. Abort is a command. Timeouts run on the engine's side.
- **Holds** are commands: `hold`, `progress` and `release` are ordered messages that need no reply.
- No synchronous read here is missing in worker mode. `view.refinement` is one frame staler there, and the docs say so. The API tests run in both modes.

## 6. The loop: replacing `TICK_REASONS`

**The rule:** the loop asks for the next frame when there's a change, a pending request, or an entry that wants ticks (blocking or not). Entries that wait for events don't keep it ticking: their completion wakes it.

**`wake` carries a reason.** `Engine.wake(kind)` and `ctx.wake(kind)` name what woke the loop: a load ended (streaming), a compile finished (compiles), a sample arrived (clamping), a hold progressed (app). An unattributed `wake()` is recorded as `wake`, and that count should fall to zero as callers are named.

**`FrameStats.tickReasons` and `TICK_REASONS` are replaced** by:

```ts
interface TickWhy {
  /** Bits of CHANGE_REASONS: what changed. */
  changes: number;
  /** Bits of the refinement kinds: which sources were active. */
  refining: number;
}
const CHANGE_REASONS = ["camera", "global", "requested", "uniforms", "world", "animation", "continuous", "pick", "query", "wake"] as const;
```

| Today's reason | Becomes |
| --- | --- |
| `camera` | change `camera` (a view's fingerprint: camera, viewport, exposure, lighting…) |
| `global` | change `global` |
| `requested` | change `requested` |
| `uniforms` | change `uniforms` |
| `tiles` | refining `streaming` |
| `world` | change `world` |
| `pick` | change `pick` (a request) |
| `wake` | the woken source's kind, or change `wake` if unattributed |
| `animation` | change `animation` (tick listeners, the camera layer); warp fits move to refining `fits` |
| `continuous` | change `continuous` |
| `loading` | refining `streaming` (`needsFrames`), `clamping` (`HeightClamping.busy`); height queries become change `query` |
| `morph` | refining `transitions` |
| — | new: refining `compiles` (replaces `whenReady`'s polling with `requestRender`), `tessellation`, `occlusion`, `adaptation`, `accumulation`, `jobs`, `app` |

**What the inspector shows** (following the inspector rules: values change, the layout doesn't):

- **The header chip:** "Converged", "Refining · 12 tiles, 3 fits", "Animating", "Continuous", or "Streaming frozen". Fixed segments, tabular figures.
- **A refinement table,** one row per kind in the fixed order, always present: pending, done, failed, an estimate bar (hatched when the estimate is a heuristic), wants (ticks or events), stalled. Inactive rows show "—".
- **Time to converge per epoch:** "Converged in 2.4 s" replaces "Load: settled in X". The time to re-settle after a move is the next epoch's.
- **Two flags:** a busy loop ("converged, still ticking" for more than 2 s), and a stalled entry (wants ticks, no progress for more than 2 s). Both are bugs to look at, not states to live with.
- **Series:** pending per kind as a stacked area in the Frame section, sharing the time axis, the crosshair and the per-tick ring buffer.

**What the recorder logs** (`widgets/recorder.ts`, `recorderRows.ts`):

- The `why` column becomes `changes` and `refining` (names joined by "+").
- New columns: `loop` (asleep, ticking, continuous), `level`, `epoch`, and `ref_<kind>` pending counts in kind order.
- The bench suite's consumers of `why` and the CSV readers (`bench/suite/report.mjs`, `diagnose.mjs`) move with it.

## 7. Users

### The examples' indicator

- A shared widget, `widgets/refinementIndicator.ts`, replaces `transform-graph/loading.ts`, `vertical-exaggeration/loading.ts` and the ad-hoc stages.
- **A blocking card until `drawn`,** naming what it waits for from the entries ("Loading terrain…").
- **Then a small fixed-size indicator** fed by `view.onRefinement`: "Refining · 12 tiles, 3 fits", never "Loading tiles". Open-ended sources show as "live", without a count.
- **Hysteresis:** it appears after 300 ms of refining and hides after 300 ms converged, so short pans don't flash it. Its size never changes.
- No 90 s cap is needed, since it doesn't block.
- **Coordination:** `dev/analytic-warps` has the examples moving to a non-blocking indicator. Its stage logic becomes this widget's fallback until milestone R2 lands, then reads `view.refinement`.

### Tests and benchmarks

From an inventory of `bench`, `parity`, `test`, `examples`, `widgets`, `scripts` and `spikes` (sampled by grep, so not exhaustive in `test/`). The 1.x side of every comparison keeps 1.x's own `tilesLoaded` and `model.ready`.

| Where | Waits on today | Becomes |
| --- | --- | --- |
| `bench/suite/suite.ts` `settle()` (6 call sites) | every tileset `idle && inFlight === 0 && !imagery.busy`, 10 frames running; `settleTimeoutSeconds` | `view.converged({ timeoutMs })`. `settleMs` and `resettleMs` become the epoch's converge time, from the recorder. The extra 5 frames before a "check" capture go. |
| `bench/suite/suite.ts` load timeline | `settled()` once per frame, for `load.settledAt` | `level` per tick from the recorder (`drawn`, `correct`, `converged` times) |
| `bench/hitch.ts` | `settled()` held for 500 ms, 20 s cap | `converged({ timeoutMs: 20_000 })` |
| `bench/trace.mjs` | `waitForFunction` on `idle && loaded > 0`, then fixed 1.5 s; fixed 6 s after the move | `page.evaluate(() => view.converged())` before and after the move |
| `bench/shaderCost.ts`, `translucencyCost.ts`, `observerCost.ts` | fixed sleeps (1 s, 500 ms, 3 s…) | `converged({ until: "correct" })`. A warm-up stays only where it's for the JIT, which isn't the engine's state. |
| `bench/baseline.ts` `settle(engine)`, `bench/alloc.ts` | GC plus `onSubmittedWorkDone`; a JIT pause | Unchanged: timing isolation, not refinement. |
| parity `imagery`, `heights`, `selection`, `globe`, `lod` (2.0 side) | `tileset.idle` (and `!imagery.busy`) with the selection's key unchanged, 5 or 8 times running; 120–180 s | `converged({ timeoutMs })`. The selection-key guard goes: streaming's done includes a stable selection. These pages drive frames by hand, which `converged` supports. |
| parity `lod.ts` time to sleep (`?shadows=1`) | `needsFrames \|\| !casterIdle` false | `stats.loop === "asleep"`: a legitimate use of the diagnostic. |
| parity `customShader`, `tracks` | `idle && inFlight === 0` for 10 frames | `converged()` |
| `test/frameLoopSleep.test.ts` (about 25), `onDemandIdle.test.ts` | pump N fake frames, `stats.idle` | `stats.loop === "asleep"` for the power assertions, plus `refinement.level === "converged"` where the test means "done" |
| `test/geomorph.test.ts` | `while (tileset.morphing)`, the `morph` bit | `why.refining` has `transitions`; ends with `level === "converged"` and `loop === "asleep"` |
| `test/casterLoop.test.ts`, `composite.test.ts`, `sceneItems.test.ts` | `tileset.idle`, `needsFrames` | Unit tests of the tileset: keep, or read the tileset's entry |
| 10 loops `i < 100 && tile.state !== "ready"` | a root tile's state | Unchanged: tile-level tests |
| `test/engineReady.test.ts` (about 10) | `whenReady` | Ported to `converged({ until: "correct", draws })` |
| `examples/csg`, `examples/brep-first-look` | `engine.whenReady(view, { draws, signal, timeoutMs })` | `view.converged({ until: "correct", draws, signal, timeoutMs })` |
| `examples/clip-effects` capture loop | `requestRender`, 250 ms sleeps until `surfaceHeight && globe.idle && inFlight === 0 && i > 16` | `converged({ within: { streaming: … }, freeze: true })` |
| `examples/design-globe/siteLoader.ts` | `firstContentAt && idle`, polled every second | `converged()`, then post "ready" |
| `widgets/engine.ts` chip, `widgets/sseProbe.ts` | every tileset `idle`; globe idle for 1 s | `view.refinement.level`; `converged({ timeoutMs })` |
| `scripts/galleryNav.mjs`, `retainers.mjs` | no loading element, then fixed 1.5 s or 2.5 s | `page.evaluate(() => viewer.view.converged({ timeoutMs }))` |
| spikes (`rerooting`, `warpViews`, `curvedClips`, `clipEffectsBench`, `pickDomain`) | `idle && !imagery.busy && loading === 0` 8 times; "fitted" loops; fixed sleeps | `converged()`, migrated when each spike is next touched |
| `Clamp.whenSettled()`, `World.warpStats()`, `Viewer.ready` | per object; diagnostic; the globe built | Unchanged. `whenSettled` is about one object (placing a camera on it), `warpStats` is a diagnostic, and `Viewer.ready` is construction, not refinement. |

### Screenshots and printing

```ts
// Pause the app's clock first if the scene animates.
const result = await view.converged({
  within: { streaming: 10_000 }, // don't wait more than 10 s for tiles
  freeze: true, // then let fades and fits finish on what's there
  timeoutMs: 30_000,
});
if (!result.converged) console.warn("captured while refining", result.pending);
const image = await view.capture(); // later milestone: readback, optional supersampling
```

- **Still-frame supersampling** for print is an accumulation source with `total` samples, started by the capture. It's the warm-up of MRQ, as a count.
- `view.capture({ samples, scale })` is a later milestone. Until then, a page reads the canvas after `converged()` resolves, which waits for the GPU work.

### The handbook

One page, "Loading is refinement":

- the three levels, and what the indicator shows;
- `converged()` for screenshots, tests and benchmarks, with the recipe above;
- why "asleep" isn't "done", with the table from section 1;
- animation, live data and timeouts (section 8);
- holds, for apps that load their own data.

## 8. Edge cases

- **Continuous animation:**
  - `converged` doesn't require "no changes". It requires no blocking entry for the current state, at the end of a rendered tick.
  - Animated models with everything resident converge every tick, so it resolves.
  - A camera flying over new ground keeps streaming busy, so it resolves only at the timeout, with `changing: ["camera"]` and the pending streaming entry.
  - The docs say: pause the clock for a capture. A `pauseClock` option can come later if pages keep needing it.
- **Live data** (streamed feeds, time-dynamic tiles): open-ended and not blocking. The indicator shows "live".
- **Camera motion:** each change starts a new epoch. `done` and `estimate` restart; `pending` is current. The indicator's hysteresis keeps short pans quiet. Coarsening on zoom-out (the leaving set) counts as transitions.
- **Feedback sources** (occlusion, adaptation) are done by hysteresis, not damping, as the transform-graph plan requires. If one hasn't reached its fixed point after a budget (2 s of ticks), it stops blocking, reports one engine error ("occlusion feedback did not converge"), and the inspector flags it. A wait is never silently stuck on an oscillation.
- **Failures:** a failed tile, pipeline or hold stops counting as pending and adds to `failed`. `converged` resolves around it, and the result reports the count.
- **Requests that never answer:** fetches have no timeout yet (§14 follow-up 7). Until they do, `stalledMs` shows them and `timeoutMs` ends the wait.
- **Memory pressure:** `Budgeted`'s memory-adjusted SSE counts as streaming until it stops moving. If the cache can't hold the view at the target SSE, the view converges at the adjusted SSE, and `detail.sseLimited` says so.
- **Yielding jobs:** a job cancelled because its inputs changed restarts with the epoch. A partial result counts as progress. A job with effect "cost" never blocks.
- **A disabled view** isn't drawn, so it never reaches `drawn`. `converged` on it waits for the timeout; the docs say so.
- **A hidden page:** `requestAnimationFrame` stops, so nothing progresses. Timeouts are wall-clock, so the wait still ends, with `converged: false`.
- **Several views sharing a tileset:** counts are per view (section 4). A view converges when its own tiles are done, even if another view's aren't.

## 9. Milestones

Sized for one agent each. Per the cost rules: Sonnet by default, Opus for R3 and R5 (design and risk). Each runs typecheck, eslint and prettier on its files, its own tests on the fake device (`test/fakeGpu.ts`), and at most one headless check. The full suite runs once at the end of R5 and again at the end of R9.

| # | Milestone | Files | Done when |
| --- | --- | --- | --- |
| R1 | **Source registry and snapshot, no behaviour change.** Types, the writer, the pooled snapshot; adapters for tilesets (streaming, transitions), imagery, clamping, warp fits, the world's stand-ins (compiles, textures, tessellation), exposure adaptation and occlusion feedback. | new `src/scene/refinement.ts`; `Tileset3D.ts`, `GlobeImagery.ts`, `HeightClamping.ts`, `world/warps.ts`, `World.ts`, `occlusionFeedback.ts`, the exposure code in `Engine.ts` | A test-only check holds on the fake-device scenarios (`onDemandIdle`, `geomorph`, `casterLoop`, `frameLoopSleep`): `needsTicks()` agrees with "a change, a request, or an entry that wants ticks". Per-view streaming counts are tested with two views. |
| R2 | **Public reads.** `view.refinement`, `engine.refinement`, `onRefinement`, `stats.loop`. | `View.ts`, `Engine.ts`, `index.ts`, `api/` | The API reference test passes; the levels are tested on a fake scene (drawn, then correct after a compile, then converged after streaming). |
| R3 | **`converged()`.** Levels, include and exclude, `draws`, `within`, `timeoutMs`, `signal`, the GPU-done step, evaluation in `renderFrame`. `whenReady` removed, its tests ported. | new `src/scene/converged.ts`; `engineReady.ts` removed; `test/engineReady.test.ts` → `converged.test.ts` | Tests: resolves only after a frame showing the state; already converged resolves on the next tick; timeout reports `pending` and `changing`; abort rejects; `within` cuts; failures counted. |
| R4 | **`freeze`.** A per-view selection hold for the length of a wait. | `Tileset3D.ts` (`freezeSelection` per view), `converged.ts` | A test: after the deadline nothing new is selected, transitions finish, the hold is released when the promise settles. |
| R5 | **The loop switch.** `needsTicks` from the registry; `wake(kind)` through the callers; `FrameStats.why` in place of `tickReasons` and `TICK_REASONS`; warp fits recorded as `fits`. | `Engine.ts`, the `wake` callers (`engineContent.ts`, `ShaderBindings.ts`, `world/caps.ts`, `HeightClamping.ts`, `routes.ts`, `bundles.ts`, `DrawSink.ts`…), `widgets/recorder.ts`, `recorderRows.ts`, `bench/suite` readers | R1's check is removed because it's now true by construction. The power tests pass unchanged on `stats.loop`. Unattributed wakes are zero in the fake-device scenarios. |
| R6 | **Inspector.** The chip, the fixed-slot refinement table, converge times per epoch, the busy-loop and stall flags, the pending series. | `widgets/inspector.ts`, `widgets/engine.ts`, `widgets/inspectable.ts` | The DOM-skeleton test holds (layout fixed across states). The owner reviews it by clicking around, per the UI quality bar. |
| R7 | **Holds.** `engine.refinement.hold()` and its handle, as commands. The job system's handle once that lands. | `refinement.ts`, `Engine.ts` | Tests: a hold blocks, shows progress, wakes the loop, and its release resolves a waiter. |
| R8 | **The examples' indicator.** `widgets/refinementIndicator.ts`; the transform-graph and vertical-exaggeration scenes move to it. | `widgets/`, `examples/transform-graph`, `examples/vertical-exaggeration` | The indicator never changes size; the hysteresis is tested; coordinated with `dev/analytic-warps`. |
| R9 | **Migrate the waits** in section 7's table, one area per commit: bench, parity, scripts, examples, widgets, then spikes as they're touched. | as listed | Each page's settle code is gone; bench results record the new `settleMs` meaning in their schema (`bench/suite/schema.ts`). |
| R10 | **Handbook page.** | `handbook/` | Reviewed by the owner. |

**Later:** accumulation (TAA warm-up, still-frame supersampling), `view.capture()`, a progressive path-tracer view (an accumulation source with a target or open-ended), and `pauseClock` if captures need it.

## 10. Risks and open items

- **Decisions A, B and C** (section 1) are recommendations until the owner confirms them.
- **Per-view streaming counts** need the per-view wanted lists. Where a selection policy doesn't keep them, the entry concerns every view showing the tileset. That's conservative but may delay one view's convergence.
- **Honest sources are the whole design.** A source that says "done" early gives early screenshots; one that never says "done" gives timeouts. R1's agreement check, the stall flag and the busy-loop flag exist to catch both.
- **The GPU-done step** adds about a frame of latency to `converged()`. That's fine for screenshots and tests; the indicator doesn't use it.
- **The job system isn't designed yet.** The hold interface is offered to it in the shared notes, not imposed.
- **Fetch timeouts** (§14 follow-up 7) are needed before "a request that never answers" stops being a stall.
