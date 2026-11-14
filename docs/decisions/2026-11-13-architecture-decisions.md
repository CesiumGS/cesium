# Architecture decisions from the 2026-11-13 discussion (owner)

**What this holds:** The owner's architecture decisions from the 2026-11-13 discussion: threading, jobs, the core IR, warps, loading as refinement, inspector rules. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Threading: one API, the engine on either thread.**

- The app always calls the same API on the main thread. A thin layer underneath either runs the engine there, synchronously, or forwards to an engine thread (`OffscreenCanvas` in a worker). Threading is an implementation detail behind the API (this section's principle: room to change what's underneath).
- **The API's rules hold in both modes:**
  - commands are ordered messages batched per frame, never needing a reply;
  - reads come from a per-frame snapshot (camera, stats, overlay screen positions);
  - queries (pick, heights, rays) return promises;
  - app code that must run inside the engine (warps written as JS, styles, per-frame callbacks) registers as worklet-style modules loaded on the engine's thread;
  - the engine publishes per-frame screen positions for HTML overlays.
- **The main-thread mode offers no synchronous read the worker mode can't.** The API tests run in both modes to enforce it.
- **Mode is detected by a probe, not by browser sniffing.** The engine starts its module worker. A worker that can't start (CSP `worker-src`, no module workers) means main-thread mode. Inside the worker, `navigator.gpu`, `requestAdapter()` and a throwaway `OffscreenCanvas` `"webgpu"` context must all succeed before the real canvas is transferred, since `transferControlToOffscreen()` can't be undone. The result is cached per user agent. The host can force it (`thread: "auto" | "main" | "worker"`, default auto), and the inspector shows the mode and why. The same probe serves a WebGL 2 renderer (`"webgl2"`).

**Jobs.**

- `WorkerPool` stays as the transport, and Comlink is evaluated for the query round trips; the per-frame command stream uses our own batched protocol.
- The scheduler is ours: priority by visible screen-space error (shared with requests), dependencies, cancellation when a tile is deselected, and one main-thread apply phase with a millisecond budget shown in the inspector.
- **Shared memory is detected, never required:** with `crossOriginIsolated`, a `SharedArrayBuffer` and `Atomics` path; without it, transferables, behind the same API. `queue.writeBuffer` takes shared views, so decode workers can fill a shared ring the device thread uploads without a copy.
- **Jobs may yield sound partial results** the engine uses at once, cancellable when their inputs change. Examples: the horizon occluder's walk, imagery compositing, and later a progressive renderer's accumulation. Such jobs report as refinement sources (renderer decision 7).
- No new dependency without the owner's OK. The job-system session writes the design section with prior art, build against adopt, and the engine-in-a-worker spike's measurements.

**The core IR.**

- Two layers. The **core IR** (the middle end): typed pure functions with rates, where the passes run (float64 CPU evaluation, forward-mode autodiff, interval and Taylor bounds, rate analysis, literals to uniforms, linking). The **shader IR**: whole modules (naga's level) for validation and translation to WGSL and GLSL ES.
- Front ends lower into the core IR: 1.x and 3D Tiles styles, restricted JS/TS transforms, MaterialX, and WGSL or GLSL functions through naga (Slang offline through its WGSL). Back ends: WGSL, GLSL ES 300 and a JS evaluator.
- **MaterialX stays at the edge,** as an input language and the live-editing example's format, not in the engine core.
- **No WGSL escape hatch yet:** see how far the API gets without one. If one is needed, it should be "a function in WGSL, lowered through naga", not raw shader text.
- **Our own core IR isn't decided.** Working name: CesiumIR. The core IR spike compares a minimal jaxpr-like IR with ops borrowed one-to-one from a standard vocabulary (ONNX or `KHR_interactivity`), ONNX's graph format with our passes, and naga's IR with passes in Rust. Its inputs are a style, the twist transform with its Jacobian, a live-edited MaterialX graph, a WGSL function, and a plan-and-profile alignment.
- **Requirements from real warps:** typed constant tables, bounded loops or a search primitive, and piecewise selection, with autodiff and interval evaluation through them.

**Warps: exact when compilable, fitted only as a fallback.**

- A user warp whose `forward` is written in the restricted subset (or given as `source`) is compiled to exact GPU code, with its Jacobian from autodiff. A warp given as an opaque closure is fitted. Its hand-written Jacobian (`forward(p, out, jacobian)`) tightens the fit's bounds and helps the CPU (picks, the Newton inverse, selection's stretch), but it doesn't remove the fit.
- **Built-in smooth nodes are already exact** (audit, 2026-11-13): `corridorUnroll`, `bend`, `twist`, `taper`, `bump`, `lattice`, `radialDistortion`, `scaleAbout`, `scaleAlongAxes`, `velocityModel`, the height-scale and height-offset edges, `flatten`, transverse Mercator, Lambert conformal conic, Web Mercator and geocentric/geographic all compile; only `blendWarps` and opaque user closures are fitted. The cost is elsewhere: with no table-lookup op, the corridor compiles per element (a 39-line road: 607 IR nodes, a 34 KB shader, 200 parameters, 416 floats per draw, 1.2 s to parse). The core IR's table op is the fix (Task 9's array parameters). The precision to keep: the map within 1e-8 m of the CPU map and the Jacobian within 1e-9 (`test/corridorUnrollCompiled.test.ts`).
- **Fitting stays, narrowed,** to opaque code (a WebAssembly library such as proj.js, a solver, simulation output), unbounded or implicit definitions, and an app's deliberate choice to approximate an expensive exact function, with the error bound reported. Grid-based datum shifts (NTv2, geoid grids) leave this list once the core IR has table and texture lookups.
- The inspector's count of exact, compiled and fitted warped draws shows whether fitting is still needed. If fitted draws appear only in deliberate cases, the mechanism shrinks to a utility that makes a lattice from a function; the GPU draws lattices exactly as data.

**Loading is refinement, not a gate.**

- Scenes are interactive at once. A blocking card shows at most until something first draws. After that, a small fixed-size indicator names what is still refining ("Refining · 12 tiles, 3 fits"), never "Loading tiles". It reads the engine's refinement sources once those exist (renderer decision 7).
- **The first load pops** (owner, 2026-11-13): terrain doesn't rise from the ellipsoid, which read as the camera moving.

**Inspector rules.**

- Values may change; the layout may not. Fixed explanations sit behind an ⓘ tooltip, varying sentences become fixed-slot tables, the header has fixed segments, numbers use tabular figures, and a DOM-skeleton test enforces all of it.
- Series sit in the section they belong to. CPU and GPU time are together in Frame, sharing the time axis and crosshair; "Last 30 s" is gone.
- Reading a moving chart: hover pauses the display, a click pins a sample (anchored to its tick, not a pixel), Pause/Live with arrow-key stepping, and a per-tick ring buffer so a paused chart can be read frame by frame.
- Charts follow data-visualization practice: form by job, one scale per chart, colour by entity in a fixed, validated order, and hover values everywhere.
