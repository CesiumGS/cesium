# Frames 5d: Controllers, Bindings, Transitions and the Animation Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner chose subagent-driven execution: a fresh implementer per task, a fresh reviewer after each, and a whole-branch review at the end.
>
> **Check every existing path before Task 1.** A file split is moving `Engine.ts`, `World.ts`, `Tileset3D.ts`, `widgets/Viewer.ts` and `View.ts` as pure moves. This plan names existing code by symbol, and gives paths for new files only. Where a task needs an existing file, find it by symbol (`grep -rn "class CameraLayer" packages/next/src`) against the split as it landed, and say in the commit message if a name moved. Also: when this plan was written, a separate fix was changing `GlobeController`'s wheel zoom. This plan depends on no detail of `refreshZoomTarget` or `pin`. Task 9 keeps the motion code as it finds it.

**Goal:** Give every view controllers that own their constraints and work on any body, gestures as plain data, transitions that blend two live rigs and hand over cleanly, an orthographic camera, and a small general animation core, so that a camera in space can orbit anything, free flight reaches the Moon with no jump, and 5f and 5g have what they stand on.

**Architecture:**

- **The animation core** (`src/animation/`) animates a value over a timeline through a setter its caller gives it. It knows no cameras, no reference frames and no `Instant`. Each animation chooses the wall clock or a `SceneClock`. One `Timeline` per engine advances after the tick listeners and before the camera layer poses the views.
- **The rig stays a pose.** It gains an optional kind, damping per part, and a reference (an up and a heading direction from a reference frame) for a free orientation. `evaluateRig` is the one place a rig becomes a pose, used by the layer and by transitions.
- **Controllers are policies behind one interface** (`CameraController`), kept by the camera layer, one per view. Each owns its constraints, and each constraint has an off switch. Gestures reach them only as named actions through `GestureInput`, which reads a plain, serializable binding map.
- **A transition is the camera layer's, built on one animation.** Each tick it evaluates both live rigs at the scene time, blends them in the blend reference frame, and writes the camera there. That reference frame is the view's root while it runs. At the end the target rig becomes the view's rig and its controller takes over.
- **The orthographic camera goes through one seam,** `Camera.lens`, with a bypass test, so perspective code can't creep back in. A perspective view's numbers don't change.

**Tech Stack:** TypeScript (float64 on the CPU), Slang compiled to checked-in WGSL (`npm run shaders`), WebGPU, Vitest, Playwright (`bench/run.mjs`), the Vite dev server for one check page. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 11 (sub-plan 5d) as the authority, with sections 6 to 8 for the layers and rigs, section 13 for what 5f expects, and section 14 for what 5g expects. **Builds on:** `docs/superpowers/plans/2026-11-07-frames-5a-core-and-camera-chain.md`, `...-5b-frames-library.md`, `...-5c-second-body.md`.

**Base:** the commit that closes 5c (its Task 11, "Plan: frames 5c results"). Plans 5b and 5c are written but were not built when this plan was written. If an executed name differs from its plan, follow `api/surface.txt` and the code, and say so in the task's commit message. Other agents share this checkout: each task starts with `git status` for the code it will change, and waits for the owner of any uncommitted edit.

## What 5d takes from 5b and 5c

Only what those plans' Interfaces blocks produce. Anything else 5d needs, it adds itself, and the last column says where.

| Needed | From | Used by |
| --- | --- | --- |
| `rigPreset`, `RigPreset`, `RigPresetName` (a preset's rig is `axes` on its own reference frame, with no offset) | 5b Task 3 | Tasks 5 and 20 |
| `CameraLayer.held(view)` | 5b Task 3 | Tasks 10 and 20 |
| `twoVectorFrame`, `piecewiseFrame`, `Frame.parentAt` (routes stay on the static hub) | 5b Tasks 2 and 6 | Tasks 10 and 20 |
| `addView({ body })` on another body, drawing without error | 5c Task 3 | Tasks 9 and 20 |
| `CorePick.body`, `sampleHeightMostDetailed(world, positions, { body })` | 5c Task 2 | Tasks 17 and 18 |
| `Viewer.moon`, the Viewer's `zoomTo` moving the rig to the content's body-fixed frame, `setSplit` with a body, `orbitFocus` taking the view's body | 5c Task 9 | Task 18 |
| Controllers left to 5d (5c's call 5), and `Camera.lookAt` already taking an ellipsoid | 5c | Task 9 |

**Not produced by either, so 5d adds it:** a resolver's common ancestor (Task 10), quaternions (Task 2), a retained glTF node tree (Task 4), a rig's kind, damping and reference (Task 5), the body-fixed guard (Task 6).

**From §13.14's 5a lists:** 5d touches only the 5i note that "placement" means five things, so its setter is named for the blend, not the placement (Task 4). It adds to 5i's list in Task 21.

**What 5d leaves alone.** No model of a placement, no change to how normals or per-vertex kinds work, and no recomputing a placement on a change of root: those wait for §13.26. Models don't become scene items, and there is no scene graph and no `Entity` class: §13.25's full version and §13.29's names wait for their brainstorm and 5i. The design globe keeps its own flights until 5f.

## Author's calls

Each is marked "(author's call N)" where it is used. One line each, then what undoing it costs.
In order: the animation core (1 to 11), rigs (12 to 16), controllers (17 to 23), bindings (24 to 28), free flight (29 to 32), the orthographic camera (33 to 37), transitions (38 to 47).

1. **`src/animation/` imports only `src/core` and `src/math`,** enforced in `test/importBoundary.test.ts`. *Undo:* one rule.
2. **`Engine.timeline`** advances in the loop after the tick listeners (so the clock has moved) and before `cameras.update`, and at the start of `renderFrame()` outside the loop. *Undo:* one call site.
3. **An animation's clock** is `"wall"` (the default) or a `SceneClock` object. A transition's `"scene"` means its world's clock (`cameras.clock(world)`). *Undo:* a type.
4. **A scene-clock animation is a pure function of `clock.seconds`.** It stays on the timeline until cancelled, keeps no loop awake by itself outside its active span, and its `finished` re-arms when the clock is scrubbed back across its end, as the Web Animations API does. *Undo:* one state rule.
5. **`finished` never rejects.** It resolves to `"finished"` or `"cancelled"`, so an interrupted flight is no unhandled rejection. *Undo:* a promise's shape.
6. **No iterations, fill modes or composition.** The spec lists duration, delay, easing, play, pause, reverse, rate and `finished`. An animation's value stays where its setter last wrote it. *Undo:* additive.
7. **Easing presets are CSS's values** (`linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`). A spring is `{ kind: "spring", response, dampingRatio?, velocity? }`: `response` is its time constant in seconds, `dampingRatio` defaults to 1. With no `duration`, a spring's animation lasts until it settles within 0.001 of 1, in value and in value per second. *Undo:* a type.
8. **Samplers read glTF 2.0's definitions** (step, linear with slerp for rotations, cubic spline with its in-tangent, value, out-tangent layout), with time in seconds, held at the ends. *Undo:* none; it's the format.
9. **Time-varying properties have their home in `Timeline.bind`:** a value read from a scene clock's seconds and written through a setter whenever the clock moves. Names stay provisional for the vector design and 5i (§13.29). See ruling 1. *Undo:* one method.
10. **The core's setters live in a new `src/scene/animationSetters.ts`,** so the animation folder stays free of the scene. *Undo:* a file.
11. **Per-node transforms keep today's flat transforms.** A placement keeps one table transform per node that holds draws or lights. `setNodeTransform` recomputes that subtree's local matrices on the CPU from a retained node tree and writes them with `World.setTransform`. Nothing changes on the GPU. An instanced placement refuses it. *Undo:* one method.
12. **`{ kind: "free", reference? }`:** a free orientation may name a `reference` (an `up`, and optionally a `forward` for heading 0, in a reference frame's axes), which a controller reads as its up. `freeRig(rig)` turns any rig into the form a controller can own: `axes` keeps its `frame`, `up` and `forward` as the reference; `aim` keeps `upFrame` and `up`; the offset goes, and `anchor` stays (the orbit's default pivot). It returns the same object when nothing changes, so `Viewer`'s comparison with its own rig still holds. *Undo:* a type and a function.
13. **`Rig.kind?: string`** labels a rig for the transition table, and is plain data. `rigPreset` sets it to the preset's name. *Undo:* an optional field.
14. **Damping is `Rig.damping?: { position?: number; orientation?: number }`** in seconds. A damped view keeps a hidden goal `Camera`: the rig's evaluation and the controller write the goal, and a critically damped spring (ω = 1/τ) moves `view.camera` toward it, on the wall clock, in the render root's axes. It snaps and stops being busy within 1 mm and 1 mm/s, and 10⁻⁶ rad and 10⁻⁶ rad/s. An undamped view has no goal and costs nothing. *Undo:* one state field.
15. **`evaluateRig` is extracted from the layer's `pose`** as a pure function, so transitions evaluate two rigs the same way. *Undo:* a move.
16. **The table's root slot is hidden past `ANCHOR_EYE_REACH`,** with the same one report anchors get, in `computeAnchorEyes`. See ruling 7. Within reach nothing changes. *Undo:* one condition.
17. **`CameraController` is kept by the layer, one per view.** Each tick, per view, the layer steps the controller (`update(seconds)`), then the carry, then the rig. Input never reaches a controller except as an action. *Undo:* the seam's shape.
18. **Controllers live in a new `src/camera/controllers/`.** `InspectController` becomes `OrbitController` (with `InspectControllerOptions` becoming `OrbitControllerOptions`). The Earth-only proof-of-concept that holds that name today goes: only `demo/main.ts` and a layer test use it. A surface move ahead of 5i; see the questions at the end. *Undo:* a rename.
19. **A controller's body is its options', else `view.body`.** `earthFixed` and `EarthFixedGuard` become `bodyFixed(view, body)` and `BodyFixedGuard`. An orbit's up is, in order: its `frame` option; the rig's `reference`; east-north-up on `body` if a `body` option is given; else +Z of the position reference frame. *Undo:* one order.
20. **Constraints are data, and `false` is off:** `GlobeConstraints` (`minimumHeight`, `maximumHeight`, `collision`, `pitch`, `level`), and on orbit `minRange`, `maxRange`, `pitchLimit`, on free-fly `rangeLimit`, on CAD `minDistance`. With `collision: false`, a zoom doesn't stop at the point it zooms toward. *Undo:* option shapes.
21. **The globe's momentum stays the controller's own** (spin inertia and the wheel's glide, as 1.x), stepped by `update(seconds)`. Rig damping is off by default. See ruling 5. *Undo:* none needed.
22. **The globe and free-fly controllers ignore input in an orthographic view,** warning once through the same guard. Orbit and CAD work in both projections. *Undo:* two guards.
23. **A body with no synchronous height source** gets `cachedSurfaceHeight(sample, { cellRadians? })`, in the widgets: answers from a grid of cells (default 0.001 rad), filled one asynchronous sample at a time and at most one per 250 ms, `undefined` until known. The Viewer uses it on the Moon with `sampleHeightMostDetailed`. *Undo:* a helper.
24. **Known actions** are `STANDARD_ACTIONS` plus registered custom ones. A map's value is one action or a list, and the first the active controller has runs, so one map gives free-fly `look` where the globe has `orbit`. See ruling 2. *Undo:* a type.
25. **`GestureInput` is per view and element** (`cameras.bindInput`). Keys are listened to on the element, never `window`, so a host's own keys stay its own. Losing focus ends held keys. *Undo:* a listener's target.
26. **Touch:** a second finger ends a one-finger gesture. Two fingers are classified once as pinch, drag or rotate after 8 CSS px of total movement, and stay that until a finger lifts. *Undo:* a threshold.
27. **Preset contents** are in Task 7's Interfaces. `default` keeps today's globe gestures. `cad` is the spec's, with `key:f` and `key:1` to `key:4` added. *Undo:* data.
28. **The Viewer's orbit mode merges `{ "drag:right": "pan" }`** over the default map, so `setControls("orbit")` pages don't change. See the questions at the end. *Undo:* one line.
29. **Speed** is 0.5 of the height above the nearest body's ellipsoid per second, at least 1 m/s, reached through a 0.15 s spring on the input. With no bodies, a constant `speed` (default 100 m/s). *Undo:* constants.
30. **Re-attaching:** free flight attaches to the body with the lowest height ÷ maximum radius, and changes only when another's figure is under 0.8 of the current one's, so it doesn't flip at the boundary. Between bodies it stays on the last body-fixed frame. It is a controller policy over `context.setRig`. *Undo:* a constant.
31. **The hand-over:** below 0.02 of the body's maximum radius, free-fly offers the body's globe controls (`handOver: "offer"`, the default, calls `onOffer({ body, accept })`; `"auto"` accepts at once; `"off"` never offers). It re-arms above 0.03. Accepting starts a transition, never a jump. *Undo:* constants and a default.
32. **The level assist** turns roll toward the nearest body's up with a 1 s time constant, off by default, and changes nothing else. *Undo:* a constant.
33. **`Camera.orthographic: { height: number; far?: number } | undefined`.** `height` is the view's height in metres. Reverse-Z over a finite range: `z = (far − d) / (far − near)`. `far` defaults to the larger of 1,000 m and 100 × `height`. See ruling 6. *Undo:* a default.
34. **`Camera.lens(aspect)`** is the one place that reads the projection: `{ orthographic, tanX, tanY, halfX, halfY }`. A bypass test fails on reading `.fovy` anywhere else in `src/` and `widgets/`. *Undo:* a test.
35. **In an orthographic view, ambient occlusion is off and the light grid is one cell** (every light in every pixel's list, within the grid's capacity). Carried forward. *Undo:* each is local.
36. **The sky sees an orthographic view as its narrowest dolly perspective** (call 37's field of view). So it needs no second form, it can't divide by zero, and a dolly's last step shows the same sky. *Undo:* one function.
37. **The dolly's narrowest field of view is 0.1°.** On a square view 1,024 px tall, content within one view height of the focus plane moves under a pixel when the projection switches. *Undo:* a constant.
38. **`cameras.transition(view, options)`.** A target rig with a free position needs `pose.position` unless both rigs share a position reference frame, and is refused otherwise, naming its position reference frame. Free parts of the source are snapshotted at the start in its position reference frame, so they ride along with it. *Undo:* a refusal.
39. **`FrameResolver.commonAncestor?(a, b)`.** The frames resolver and table resolver answer it. A host's resolver without it blends in the source rig's position reference frame. See ruling 3. *Undo:* an optional method.
40. **While a rig in a transition can't be evaluated, the transition pauses:** the camera holds its last good pose, the weight holds, `held(view)` says why, one report goes out, and it resumes when the rig answers. It never times out. An application can cancel it. *Undo:* one state.
41. **Built-in defaults:** `duration: "auto"`, `easing: "ease-in-out"`, `clock: "wall"`, `path: "straight"`, `interrupt: "stop"`. `"auto"` is `clamp(1.2 + 0.35 · log₁₀(1 + span / 1000 m), 1.2, 3.5)` seconds, where `span` is the distance between the two poses at the start. *Undo:* defaults.
42. **An arc's peak** defaults to the larger of both ends' heights and min(0.25 × the arc's length along the sphere, 2 × `radius`). Height is `(1−w)h₀ + w·h₁ + 4w(1−w)·max(0, peak − max(h₀, h₁))`. Direction slerps about the arc's centre. A spline is a centripetal Catmull-Rom through its points, parameterized by chord length, with live ends. *Undo:* formulas.
43. **Interruptions.** `stop`: the rig becomes `freeRig` of the nearer of the two (weight below 0.5: the source), the camera stays, and that rig's controller takes over and receives the input. `handover`: `stop`, plus a carry: the camera's velocity, kept in the layer and re-expressed on a change of root, decaying with a 0.4 s time constant, so any controller gets it. `finish`: input is dropped, not queued. A programmatic `transition` over a running one follows the running one's policy; under `finish`, the latest waits and earlier waiters end `"cancelled"`. *Undo:* each policy is local.
44. **The pair table's keys** are `"<from kind>><to kind>"`, with `*` for either side. A rig's kind is `rig.kind`, else its controller's `kind`, else `"free"`. *Undo:* a string format.
45. **The Viewer's defaults for flights:** an arc over the view's body when both ends are on it, straight otherwise, and an app-wide duration of 0 when `prefers-reduced-motion` matches. The camera layer reads no DOM. *Undo:* two lines.
46. **CAD's standard views animate on the timeline,** turning the camera about the focus at a constant distance. A straight blend would dip through the model. Any input stops them. *Undo:* local.
47. **One check page,** `spikes/controllers.html`, with `runControllers(group)` on `globalThis`. **Ports:** Task 15 on 5191, Task 19 on 5192, Task 20 on 5193, Task 21 on 5194. *Undo:* none.

## Rulings on the spec

Places where the spec, read against the code and the earlier plans, is contradictory or can't be built as written, and what this plan does.

1. **"Bindings" means two things.** Spec section 11.4's bindings are gesture maps. §13.29 says what people use Entity for "is covered through scene items, styling and the bindings of 5d". Gesture maps can't hold a time-varying property. *Ruling:* section 11.4's meaning stands for the word "binding" in the code's gesture API. Time-varying values, tracks and clamping get their home in the animation core and what exists: `Timeline.bind` (call 9) for a value over time, `ModelPlacement.setTransform` or `PointSource.update` for where it goes, a rig's `anchor` with `World.frameOf` to follow it, and `PointSource`'s `clamp` to stand on the ground. The first question at the end asks whether that's what was meant. A moving clamped model has no path today (`Clamp` anchors at one place), and goes on the carried-forward list.
2. **"Unknown inputs and actions are refused at bind time" against "an action an active controller doesn't have is skipped"** (section 11.4). *Ruling:* "unknown" means outside the vocabulary (`STANDARD_ACTIONS` and registered custom actions). A known action the active controller lacks is skipped at dispatch (call 24).
3. **"The deepest common ancestor"** (section 11.5) needs a tree, and `FrameResolver` knows none. *Ruling:* call 39. `Frame.ts` and the frames resolver already have the walk.
4. **"Damping per rig part"** (sections 7.5 and 11.3) against a rig whose free parts are written by the controller, so the rig has nothing to damp. *Ruling:* call 14: the controller writes the goal.
5. **"Damping is a critically damped spring per rig part"** against the globe's inertia and wheel glide, tuned against 1.x. *Ruling:* call 21. They are controller motions, not rig damping.
6. **"Reverse-Z, as the perspective one"** (section 11.3). Today's reverse-Z has an infinite far plane, and code reads depth as `near / depth`. An orthographic projection has no infinite form. *Ruling:* call 33. Linear reverse-Z in float32 is coarsest near the camera: about 6 × 10⁻⁸ of the range, so 6 mm at 100 km. A `far` an application or `fitBounds` sets tightens it.
7. **"Earth to a lunar site blends in ICRF"** (section 11.5) puts the eye about 1.5 × 10¹¹ m from render space's origin. Anchors are safe: each has its own eye. Two things are not. Draws under no anchor would wrap past hi/lo's ±2³¹ m, since slot 0 is never hidden; call 16 hides them. And float64's step at that size is about 30 µm, which is the precision of the blended pose while it runs: well under a pixel for content more than a few centimetres away. A test states it (Task 10).
8. **§14.4's "GCRF gets an orbit rig about the Earth's centre on the `"inertial"` preset".** 5b's `inertial` takes its primary vector as the target's position from the central body, and with GCRF's origin at the Earth that vector is zero, so the preset is degenerate. *Ruling for 5d:* GCRF needs no preset: an orbit rig on GCRF with reference up +Z holds the stars still. Task 20 pins it, and 5g's table should say so.
9. **§13.25 lists "models and per-node transforms (5d)" among things to take up as items,** and section 11.5 adds them to `ModelPlacement`. *Ruling:* section 11.5. They are a method on `ModelPlacement` now, and a later item can wrap it (call 11).
10. **"Within a pixel at the target"** (section 11.6) names no resolution. *Ruling:* at the transition's end, on a view 1,024 px tall, the target's origin lands within 1 px of where the target rig's own evaluation puts it (Tasks 10 and 20).

## Global Constraints

Copied from the earlier plans where they apply, with 5d's additions.

- **Precision** (spec section 4): "Float64 on the CPU throughout. The GPU sees only camera-relative values (hi/lo and camera-relative, §13.15). Hi/lo is valid to ±2³¹ m (about 2.1 million km), which covers Earth to Moon." Nothing large is ever rotated in float32. Blends, springs and quaternions are float64.
- **Earth-only scenes are unchanged:** "The parity pages, the bench gate and every test keep passing. A globe-only scene renders the same pixels before and after." This holds after every task. The gates are 5a's call 46: `parity`, `models`, `tileset`, `customShader`, `translucency`, `tracks` and `imagery`, plus `globe`, `heights` and `lod` with a token; the bench gate is `alloc`. Metal can reorder a float sum when a kernel's code changes, so explain a one-ulp difference before accepting it (§13.14).
- **Cost rule:** per-view work grows with the number of anchors and bodies, not the number of draws or tiles. An idle timeline, a view with no controller and an undamped view do no new work per tick.
- **Pay for what you use.** A globe-only Viewer loads nothing new. `src/animation/` and `src/camera/` import nothing from `/time` or `/frames`.
- **The dependency rule** (spec section 7.7): the core imports nothing from `frames`, `proj` or `measure`, and nothing from `time`. It sees time only through `SceneClock`. The widgets import the other entry points by the package's name and nothing under `src/`. `test/importBoundary.test.ts` enforces it. The animation core and camera layer are core.
- **Generic rigs** (spec section 7.5): no special case for one body. The Earth appears only as a default someone can change. Add to a seam rather than going around it.
- **No constraint where a controller can't turn it off** (spec section 3). "Underground visualization is a first-class case."
- **Browser only.** No server-side computation. Data lives outside the repo (`~/.cesium-bench/…`, `FRAMES_DATA_DIR`). Nothing new is committed or shipped.
- **No ion tokens** anywhere in code, logs, URLs, reports, screenshots, storage or the DOM.
- **Examples are documentation:** public API only. Where an example or check page reaches past it, record it for 5i in the task's commit message.
- **Repository practice:**
  - Commands run in `packages/next`.
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Other agents share this checkout. Commit only your task's files, by path (`git add -- <paths>` then `git commit -m "…" -- <paths>`). Check `git diff --cached --name-only` first. Never `git add -A`, `git stash`, `git checkout`, `git reset` or `git push`. While `.git/index.lock` exists, wait and retry.
  - A pure move is its own commit (`git mv`), with no fix in it (§13.17). Tests that reach privates by cast change in the same commit.
  - Slang for engine shaders, compiled by `npm run shaders`. Never edit generated output; `npm run shaders:check` must pass.
  - Node 24 (`engines`).
- **Testing cadence per task:** the task's focused tests (`npx vitest run <files>`; data tests `FRAMES_DATA=1 npx vitest run test/data/<file>`), `npx tsc --noEmit -p .`, and `npx eslint` and `npx prettier --check` on the changed files. A task that changes `World`, `View`, `Engine`, `CameraLayer`, `Camera` or the Viewer also runs `npm test`. A task that changes `src/frames` also runs `npm run test:data`.
- **The surface map:** every task that changes an entry point's exports runs `npm run surface` and commits `api/surface.txt` with its code. The reviewer reads `git diff -- api/surface.txt` as the task's surface diff.
- **GPU safety:**
  - Node tests first (`test/fakeGpu.ts`'s `fakeEngine`). A task says when it needs a browser check.
  - A browser check uses one small page at a time, on the port its task names, with the task's own server: `npx vite --port <port> --strictPort`, started in the background and stopped afterwards, or `BENCH_URL=http://127.0.0.1:<port> node bench/run.mjs <one suite>`. **Never** use, restart or stop the server on 127.0.0.1:5190.
  - Every shader loop is bounded by a constant, with an early `break`. Read each changed shader's Metal with `node scripts/dumpMsl.mjs <module.wgsl> <entry>` before its first browser run. If the WebGPU device is lost, stop and find out why.
- **Snyk:** each task runs `snyk_code_scan` on the first-party files it adds or changes before it commits, fixes what the scan finds in its own code, and rescans until clean. Findings that predate 5d are reported, not fixed.
- **Wording:**
  - "Frame" is never used alone: a *reference frame*, a *tick* ("per tick", never "per frame"), *render space*, *render root*, *blend reference frame*. Compounds that can't be misread keep their names (the frame tree, the frames module, a body-fixed frame, a keyframe). Code names (`Frame`, `blendFrame`) keep theirs.
  - House style for docs, comments and UI text: plain, short sentences, units and datums named, no e-notation in prose. Keep precision and accuracy distinct.
  - Describe the purpose in generic words ("an embeddable rendering core", "a host application's own services").

## Review Focus

1. **A rig that stops answering in mid-flight:** the target's trajectory ends, its data is still loading, or a followed transform is removed. The camera holds its last good pose with no NaN, one report names the reference frame, `held(view)` says why, the weight holds, and it resumes when the rig answers. Tests: Tasks 10 and 13.
2. **A clock that jumps during a transition or an animation:** scrubbed backward, past the end, or at 3,600× with a wall-clock transition. The next tick evaluates at the new time with nothing left from the old. A scene-clock animation reads the clock's time, and its `finished` re-arms. Tests: Tasks 3 and 10.
3. **Input that doesn't end tidily:** a press during a `finish` transition, a drag under way when a programmatic transition starts, a second finger joining a drag, `pointercancel`, lost capture, or a held key when the element loses focus. No gesture sticks, nothing flies on by itself, and the next press works. Tests: Tasks 7 and 12.
4. **What a transition stands on going away:** the view removed, its world changed, `setRig` or `setController` called, the engine destroyed. `finished` settles, no later tick touches the view, and no listener stays. Tests: Tasks 10 and 12.
5. **Degenerate geometry:** a camera exactly on the orbit's pivot, a view along the up axis, identical source and target poses, antipodal directions on an arc, empty or non-finite bounds to fit, an orthographic height of 0, a viewport 0 px tall. Each is refused naming it or handled with no NaN. Tests: Tasks 8, 10, 11, 14 and 16.

---

## File structure

New files, by responsibility (modified code is named by symbol in each task):

- **The animation core:** `src/animation/easing.ts`, `spring.ts`, `sampler.ts`, `Animation.ts` (`Animation`, `Timeline`), `index.ts`.
- **Math:** `src/math/quat.ts`.
- **Setters:** `src/scene/animationSetters.ts`.
- **Rigs:** `src/camera/evaluateRig.ts`, `src/camera/damping.ts`.
- **Controllers:** `src/camera/controller.ts` (the interface), `src/camera/controllers/OrbitController.ts`, `GlobeController.ts`, `FreeFlyController.ts`, `CadController.ts`.
- **Bindings:** `src/camera/bindings.ts` (grammar, vocabulary, presets), `src/camera/GestureInput.ts`.
- **Transitions:** `src/camera/transition.ts`, `src/camera/transitionPaths.ts`, `src/camera/transitionDefaults.ts`.
- **Widgets:** `widgets/cachedSurfaceHeight.ts`.
- **Checks:** `spikes/controllers.html`, `spikes/controllers.ts`.

---

### Task 1: Easing and springs

**Files:**

- Create: `src/animation/easing.ts`, `src/animation/spring.ts`, `test/animationEasing.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces (author's call 7):
  - `type EasingName = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out"`;
  - `interface CubicBezier { readonly kind: "cubicBezier"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }`;
  - `interface SpringEasing { readonly kind: "spring"; readonly response: number; readonly dampingRatio?: number; readonly velocity?: number }`;
  - `type Easing = EasingName | CubicBezier | SpringEasing | ((t: number) => number)`;
  - `interface EasingCurve { value(t: number): number; velocity(t: number): number; readonly settleSeconds?: number }`: `t` is seconds since the start for a spring, and progress from 0 to 1 otherwise; `velocity` is d(value)/dt in the same `t`;
  - `easingCurve(easing: Easing): EasingCurve`: throws a `RangeError` naming an unknown name, `x1` or `x2` outside 0 to 1, or a `response` that isn't positive;
  - `springStep(x: number, v: number, target: number, omega: number, dt: number, out: { x: number; v: number }): void`: the critically damped spring's exact step, stable at any `dt`.

- [ ] **Step 1: Write the failing test:**
  - `ease` at 0.5 is 0.8024, `ease-in` 0.3154, `ease-out` 0.6846, `ease-in-out` 0.5, `linear` 0.5, each within 0.001, and every curve is 0 at 0 and 1 at 1;
  - a cubic Bézier with `y1` of 1.5 overshoots above 1 and comes back to 1;
  - a spring with `response` 1, ratio 1: `value(1)` is 1 − 2/e within 10⁻¹²; `velocity(0)` is the given `velocity`; `settleSeconds` is where value and velocity are both within 0.001;
  - a spring with ratio 0.5 overshoots; a function easing passes through;
  - interrupted: a new spring with `velocity: old.velocity(t)` has that slope at 0 (the spec's "keeps its velocity");
  - `springStep`: two half steps equal one whole within 10⁻¹²; a step of 1,000 τ lands on the target within 10⁻⁹, with no overshoot;
  - each refusal names what it refuses.
- [ ] **Step 2: Run** `npx vitest run test/animationEasing.test.ts` and confirm it fails: no module.
- [ ] **Step 3: Implement.** Solve the Bézier by Newton's method with a bisection fallback, 8 steps bounded by a constant.
- [ ] **Step 4: Run** the test, tsc, eslint, prettier.
- [ ] **Step 5: Commit** with "animation: easing presets, cubic Béziers, springs and the exact spring step".

### Task 2: Quaternions and keyframe samplers

**Files:**

- Create: `src/math/quat.ts`, `src/animation/sampler.ts`, `test/quat.test.ts`, `test/animationSampler.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `src/math/quat.ts`, on `Float64Array` of (x, y, z, w): `quat()`, `fromBasis(out, right, up, forward)`, `toBasis(q, right, up, forward)`, `slerp(out, a, b, t)` (the short way), `normalize`, `multiply`, `conjugate`, `rotationVector(out3, q)`, `fromRotationVector(out, r)`;
  - `interface SamplerData { readonly input: ArrayLike<number>; readonly output: ArrayLike<number>; readonly components: number; readonly interpolation?: "STEP" | "LINEAR" | "CUBICSPLINE"; readonly rotation?: boolean }` (author's call 8);
  - `class Sampler { constructor(data: SamplerData); readonly start: number; readonly end: number; readonly duration: number; evaluate(seconds: number, out: Float64Array): Float64Array }`.

- [ ] **Step 1: Write the failing tests:**
  - `test/quat.test.ts`: `toBasis(fromBasis(…))` gives back the basis within 10⁻¹⁴ for 1,000 random rotations, 180° included; `slerp` at 0.5 between identity and a 90° turn is a 45° turn within 10⁻¹⁴; slerp takes the short way when the two quaternions have opposite signs; `rotationVector` and `fromRotationVector` invert each other, at 0 too.
  - `test/animationSampler.test.ts`:
    - `STEP` holds the earlier key; `LINEAR` is the mix; both hold at the ends;
    - `CUBICSPLINE` over keys at t₀ = 1, t₁ = 3 equals glTF's p(s) = (2s³−3s²+1)p₀ + (s³−2s²+s)·2b₀ + (−2s³+3s²)p₁ + (s³−s²)·2a₁ at s = 0.25, within 10⁻¹²; the output layout is (a, v, b);
    - a `rotation` sampler slerps under `LINEAR`, and returns a unit quaternion under `CUBICSPLINE`;
    - one key is a constant; `evaluate` writes `out` and returns it;
    - refused, naming the index or count: a non-increasing input, an output of the wrong length, no keys, a non-finite value.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.** Binary search, starting from the last interval found.
- [ ] **Step 4: Run** the tests, tsc, eslint, prettier.
- [ ] **Step 5: Commit** with "math: quaternions; animation: glTF's step, linear and cubic spline samplers".

### Task 3: Animations, the timeline and time-varying values

**Files:**

- Create: `src/animation/Animation.ts`, `src/animation/index.ts`, `test/animation.test.ts`, `test/fakeClock.ts`
- Modify: `Engine` (`timeline`, the loop, `renderFrame`, `destroy`), the core entry point, `api/surface.txt`, `test/importBoundary.test.ts` (the folder's rule)

**Interfaces:**

- Consumes: Tasks 1 and 2; 5a's `SceneClock`.
- Produces:
  - `type AnimationClock = "wall" | SceneClock` (author's call 3);
  - `interface AnimationOptions<T> { readonly value: (progress: number) => T; readonly set: (value: T) => void; readonly duration?: number; readonly delay?: number; readonly easing?: Easing; readonly clock?: AnimationClock; readonly playbackRate?: number; readonly autoplay?: boolean }`: seconds; `duration` required unless the easing is a spring; `value` gets the eased progress;
  - `lerpValue(from: number, to: number): (p: number) => number` and `samplerValue(sampler: Sampler, out: Float64Array): (p: number) => Float64Array`, the latter's `duration` defaulting to the sampler's;
  - `type AnimationEnd = "finished" | "cancelled"` (author's call 5);
  - `class Animation<T>`, with no iterations or fill modes (author's call 6): `readonly state: "idle" | "running" | "paused" | "finished" | "cancelled"`; `readonly finished: Promise<AnimationEnd>`; `currentTime` (seconds); `readonly progress`; `readonly velocity` (eased progress per second); `playbackRate`; `play()`; `pause()`; `reverse()`; `finish()`; `cancel()`;
  - `class Timeline`: `animate<T>(options: AnimationOptions<T>): Animation<T>`; `bind<T>(options: { readonly clock: SceneClock; readonly value: (seconds: number) => T; readonly set: (value: T) => void }): { remove(): void }` (author's call 9); `update(now: number): boolean`; `readonly size: number`;
  - `Engine.timeline: Timeline` (author's call 2).
  - A setter that throws is reported once through `EngineErrors` (kind `"animation"`), and its animation is cancelled. The tick goes on.

- [ ] **Step 1: Write the failing test** (an injected `now` and the `FakeClock` from `test/cameraLayer.test.ts`, moved to a small `test/fakeClock.ts`; no wall-clock waits):
  - wall clock, linear, 2 s: at `now + 1000` the setter saw 0.5; `pause` holds through later updates; `play` resumes from there; `playbackRate` 2 takes half the time; `reverse` runs back from where it is; `delay` writes nothing early; `finish()` writes the end at once;
  - `finished` resolves `"finished"` with the end value written exactly; `cancel()` resolves `"cancelled"`, and the setter isn't called again;
  - duration 0: the end value at the first update, and `finished` resolves;
  - scene clock (Review Focus 2): a paused clock holds it however far `now` moves; at rate 3,600 it follows `clock.seconds`; set back, it evaluates at the clock's time; scrubbed past the end `finished` resolves, then scrubbed back `state` is `"running"` and `finished` is a new promise; scrubbed before the start it writes `value(0)` once;
  - awake: `update` returns true for a running wall animation and a scene animation in its active span on a playing clock; false when paused, settled, or with a paused clock; a scene animation's clock waking the host: a clock change wakes `Engine` while one is registered, and not after `cancel()`;
  - `bind`: writes at once and when `clock.seconds` changes, not otherwise; follows a scrub backward; writes nothing after `remove()`; a sampler's value read through it at a key equals that key;
  - order: in `fakeEngine`'s loop, a tick listener moves the clock, a scene animation's setter reads the new seconds, and `cameras.update` runs after it (a recorded array);
  - the setter that throws: one report, cancelled, and another animation still runs;
  - the import rule (author's call 1): `src/animation/` importing from `src/scene` fails the boundary test (the new rule, checked against a synthetic import list).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** `update` returns at once when `size` is 0. A clock is watched once, however many animations use it.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "animation: animations on a wall or scene clock, one timeline per engine, and time-varying values".

### Task 4: The core's setters, per-node transforms, and tracks

**Files:**

- Create: `src/scene/animationSetters.ts`, `test/nodeTransforms.test.ts`, `test/animationSetters.test.ts`
- Modify: glTF parsing (a node list), `PlacementTemplate`, `placeModel`, `ModelPlacement`, the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Task 3; 5a's `PlacementParameter`, `SceneItem.placement`, `World.frameOf`, `World.setTransform`, `PointSource.update`.
- Produces (author's calls 10 and 11):
  - `GltfNode { name?: string; parent: number; local: Float64Array }`, kept in the `PlacementTemplate`, and each `GltfDraw` and `GltfLight` naming its `node`;
  - `type NodeTransform = { readonly matrix: ArrayLike<number> } | { readonly translation?: ArrayLike<number>; readonly rotation?: ArrayLike<number>; readonly scale?: ArrayLike<number> }`: fields left out keep the node's own;
  - `ModelPlacement.nodes: readonly { readonly index: number; readonly name: string | undefined; readonly parent: number }[]`;
  - `ModelPlacement.setNodeTransform(node: string | number, transform: NodeTransform): void`, `ModelPlacement.resetNodeTransform(node?: string | number): void`. It throws naming the node and listing the names for an unknown one, naming the placement's instances for an instanced one, and naming a non-finite value. A placement's `bounds()` reflects moved nodes;
  - `placementBlendSetter(target: PlacementParameter | SceneItem): (t: number) => void` (for an item, its position blend, whatever 5i renames it);
  - `nodeTransformSetter(placement: ModelPlacement, node: string | number, part: "matrix" | "translation" | "rotation" | "scale"): (value: ArrayLike<number>) => void`.

- [ ] **Step 1: Write the failing tests:**
  - `test/nodeTransforms.test.ts` (`fakeEngine`, a small GLB built in the test: `azimuth` with no mesh → `elevation` with no mesh → `dish` with a mesh, as a dish model has):
    - turning `azimuth` 90° about Y gives `dish`'s world matrix root × correction × az′ × el × dish within 10⁻⁹, and `elevation` then composes with it;
    - a node with no draws works; another placement of the same model doesn't move; no transform is added or removed (the world's count is the same);
    - `resetNodeTransform` restores the file's matrices within 10⁻¹²;
    - a light at a moved node moves; `bounds()` moves;
    - the refusals above; `setNodeTransform` after `remove()` throws as `setTransform` does.
  - `test/animationSetters.test.ts`:
    - `placementBlendSetter` writes a parameter and an item's blend; a non-finite value throws through `Timeline`'s one report;
    - an azimuth sampler on a scene clock (`samplerValue`, `nodeTransformSetter`) gives the dish its key's rotation at a key, and the earlier one scrubbed back;
    - a track: `timeline.bind` with a position sampler and `placement.setTransform` puts the model at the key; a rig `{ position: { frame: world.root, anchor: world.frameOf(placement.transform, "track"), offset: [0, 0, 100] }, orientation: { kind: "free" } }` on the table resolver rides 100 m above it (ruling 1);
    - a clamped track: `timeline.bind` writes `PointSource.update` samples each clock change, with `clamp` set: the source sees each sample, and the clamp's capture is requested as today.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.** Parsing keeps today's draw and instance order, so nothing else moves. A node with neither draws nor lights below it needs no table transform. A subtree recompute writes only the transforms below the moved node.
- [ ] **Step 4: Run** the tests, `test/models.test.ts` and `test/glb.test.ts` unchanged, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "scene: per-node transforms on a placed model, and setters for a placement's blend and a node".

### Task 5: The rig: kind, reference, damping, and one evaluation

**Files:**

- Create: `src/camera/evaluateRig.ts`, `src/camera/damping.ts`, `test/evaluateRig.test.ts`, `test/rigDamping.test.ts`
- Modify: `Rig`, `RigOrientation`, `rigError`, `isDefaultRig`, `CameraLayer` (`pose`, `reroot`, `update(now?)`), `computeAnchorEyes`, `Engine` (the loop passes `now`), `rigPreset` (sets `kind`), the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 1 and 2; 5a's `CameraLayer`; 5b's `rigPreset`, `held`.
- Produces:
  - `RigOrientation`'s free case: `{ readonly kind: "free"; readonly reference?: RigReference }`, with `interface RigReference { readonly frame: FrameKey; readonly up: ArrayLike<number>; readonly forward?: ArrayLike<number> }` (author's call 12);
  - `Rig.kind?: string` (author's call 13); `Rig.damping?: RigDamping`, `interface RigDamping { readonly position?: number; readonly orientation?: number }` (author's call 14);
  - `freeRig(rig: Rig): Rig` (author's call 12);
  - `interface RigPose { readonly position: Float64Array; readonly direction: Float64Array; readonly up: Float64Array; readonly right: Float64Array }`;
  - `evaluateRig(rig: Rig, free: CameraPose, root: FrameKey, seconds: number, resolve: (frame: FrameKey, base: FrameKey, seconds: number, out: Float64Array) => Float64Array, out: RigPose): void`, throwing `RigPoseError` (with `frame`) for an aim target at the camera or an up along the view (author's call 15);
  - `CameraLayer.update(now?: number): boolean`, default `performance.now()`; busy while a spring moves, whatever the clock.
  - The root's hidden slot past `ANCHOR_EYE_REACH` (author's call 16).

- [ ] **Step 1: Write the failing tests:**
  - `test/evaluateRig.test.ts`: every case `test/cameraLayer.test.ts` already pins for `pose` gives the same numbers, exactly, through `evaluateRig`; `freeRig` of `axes`, of `aim` and of an offset rig, each with its reference and `anchor` as call 12 says; `freeRig` of a free rig is the same object; `isDefaultRig` is false with damping or a reference; `rigError` names a bad `reference.up` or `damping` that isn't positive; a preset from `rigPreset` has `kind` equal to its name.
  - `test/rigDamping.test.ts` (`fakeEngine`, injected `now`, a paused clock):
    - a rig whose offset jumps 100 m, `damping.position` 1: after 1 s the camera has 100 · (1 + 1)/e of it left, within 10⁻⁶ m, though the clock is paused; `update` is busy until it snaps within 1 mm, and false after;
    - a followed anchor at 100 m/s, τ 0.5: the steady lag is 100 m within 1%;
    - orientation: a 90° change settles by the spring; `up` and `right` stay orthonormal within 10⁻¹²;
    - a re-root mid-spring: the camera's place on screen and its velocity are continuous (a rigid point's pixel moves under 10⁻⁶ px across the re-root);
    - undamped: no goal camera exists, and `camera.version` doesn't move on a settled tick;
    - with damping off again, the camera lands on the goal at once;
    - `computeAnchorEyes`: an eye 1.5 × 10¹¹ m from the root hides slot 0 with one report; at 2³¹ − 1 m it doesn't. On the frames module's stubbed catalog, a rig on ICRF places the Earth's anchor so that the eye in it is correct within 100 µm (ruling 7).
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.** `src/camera/damping.ts` holds position per axis through `springStep`, and orientation as a rotation vector from camera to goal, in the root's axes, through the same step. A wake from sleep resets the wall-clock delta to 0. A test that pins "slot 0 is never hidden" changes with call 16.
- [ ] **Step 4: Run** the tests, `test/cameraLayer.test.ts` and `test/rerooting.test.ts` unchanged, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: a rig's kind, reference and damping; one rig evaluation; the table root hidden past hi/lo's reach".

### Task 6: The controller seam

**Files:**

- Create: `src/camera/controller.ts`, `test/cameraController.test.ts`
- Modify: `CameraLayer` (`setController`, `controller`, the tick), `earthFixed` and `EarthFixedGuard` (renamed and given a body), the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Task 5.
- Produces (author's calls 17 and 19):
  - ```ts
    interface ActionEvent {
      readonly action: string;
      readonly input: string; // the binding's input, "shift+drag:left"
      readonly gesture: "drag" | "wheel" | "pinch" | "rotate" | "key" | "click";
      readonly phase: "start" | "move" | "end" | "once";
      readonly x: number; readonly y: number; // target pixels
      readonly dx: number; readonly dy: number; // target pixels since the last event
      readonly amount: number; // wheel: pixels; pinch: log of the scale; rotate: radians
    }
    interface ControllerContext {
      readonly view: View;
      readonly camera: Camera; // the view's camera, its goal when damped, or a linked view's
      rig(): Rig;
      root(): FrameKey;
      seconds(): number;
      resolve(frame: FrameKey, base: FrameKey, out: Float64Array): Float64Array;
      setRig(rig: Rig): void;
      readonly timeline: Timeline;
      pick(x: number, y: number): Promise<CorePick | undefined>;
      wake(): void;
      // Task 10 adds transition(options: TransitionOptions): Transition.
    }
    interface CameraController {
      readonly kind: string;
      readonly actions: Readonly<Record<string, (event: ActionEvent) => void>>;
      attach(context: ControllerContext): Rig | void; // the rig it needs, or the rig stays
      detach(): void;
      update(seconds: number): boolean; // wall seconds since last; busy
    }
    ```
  - `CameraLayer.setController(view: View, controller: CameraController | undefined, options?: { readonly camera?: Camera }): void`, `CameraLayer.controller(view: View): CameraController | undefined`;
  - `bodyFixed(view: View, body: Body): boolean`, `BodyFixedGuard` (naming the body in its one warning), with `earthFixed` gone.

- [ ] **Step 1: Write the failing test** (`fakeEngine`; a host's own controller as an object literal, the spec's "full replacement"):
  - `attach` gets a working context, and the rig it returns becomes the view's rig with the camera re-expressed; returning nothing leaves `cameras.rig(view)` the same object;
  - `update` runs once per view per tick, before the rig is evaluated (a recorded array), with wall seconds from the injected `now`; returning true keeps `cameras.update` busy on a paused clock;
  - `setController` to another detaches the first; to `undefined` no controller runs; removing the view detaches, and no later tick calls it (Review Focus 4);
  - `options.camera`: a linked view's camera is `context.camera`;
  - a damped rig: `context.camera` is the goal, not `view.camera`;
  - `bodyFixed`: a rig on `world.bodyAnchor(MOON)` is fixed for `MOON` and not `EARTH`; the guard warns once, naming the Moon; a view with no body anchor reads as fixed, as today's root does;
  - with no controller set, `cameras.update` does what it did: `test/cameraLayer.test.ts` passes with only the guard's rename.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** A view's controller lives in `ViewState`. No allocation per tick.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: controllers behind one interface, kept per view by the camera layer".

### Task 7: Gestures as bindings

**Files:**

- Create: `src/camera/bindings.ts`, `src/camera/GestureInput.ts`, `test/bindings.test.ts`, `test/gestureInput.test.ts`
- Modify: `CameraLayer` (`bindInput`, dispatch), the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Task 6.
- Produces (author's calls 24 to 27):
  - The grammar, as the spec: `device:gesture`, modifiers (`shift`, `ctrl`, `alt`, `meta`) first and joined by `+`: `drag:left`, `drag:middle`, `drag:right`, `wheel`, `touch1:drag`, `touch2:pinch`, `touch2:drag`, `touch2:rotate`, `key:<key, lower case>`, `dblclick:left`. `parseInput(name: string): ParsedInput` throws a `RangeError` naming it.
  - `STANDARD_ACTIONS`: `orbit`, `pan`, `zoom`, `look`, `tilt`, `roll`, `rollLeft`, `rollRight`, `flyForward`, `flyBackward`, `flyLeft`, `flyRight`, `flyUp`, `flyDown`, `fitSelection`, `viewTop`, `viewFront`, `viewSide`, `viewIsometric`.
  - `type BindingMap = Readonly<Record<string, string | readonly string[]>>`.
  - `BINDING_PRESETS: { readonly default: BindingMap; readonly cad: BindingMap }`:
    - `default`: `drag:left` [`orbit`, `look`]; `drag:right` `zoom`; `drag:middle` `tilt`; `ctrl+drag:left` `tilt`; `shift+drag:left` [`look`, `pan`]; `wheel` `zoom`; `touch1:drag` [`orbit`, `look`]; `touch2:pinch` `zoom`; `touch2:drag` [`tilt`, `pan`]; `touch2:rotate` `roll`; `key:w`, `s`, `a`, `d`, `e`, `q` the six flight axes (forward, backward, left, right, up, down); `key:z`, `key:c` `rollLeft`, `rollRight`; `key:f` `fitSelection`;
    - `cad`: `drag:middle` `orbit`; `shift+drag:middle` `pan`; `wheel` `zoom`; `touch1:drag` `orbit`; `touch2:pinch` `zoom`; `touch2:drag` `pan`; `key:f` `fitSelection`; `key:1` to `key:4` `viewTop`, `viewFront`, `viewSide`, `viewIsometric`.
  - `class GestureInput`: `readonly bindings: BindingMap`; `setBindings(map: BindingMap): void`; `mergeBindings(overrides: Readonly<Record<string, string | readonly string[] | null>>): void` (`null` unbinds); `registerAction(name: string, run: (context: ControllerContext, event: ActionEvent) => void): void`; `ignore?: (x: number, y: number) => boolean`; `readonly inputs: number` (gestures so far, as `GlobeController.inputs` counts them); `dispose(): void`. A bad name is refused at bind time, naming it, with the map left as it was.
  - `CameraLayer.bindInput(view: View, element: HTMLElement, options?: { readonly bindings?: BindingMap | "default" | "cad" }): GestureInput`. A running transition sees the event first (Task 12).

- [ ] **Step 1: Write the failing tests** (`test/gestureInput.test.ts` fires events as `test/inspectController.test.ts` does: an `EventTarget` with `getBoundingClientRect`, `Object.assign(new Event(…), …)`):
  - `test/bindings.test.ts`: every grammar example parses; `drag:elbow`, `tap:left`, `drag:left+shift` and the action `fly` are each refused, named; a map survives `JSON.parse(JSON.stringify(map))` and binds; merging keeps the rest, and `null` unbinds; both presets bind; a custom action is unknown until registered.
  - `test/gestureInput.test.ts`:
    - a left drag gives `orbit` with phases start, move, end, in target pixels on a 2× canvas;
    - a controller stub with only `look` gets `drag:left` as `look`; one with neither gets nothing and nothing throws; the default map binds to a stub of each built-in's action list (a test binds it to each controller again in Task 20);
    - `shift+drag:left` beats `drag:left`; modifiers are read at the press;
    - the wheel: `amount` in pixels, line mode × 16, `preventDefault` only when bound and accepted;
    - a press outside `view.contains`, or where `ignore` says, starts nothing; moves after a press inside keep going outside;
    - a right drag bound prevents the context menu; unbound it doesn't;
    - touch: one finger `touch1:drag`; a pinch of 2× gives `amount` log 2; a rotation gives radians; a two-finger drag gives its centroid's motion; classification sticks until a finger lifts (Review Focus 3: a second finger joining sends `end` to the one-finger gesture);
    - `pointercancel` and lost capture send `end`;
    - keys: `keydown` gives `start` once despite repeats, `keyup` `end`; `blur` ends every held key, so nothing flies on by itself (Review Focus 3); a key event on another element does nothing;
    - `registerAction` runs with a working context;
    - `dispose` removes every listener (a counting `addEventListener`).
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: gestures as bindings: a plain map from input to action, presets and custom actions".

### Task 8: The orbit controller, on any reference frame

**Files:**

- Create: `src/camera/controllers/OrbitController.ts` (by `git mv` from `InspectController`'s file), `test/orbitController.test.ts` (by `git mv` from `test/inspectController.test.ts`)
- Modify: every caller of the old names (`grep -rn "InspectController\|OrbitController"`: the demo, the bench suite, the handbook's viewer and API map, `Viewer`, `orbitFocus`, the explorer, the layer's test), the core entry point, `api/surface.txt`
- Delete: the old `OrbitController`'s file

**Interfaces:**

- Consumes: Tasks 5 to 7.
- Produces (author's calls 18 to 20):
  - `class OrbitController implements CameraController`, `kind: "orbit"`, constructed `new OrbitController(options?: OrbitControllerOptions)`. It keeps `target`, `heading`, `pitch`, `range`, `minRange`, `maxRange`, `frame`, `dragging`, `focus`, `syncFromCamera`, `onChange`.
  - `interface OrbitControllerOptions { readonly pivot?: { readonly frame?: FrameKey; readonly point?: ArrayLike<number> }; readonly frame?: OrbitFrame; readonly body?: Body; readonly minRange?: number | false; readonly maxRange?: number | false; readonly pitchLimit?: number | false }`. The pivot defaults to the rig's `anchor`, else the position reference frame's origin.
  - Actions: `orbit`, `tilt` (pitch only), `pan`, `zoom`.
  - `attach` returns `freeRig(rig)` when the rig isn't free.
  - Each `update`: the pivot and the up are resolved in the root at the clock's seconds. If they moved, the camera is placed from `heading`, `pitch` and `range`, in them. A pan's offset from the pivot moves with it. This is what the explorer's `followRig` does by hand.
  - A range outside the limits (landing from an interrupted flight) widens them to where it landed, until the camera is inside them again, as the explorer's `landedLimits` does.
  - `orbitBasis`, `orbitPose`, `enuBasis`, `OrbitFrame`, `OrbitBasis` stay exported. `planOrbit` and `followZoom` take an `OrbitController`.

- [ ] **Step 1: The pure move.** `git mv` both files, rename the classes and every caller, and retire the old proof of concept. The demo's main and second views move to `GlobeController` as it stands. Its overview's control link goes for now, and Task 9 restores it through `setController`'s `camera`. `npm test` passes. Commit on its own with "camera: InspectController is now OrbitController; the Earth-only proof of concept goes".
- [ ] **Step 2: Write the failing tests** in `test/orbitController.test.ts`. Every existing assertion stays, driven through `bindInput` and `setController`, with `body: EARTH` where it reads east-north-up. New:
  - no pick: a drag on a rig off the Earth orbits with `view.pickPoint` never called;
  - no body: on the table resolver, in render space with no body option, the up is +Z and the pivot the origin;
  - a moving pivot: a stub resolver moves the pivot 1,000 km per tick and turns its axes: heading, pitch and range hold within 10⁻⁹, and the camera's offset in those axes holds within 1 µm; a panned pivot's offset moves with it (the explorer's "carries a panned pivot" case, ported);
  - a rolled reference: reference up [0, 1, 0]: heading turns about it, and `camera.up · up > 0`;
  - a preset: `freeRig(rigPreset("orbital", …).rig)` (a synthetic target, as 5b's test): the first tick doesn't move the camera beyond the re-expression, and up comes from the preset's axes;
  - each off switch: `pitchLimit: false`: a long drag carries the camera over the pole, with position continuous and the sign of `offset · up` changing; `minRange: false`: the wheel passes 0.01 m without stopping at the old floor; `maxRange: false`: no ceiling;
  - landed limits: the three cases in the explorer's test, ported;
  - damping: with `rig.damping`, a drag moves the goal at once and the camera follows;
  - Review Focus 5: a camera on the pivot keeps its pose and no NaN; a view along up keeps the heading; `focus` with a range of 0 or NaN throws, naming it;
  - in orthographic (after Task 14 this case joins; left `it.todo` here with Task 14's number): the wheel scales `height`.
- [ ] **Step 3: Run** and confirm the new cases fail.
- [ ] **Step 4: Implement.** Replace the DOM listeners with actions. Remove the Earth guard. Keep `apply` going through `Camera.lookAtInFrame` with the clamp lifted under `pitchLimit: false`.
- [ ] **Step 5: Run** the tests, `test/framesExplorerOrbit.test.ts` with imports only changed, `npm test`, tsc, eslint, prettier.
- [ ] **Step 6: Surface and commit** with "camera: the orbit controller: a pivot and an up axis in any reference frame, with no pick to start".

### Task 9: The globe controller, on any body

**Files:**

- Create: `src/camera/controllers/GlobeController.ts` (by `git mv`), `test/globeController.test.ts`
- Modify: every caller of its constructor (`grep -rn "new GlobeController"`: the demo, with its overview's control link restored through `setController`'s `camera`; the bench suite; the handbook's viewer; `Viewer`, construction only, as Task 18 does the rest), the layer's test, the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 6 and 7; 5c's views on another body.
- Produces (author's calls 19 to 22):
  - `class GlobeController implements CameraController`, `kind: "globe"`, constructed `new GlobeController(options?: GlobeControllerOptions)`.
  - `interface GlobeControllerOptions { readonly body?: Body; readonly surfaceHeight?: (longitude: number, latitude: number) => number | undefined; readonly constraints?: Partial<GlobeConstraints> }`.
  - `interface GlobeConstraints { minimumHeight: number | false; maximumHeight: number | false; collision: boolean; pitch: readonly [number, number] | false; level: boolean }`, defaults 1 m, 10⁸ m, `true`, today's limits, `true`. `controller.constraints` is writable.
  - Actions: `orbit` (grab), `zoom` (wheel and drag), `tilt`, `look`.
  - It keeps `focus`, `stop`, `moving`, `target`, `heading`, `pitch`, `range`, `inputs`, `surfaceHeight`, and today's tunables. `enabled` and `ignore` go: the layer's one controller and `GestureInput.ignore` replace them. Momentum steps in `update(seconds)`, not its own `onTick` or `requestAnimationFrame` callback.
  - `attach` returns a rig on `world.bodyAnchor(body)` if the view isn't already `bodyFixed`, and `freeRig(rig)` otherwise.

- [ ] **Step 1: A golden test before anything changes** (`test/globeController.test.ts`, "today's Earth"): against the class as it stands when this task starts, with `performance.now` stubbed and `pickPosition` resolving `undefined`, drive one scripted session: a grab, five wheel notches, a tilt, a look, a release with momentum. Record the camera's position, direction and up after each stage as numbers in the test. It passes now. This is what the task must not change.
- [ ] **Step 2: The pure move.** `git mv`. The golden test still passes. Commit on its own.
- [ ] **Step 3: Write the failing tests,** the golden session unchanged (through `bindInput`, the stub now driving `update`) and within 10⁻⁹ m. New, with `describe.each([EARTH, MOON])`, on a view with that body and a rig on its anchor:
  - a grab holds the point under the cursor within 1 px across a 50 px drag;
  - wheel zoom keeps no roll, measured against that body's normal;
  - the camera stays `minimumHeight` above that body's ellipsoid, or above `surfaceHeight`: on the Moon, a position 1 m over the Moon's ellipsoid, far inside the Earth's;
  - each off switch, with the camera driven by synthetic input: `minimumHeight: false` with `collision: false`: 300 wheel notches from 100 m above the surface end below the ellipsoid, with no NaN and with `ellipsoidAt`'s from-inside path taken, and reversing them comes back out; `maximumHeight: false`: past 10⁸ m; `pitch: false`: a tilt past the pivot's horizon goes below it; `level: false`: a roll stays;
  - not body-fixed: a rig elsewhere ignores input, warning once and naming the body;
  - orthographic ignored and warned (joins after Task 14, `it.todo` here);
  - momentum: spin decays by `inertiaSpin` per 1/60 s through `update`, and `update` returns false when settled, with no `onTick` listener left.
- [ ] **Step 4: Run** and confirm the new cases fail.
- [ ] **Step 5: Implement.** Keep every motion's code as you find it. The changes are: where `ellipsoid` comes from, the guard, input arriving as actions, where momentum steps, the constraints read, and, under `collision: false`, a zoom's floor at the point it zooms toward. If the golden test moves, stop and explain why.
- [ ] **Step 6: Run** the tests, `npm test`, tsc, eslint, prettier.
- [ ] **Step 7: Surface and commit** with "camera: the globe controller takes a body, and every constraint has an off switch".

### Task 10: Transitions between live rigs

**Files:**

- Create: `src/camera/transition.ts`, `test/transition.test.ts`
- Modify: `FrameResolver` (`commonAncestor?`), `tableResolver`, `createFramesResolver`, `CameraLayer` (`transition`, `running`, the root rule, `rig`), the core entry point, the frames entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 3, 5 and 6; 5b's `held`.
- Produces (author's calls 38 to 40):
  - `FrameResolver.commonAncestor?(a: FrameKey, b: FrameKey): FrameKey | undefined`;
  - `interface TargetPose { readonly position?: ArrayLike<number>; readonly direction?: ArrayLike<number>; readonly up?: ArrayLike<number>; readonly fov?: number; readonly near?: number; readonly orthographic?: Orthographic | null }`: in the target rig's position reference frame;
  - `interface TransitionOptions { readonly to: Rig; readonly pose?: TargetPose; readonly controller?: CameraController; readonly duration?: number | "auto"; readonly easing?: Easing; readonly clock?: "wall" | "scene"; readonly path?: TransitionPath; readonly blendFrame?: FrameKey; readonly interrupt?: "stop" | "handover" | "finish"; readonly focusDistance?: number; readonly onWeight?: (weight: number) => void }`. `onWeight` runs in the same step, so one animation can drive a placement's blend (5f's morph);
  - `type TransitionEnd = "arrived" | "stopped" | "handedOver" | "cancelled"`;
  - `class Transition { readonly view: View; readonly from: Rig; readonly to: Rig; readonly blendFrame: FrameKey; readonly weight: number; readonly animation: Animation<number>; readonly finished: Promise<TransitionEnd>; cancel(): void }`;
  - `CameraLayer.transition(view: View, options: TransitionOptions): Transition`, `CameraLayer.running(view: View): Transition | undefined`;
  - While one runs, `root(view)` is its blend reference frame and `rig(view)` a free rig on it. `controller(view)` is `undefined`, the source's being kept for an interruption. At the end, `setRig(view, to)`, the target's pose, and `options.controller` attached.
  - A slerp of orientation, field of view linear, `near` geometric. Straight path in this task; Task 11 adds the rest. Perspective only here; Task 16 adds the dolly.

- [ ] **Step 1: Write the failing test** (`fakeEngine`, a stub resolver with a small tree, an injected `now`, `FakeClock`):
  - the root rule: `root(view)` is the blend reference frame on every tick while it runs, and the target's position reference frame after;
  - live rigs: the target moves at 1 km of scene time per second, with the clock at 3,600×. At weight 0.5 (linear), the camera in the blend reference frame is the midpoint of both rigs evaluated at that tick's seconds, within 10⁻⁶ m;
  - a source rig that moves is tracked the same way;
  - the end: the camera equals the target's own evaluation within 10⁻⁶ m, and on a view 1,024 px tall the target's origin projects within 1 px of where that evaluation says (ruling 10); the step across the end moves by no more than the step before it, plus the target's motion;
  - orientation: a 90° turn is 45° at 0.5 within 10⁻¹²; `up` and `right` stay orthonormal; `fov` linear; `near` geometric;
  - a cut: `duration: 0`: after one update the root and pose are the target's, `finished` resolves `"arrived"`, and the view never had the blend reference frame as root if both rigs agree;
  - blend choice: a named `blendFrame` is used; `commonAncestor` is used otherwise; a resolver without it uses the source's position reference frame; two rigs on one reference frame blend there with no re-root; `tableResolver.commonAncestor`: two anchors give `world.root`, a node and its anchor give the anchor;
  - on the frames module's stubbed catalog: `commonAncestor(ITRF, MOON_ME)` is ICRF, `commonAncestor(ITRF, ITRF)` is ITRF, `commonAncestor(GCRF, ITRF)` is GCRF, and a piecewise reference frame answers by its hub;
  - refused: a free-position target in another reference frame with no `pose.position`, named; a non-finite pose, named; `clock: "scene"` with no clock on the world;
  - free parts ride along: a source with a free pose in a moving reference frame moves with it through the blend;
  - the controller: the source's detaches at the start, `options.controller` attaches at the end, and input before then doesn't reach it;
  - `onWeight` sees each tick's weight, 1 at the end;
  - Review Focus 1: the target throws `FrameUnavailableError` for 5 ticks at weight 0.4: no NaN, the pose and weight hold, `held(view)` names it, one report goes out, `finished` stays pending, and it goes on after;
  - Review Focus 2: `clock.seconds` set back an hour in a wall-clock transition: the next tick's pose is the blend at the new time. A `clock: "scene"` transition: scrubbed before its start the camera is at the source's pose; past its end it arrives once, and scrubbing back doesn't start it again;
  - Review Focus 4: `removeView`, a change of `view.world`, `setRig`, `setController` and the engine's destroy each settle `finished` as `"cancelled"`, with no later tick touching the view;
  - Review Focus 5: identical source and target poses finish with no NaN;
  - ruling 7: on a blend root 1.5 × 10¹¹ m from the anchors, the eye in the target's anchor is right within 100 µm, and a rigid point 100 m away moves under 0.01 px between two ticks of an idle camera.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** The step is the animation's setter, on `Engine.timeline`. It allocates nothing per tick. Export `commonAncestor` from `Frame`'s file for the resolver, which then has one walk.
- [ ] **Step 4: Run** the test, `npm test`, `npm run test:data` (the resolver changed), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: transitions blend two live rigs in a common reference frame, which is the view's root while they run".

### Task 11: Paths, and defaults at three levels

**Files:**

- Create: `src/camera/transitionPaths.ts`, `src/camera/transitionDefaults.ts`, `test/transitionPaths.test.ts`, `test/transitionDefaults.test.ts`
- Modify: `Transition`, `CameraLayer`, the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Task 10.
- Produces (author's calls 41, 42 and 44):
  - `type TransitionPath = "straight" | { readonly kind: "arc"; readonly center: FrameKey; readonly radius: number; readonly maximumHeight?: number } | { readonly kind: "spline"; readonly points: readonly ArrayLike<number>[] }`: points are in the blend reference frame; an arc's centre is that reference frame's origin, resolved each tick, and `radius` what height is measured from;
  - `pathPoint(path: ResolvedPath, a: ArrayLike<number>, b: ArrayLike<number>, weight: number, out: Float64Array): void`;
  - `interface TransitionDefaults { readonly duration?: number | "auto"; readonly easing?: Easing; readonly clock?: "wall" | "scene"; readonly path?: TransitionPath; readonly interrupt?: "stop" | "handover" | "finish" }`;
  - `CameraLayer.transitionDefaults: { app: TransitionDefaults; pairs: Record<string, TransitionDefaults> }`;
  - `resolveTransition(call, from: string, to: string, defaults): Required<TransitionDefaults>`: the call, then `"a>b"`, `"a>*"`, `"*>b"`, then `app`, then the built-ins.

- [ ] **Step 1: Write the failing tests:**
  - `test/transitionPaths.test.ts`:
    - an arc from height h₀ = 100 m to h₁ = 1,000 km at 60° apart over radius 6,378,137 m: the ends are exact within 10⁻⁹ m; at 0.5 the height is the formula's within 10⁻⁶ m; its direction is the great circle's midpoint;
    - `maximumHeight` below both ends gives no dip: height is the linear mix;
    - the same over the Moon's radius: no Earth constant is read (a test with an arbitrary radius);
    - antipodal ends (Review Focus 5): a finite path in the plane holding the camera's right, with no NaN;
    - live: a moving centre and target stay exact at the end, each tick evaluated at that tick's seconds;
    - a spline through three points passes through each within 10⁻⁹ m at its chord-length weight; live ends; two points is a straight line;
    - easing maps time onto the path, not the path's shape: the same path under two easings visits the same points.
  - `test/transitionDefaults.test.ts`:
    - the spec's example: `pairs["globe>rideAlong"] = { duration: 3, easing: "ease-in-out" }`: a transition from a globe-controlled rig to a rig of kind `rideAlong` has `animation.duration` 3 with no call options;
    - a call overrides the pair, the pair overrides `app`, `app` overrides the built-ins; `"a>*"` and `"*>b"` work, and `"a>b"` wins over both;
    - a kind comes from `rig.kind`, else the controller's, else `"free"`;
    - `"auto"`: 0 m gives 1.2 s, 1,000 km gives 2.25 s within 0.01, and 10¹² m gives 3.5 s;
    - the table survives `JSON.parse(JSON.stringify(…))` without a function easing.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: arc and spline paths, and transition defaults per call, per pair of rig kinds and app-wide".

### Task 12: Interruption policies

**Files:**

- Create: `test/transitionInterrupt.test.ts`
- Modify: `Transition`, `CameraLayer` (dispatch, the carry), `GestureInput`

**Interfaces:**

- Consumes: Tasks 7, 10 and 11.
- Produces (author's call 43):
  - `Transition.interrupt(kind?: "stop" | "handover" | "finish"): void`, default the transition's own;
  - `CameraLayer` keeps a per-view carry (metres per second and radians per second in the root's axes), stepped before the rig, re-expressed on a change of root, busy until under 1 mm/s and 10⁻⁶ rad/s.

- [ ] **Step 1: Write the failing test:**
  - `stop` by input: at weight 0.3 the rig becomes `freeRig(from)`, at 0.7 `freeRig(to)`; the camera's world pose is unchanged within 10⁻⁶ m across it; the root is that rig's position reference frame; that rig's controller is attached and receives the press that stopped it, so the drag moves the camera at once; `finished` is `"stopped"`;
  - `stop` is the default for input (the built-in), as 1.x's `flyTo`;
  - `handover`: the camera's velocity just after equals the blend's just before within 1%; it decays to 1% in 5 × 0.4 s; a drag during it adds to it; `finished` is `"handedOver"`; the carry works on a host's object-literal controller (it needs no method); a re-root during it keeps world velocity continuous;
  - `finish`: a press and a wheel during the flight reach no controller and no `inputs` count; after arrival the next press works; a press held through the arrival starts nothing (Review Focus 3);
  - programmatic, over a running transition: under `stop`, the new one starts from the current pose, with no jump, and the old `finished` is `"stopped"`; under `finish`, the new one waits for the arrival, and a third replaces it, the second ending `"cancelled"`; under `handover`, the carry joins the new blend;
  - a drag under way when a programmatic transition starts: the controller gets `end` first (Review Focus 3);
  - a spring easing on a plain `Animation`, replaced with `velocity: old.velocity`, keeps its slope (the spec's words, on the animation core);
  - Review Focus 4: an interruption on a removed view does nothing, and `finished` is already settled.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Commit** with "camera: interruption policies: stop, handover and finish".

### Task 13: Free flight

**Files:**

- Create: `src/camera/controllers/FreeFlyController.ts`, `test/freeFlyController.test.ts`
- Modify: the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 6, 7, 9, 10 and 12.
- Produces (author's calls 22 and 29 to 32):
  - `class FreeFlyController implements CameraController`, `kind: "freeFly"`, constructed `new FreeFlyController(options?: FreeFlyOptions)`.
  - ```ts
    interface FlyBody { readonly body: Body; readonly frame: FrameKey }
    interface FreeFlyOptions {
      readonly bodies?: readonly FlyBody[]; // none: constant `speed`, no re-attaching
      readonly speed?: number; // m/s with no bodies; default 100
      readonly speedFactor?: number; // of the height, per second; default 0.5
      readonly minSpeed?: number; // m/s; default 1
      readonly rangeLimit?: number | false; // m from the nearest body's centre, or the root's origin; default false
      readonly level?: boolean; // default false
      readonly handOver?: "offer" | "auto" | "off"; // default "offer"
      readonly handOverHeight?: number; // of the maximum radius; default 0.02
      readonly onOffer?: (offer: { readonly body: Body; accept(): void }) => void;
      readonly globeController?: (body: Body) => CameraController; // default a GlobeController on it
    }
    ```
  - Actions: `look`, `zoom`, `roll`, `rollLeft`, `rollRight`, and the six flight axes.
  - `attach` returns `freeRig(rig)`. It names no body itself: the Viewer passes the list (Task 18).

- [ ] **Step 1: Write the failing test** (`fakeEngine`, a stub resolver with an Earth and a Moon on their own turning reference frames 384,400 km apart, injected `now`):
  - the six axes: each held key moves along the camera's own axis, with position changing and orientation not;
  - no bodies: 1 s of `flyForward` moves `speed` metres within 2%, with no pick and no body read;
  - speed: from a height h₀ of 1,000 km, 1 s moves to h₀ · e^(−0.5) within 2% at 60 Hz; near the surface, at least `minSpeed`; it goes through the surface with no stop, and the height is negative after (no constraint but the range limit);
  - look and roll: `look` turns with position fixed; flying over the pole has no gimbal flip; `rollLeft` changes `up` only;
  - level: rolled 30°, `level: true` is under 1° after 5 s, with direction unchanged within 10⁻⁹ rad; off, it stays;
  - `rangeLimit`: stops at it; `false`: doesn't;
  - re-attach: flying from near the Earth to the Moon, the root changes from the Earth's reference frame to the Moon's at the boundary of call 30, and a rigid point's pixel moves under 10⁻³ px across that tick beyond what the flight itself moved it; hovering across the boundary changes it once (the 0.8 hysteresis);
  - the hand-over: below 0.02 R, `onOffer` is called once; `accept()` starts a transition that ends with a `GlobeController` on that body and the root on its reference frame, with no step larger than the transition's own; no second offer until above 0.03 R; `auto` starts at once; `off` never;
  - Review Focus 1: a body's reference frame that throws `FrameUnavailableError` is skipped for that tick, with one report, and flight goes on.
  - orthographic: ignored, warned once (joins after Task 14, `it.todo` here).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** Height uses the body's ellipsoid through `cartesianToCartographic`, in that body's reference frame. Work per tick is one resolve per body, and none while idle.
- [ ] **Step 4: Run** the test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: free flight, with speed by height, re-attaching to the nearest body, and an offered hand-over".

### Task 14: The orthographic camera, on the CPU

**Files:**

- Create: `test/orthographic.test.ts`
- Modify: `Camera` (`orthographic`, `lens`, `metresPerPixel`, `rayOrigin`, `rayDirection`, `projection`, `frustumPlanes`, `copyFrom`), `projectToPixel`, `View.anchorCamera`, `View.setCameraFromAnchor`, `View`'s `project`, `m4` (`orthographicReverseZ`), `depthDistance`, `alongRay`, `PickCamera`, `PickTick`, `PendingCamera`, `corePick`, `pickInterpreter`, the engineering `pick` and `snap`, `Engine`'s selection views, `writeLights`, `positionCamera`, `pickTick`, `Stepwise`, `GlobeStepwise`, `Budgeted`, `GlobeBudgeted`, `isScaledSpacePointVisible`'s callers, `fitCascades`, `packViewLights`, `ViewLink.groundPoint`, `OrbitController` (its wheel scales `height`), the globe and free-fly guards, the seams test, the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: nothing of 5d's but the guard names.
- Produces (author's calls 33 to 35):
  - `interface Orthographic { readonly height: number; readonly far?: number }`; `Camera.orthographic: Orthographic | undefined`, setting it bumps `version`, and refuses a height that isn't positive and finite, naming it (Review Focus 5);
  - `Camera.lens(aspect: number): Lens`, `interface Lens { readonly orthographic: boolean; readonly tanX: number; readonly tanY: number; readonly halfX: number; readonly halfY: number }`: a perspective lens's `half` are 0, an orthographic lens's `tan` are 0;
  - `Camera.far(): number`; `Camera.metresPerPixel(distance: number, pixelHeight: number, aspect: number): number`; `Camera.rayOrigin(ndcX, ndcY, aspect, out: Vec3): Vec3`;
  - `m4.orthographicReverseZ(out, halfX, halfY, near, far)`;
  - `isScaledSpacePointVisibleParallel(direction, occludee, minimumHeight)`, beside the existing test, for an eye at infinity;
  - `SelectionView.orthographicHeight?: number`: with it, a tile's screen-space error is `error × height / orthographicHeight`, at every distance;
  - `depthDistance` takes `{ near, far? }`: with `far`, distance is `far − depth × (far − near)`; underlay scaling as today;
  - `PickCamera` keeps `fovy` for hosts and gains `orthographicHeight?`; the tolerance sites read `pickMetresPerPixel(camera, distance)`.
  - A new seam in `test/seams.test.ts`: `.fovy` is read only in `Camera`'s file and where a `PickCamera` is built, naming the line otherwise (author's call 34). `Camera.fovy` stays for hosts, and in an orthographic view returns the narrowest dolly field of view.

- [ ] **Step 1: Write the failing test** (`test/orthographic.test.ts`):
  - the matrix: at `halfX` 500, `halfY` 250, `near` 1, `far` 1,001: a point at distance 1 maps to z = 1, at 1,001 to z = 0, at 501 to 0.5; x = 500 maps to 1; w is 1;
  - planes: side planes have normals ±right, ±up and `d` of the half extents; a sphere just outside is culled by `inFrustum`'s formula, and one touching isn't;
  - rays: the same `direction` at every pixel; `rayOrigin` differs by `ndcX × halfX × right + ndcY × halfY × up`;
  - round trip: `projectToPixel` of `alongRay` returns the pixel within 10⁻⁶ px at any depth, and a pixel doesn't depend on depth;
  - `metresPerPixel`: height 2,000 m on 1,024 px is 1.953125 m at any distance;
  - screen-space error: 16 m of error, 1,024 px, height 2,048 m is 8, at 1 km and at 10,000 km, in `Stepwise` and `GlobeStepwise`; the same selection results at both distances on the stubbed tileset harness;
  - fog off in an orthographic selection view;
  - the horizon: a point on the far side is hidden, a near-limb point visible; 1,000 sampled points agree with the perspective test from an eye 10⁹ radii out along −direction;
  - depth: `depthDistance` at near, far and the middle, within 10⁻⁶ m; underlay scaling holds;
  - picks: `corePick` at a pixel gives the point that projects there, and its `camera` carries the lens; pick tolerance in `pickInterpreter` is `metresPerPixel`;
  - copies: `copyFrom`, `anchorCamera`, `setCameraFromAnchor` and a re-root keep `orthographic`;
  - cascades: every cascade's sphere contains its slice's 8 corners;
  - lights: `packViewLights` writes a one-cell grid, and a light outside the extents is dropped;
  - `ViewLink`'s ground point works from `rayOrigin`;
  - a perspective camera's `projection`, `frustumPlanes`, `rayDirection`, `projectToPixel`, and a selection view's numbers are exactly today's (numbers recorded in the test before the change);
  - the seam test: a `.fovy` read planted in a fixture fails naming its line;
  - Review Focus 5: a viewport 0 px tall: `lens` at an aspect that isn't positive and finite answers as for an aspect of 1, so no plane is NaN; an orthographic height of 0 or NaN is refused, named.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** Every `.fovy` read moves to `lens`, `metresPerPixel` or `pickMetresPerPixel`. Resolve Tasks 8, 9 and 13's `it.todo`s here.
- [ ] **Step 4: Run** the test, `npm test`, `npm run test:data` (`pickInterpreter`), tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: the orthographic camera: picking, culling, horizon culling and screen-space error in their orthographic forms".

### Task 15: The orthographic camera, on the GPU

A browser check (port 5191, author's call 47).

**Files:**

- Create: `spikes/controllers.html`, `spikes/controllers.ts`, `test/orthographicView.test.ts`
- Modify: `writeView`, `Engine`'s ambient occlusion and depth range steps, `Sky.write`, `surface.slang`, `common.slang`, `depthRange.slang`, the view block's `time` lane, generated shaders

**Interfaces:**

- Consumes: Task 14.
- Produces (author's calls 35 and 36):
  - `View.time`'s z lane is 1 in an orthographic view, and the block keeps its size;
  - the surface shader's view vector is the camera's −forward there, and `-normalize(relPosition)` otherwise;
  - `depthRange`'s parameters carry `far` (0 in perspective): distance is `far − d × (far − near)` when set;
  - `frame.ambient` is false in an orthographic view;
  - `Sky.write` reads `camera.lens`, and in an orthographic view gives the sky the narrowest dolly's tangents.

- [ ] **Step 1: Write the failing Node test** (`fakeEngine`): the view block's `time[2]` is 1 only when orthographic; a perspective view's block is byte-for-byte today's; `frame.ambient` is false; the depth range's parameters; the sky's `tanY` equals tan(0.05°), positive and finite.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** `npm run shaders`. Read the Metal of each changed entry with `node scripts/dumpMsl.mjs`.
- [ ] **Step 4: Run** the test, `npm run shaders:check`, tsc, eslint, prettier, `npm test`.
- [ ] **Step 5: Browser check.** `spikes/controllers.html`, group `orthographic`: two equal boxes at different depths under a top view draw the same size within 1 px; nearer occludes farther; a pick round-trips within 1 mm at a 1 km view; a light's and a shadow's presence read from the image; the sky has no NaN (no magenta probe pixel); the console is clean. Then `parity` and `alloc` against the base commit, one at a time. Explain any one-ulp row. Record the metrics in the commit message. Stop the server.
- [ ] **Step 6: Commit** with "render: orthographic views: the view vector, depth range and sky; ambient occlusion off for now".

### Task 16: `fitBounds`, and the dolly between projections

**Files:**

- Create: `test/fitBounds.test.ts`, `test/transitionDolly.test.ts`
- Modify: `Camera`, `Transition`, the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 10 and 14.
- Produces (author's call 37):
  - `type Bounds = { readonly center: ArrayLike<number>; readonly radius: number } | { readonly min: ArrayLike<number>; readonly max: ArrayLike<number> }`;
  - `Camera.fitBounds(bounds: Bounds, options: { readonly aspect: number; readonly margin?: number }): this`: keeps the direction, moves the camera back along it, and in orthographic sets `height` and `far`. Default `margin` 1.1. What to fit is the application's;
  - `fitPose(camera: Camera, bounds: Bounds, options): TargetPose`, the same as a pose, for a transition;
  - A transition between projections: in perspective to the end that has orthographic, with tan(fov/2) geometric toward tan(0.05°) and the camera backing along its view so the focus plane's scale holds; the projection switches at that end. `focusDistance` defaults to the distance to the target's aim, else to the orthographic pose's position along the view.

- [ ] **Step 1: Write the failing tests:**
  - `test/fitBounds.test.ts`: a sphere fits within the view on a wide and a narrow aspect, touching within 1% of `margin` in the tighter direction; a box's 8 corners project inside; orthographic sets `height` and `far` so nothing is clipped; a radius of 0 uses 1 m; empty or non-finite bounds throw, naming them (Review Focus 5); direction and up are unchanged.
  - `test/transitionDolly.test.ts`:
    - perspective to orthographic, one pose: a point on the focus plane stays within 0.01 px on every tick; the camera backs away as the formula says;
    - at the switch, on a square view 1,024 px tall, a point one view height off the focus plane moves under 1 px (call 37's claim);
    - the end: `camera.orthographic.height` is the target's;
    - orthographic to perspective mirrors it: the switch comes first, at the narrowest field of view;
    - orthographic to orthographic: `height` is geometric, with no dolly;
    - with a moving target, the root rule from Task 10 holds;
    - screen-space error is continuous across the dolly (the product `distance × 2 tan(fov/2)` holds within 1%).
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, tsc, eslint, prettier, `npm test`.
- [ ] **Step 5: Surface and commit** with "camera: fitBounds, and a field-of-view dolly between perspective and orthographic".

### Task 17: The CAD-style controller

**Files:**

- Create: `src/camera/controllers/CadController.ts`, `test/cadController.test.ts`
- Modify: the core entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 3, 6, 7, 14 and 16; 5c's `CorePick`.
- Produces (author's calls 20 and 46):
  - `class CadController implements CameraController`, `kind: "cad"`, constructed `new CadController(options?: CadControllerOptions)`;
  - `interface CadControllerOptions { readonly fit?: () => Bounds | undefined; readonly minDistance?: number | false; readonly viewSeconds?: number }`: `fit` is what "fit the selection" fits, the application's; `minDistance` default 0.01 m; `viewSeconds` default 0.6;
  - `attach` returns `freeRig(rig)`. Actions: `orbit` (about the point under the cursor, from `context.pick`; until it answers, the point on the view axis at the last focus depth), `pan`, `zoom` (to the cursor), `fitSelection`, `viewTop`, `viewFront`, `viewSide`, `viewIsometric`;
  - The standard views, in the axes of the rig's `reference` (else the position reference frame's), Z up: top looks along −Z with up +Y; front looks along +Y with up +Z; side looks along −X with up +Z; isometric looks along (−1, 1, −1)/√3 with up +Z.

- [ ] **Step 1: Write the failing test,** with `describe.each(["perspective", "orthographic"])`, in render space with no frames module, and on a stub reference frame turned 30° from the root:
  - orbit about a picked point: its pixel holds within 10⁻⁶ px over a drag, off the view's centre; a late pick changes the pivot with no jump; a pick that answers `undefined` uses the depth plane; no surface is needed to start;
  - pan: the point under the cursor follows it within 10⁻⁶ px (at the pivot's depth in perspective, at any depth in orthographic);
  - zoom: the point under the cursor holds its pixel within 10⁻⁶ px. In orthographic, `height` scales and the camera pans. In perspective, it stops at `minDistance`, or passes with `false`;
  - `fitSelection`: `fit`'s box's 8 corners are in view after the action, and with no `fit`, or `fit` returning `undefined`, nothing happens and nothing throws;
  - each standard view: at the end, direction and up within 10⁻¹² in the rig's axes, and the distance to the focus unchanged within 10⁻⁹ m; a mid-way tick is neither end (it animates), with the distance held; any action stops it where it is;
  - the `cad` preset: `drag:middle` orbits, `shift+drag:middle` pans, and the wheel zooms to the cursor;
  - the `default` preset works too (`drag:left` orbits, `shift+drag:left` pans);
  - no constraint but `minDistance`.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "camera: a CAD-style controller: orbit about the point under the cursor, pan, zoom to the cursor, standard views".

### Task 18: The Viewer's defaults on the new seam

**Files:**

- Create: `widgets/cachedSurfaceHeight.ts`, `test/viewerControls.test.ts`, `test/cachedSurfaceHeight.test.ts`
- Modify: `Viewer` (construction, `setControls`, `controls`, the tick listener, `secondController`, `orbit` paths, `dispose`), `orbitFocus`, the widgets entry point, `api/surface.txt`

**Interfaces:**

- Consumes: Tasks 7 to 17; 5c's `Viewer.moon`, `zoomTo`, `setSplit`, `sampleHeightMostDetailed`.
- Produces (author's calls 23, 28 and 45):
  - `Viewer.input: GestureInput`; `ViewerOptions.bindings?: BindingMap | "default" | "cad"`;
  - `Viewer.setControls(mode: "globe" | "orbit" | "freeFly" | "cad", options?: OrbitOptions | FreeFlyOptions | CadControllerOptions): void`; `Viewer.controls` widens to match;
  - `Viewer.flyTo(options: TransitionOptions): Transition`, on its main view. Its default path is an `arc` over the view's body when both ends are on it, and `straight` otherwise;
  - With `freeFly`, `bodies` defaults to the Earth on `viewer.frames.bodyFixed(EARTH)`, and the Moon when `viewer.moon` is set;
  - The globe controller's `surfaceHeight` follows the view's body: terrain's on the Earth, `cachedSurfaceHeight` over `sampleHeightMostDetailed` on the Moon when it has a surface tileset;
  - `cachedSurfaceHeight(sample: (longitude: number, latitude: number) => Promise<number | undefined>, options?: { readonly cellRadians?: number; readonly minimumIntervalMs?: number }): (longitude: number, latitude: number) => number | undefined`;
  - Reduced motion sets `cameras.transitionDefaults.app.duration` to 0.
  - `cameras.rig(view) === ownRig` stays true under the globe controls, on which `useFrames` relies.

- [ ] **Step 1: Write the failing tests:**
  - `test/viewerControls.test.ts` (`fakeEngine`, as `test/viewerFrameData.test.ts`):
    - unchanged gestures, a table of scripted events on the default Viewer: left drag grabs, right drag zooms, middle and ctrl tilt, shift looks; on `setControls("orbit")`: left rotates, right and shift pan, wheel zooms; `onOrbitChange`, `orbitPivot` and `orbitDragging` as before;
    - `zoomTo` while orbiting still follows (`followZoom`), and `inputs` still lets `zoomTo` see someone took over;
    - `setControls("freeFly")` gives both bodies when `moon` is set and only the Earth when `moon: false`; keys work once the canvas has focus, and the canvas has `tabindex`;
    - `setControls("cad")` on a rig in render space works with the frames module left out;
    - `bindings: "cad"` and merged overrides reach the input;
    - a view on the Moon gets a globe controller on the Moon, with `cachedSurfaceHeight`, and no height request on the Earth's terrain;
    - reduced motion (a stubbed `matchMedia`): `flyTo` arrives in one update;
    - `dispose` leaves no listener and no controller;
    - a second view (`setSplit`) has its own input and controller;
    - a globe-only Viewer loads nothing new (`test/libraryWidgets.test.ts` and `npm run check:bundle` pass; record the size).
  - `test/cachedSurfaceHeight.test.ts`: `undefined` until a sample answers, then the value; one sample in flight at a time; at most one per interval (fake timers); a rejected sample gives `undefined` and doesn't stick; a cell is reused.
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, `npm test`, `npm run check:bundle`, tsc, eslint, prettier.
- [ ] **Step 5: Surface and commit** with "widgets: the Viewer's controls, gestures and flights on the camera layer".

### Task 19: The frames explorer on rigs and controllers

A browser check (port 5192).

**Files:**

- Modify: the explorer's `cameraRig.ts`, `orbit.ts`, its globe's `flyTo` and `animate`, its page wiring, its orbit test
- Create: `test/framesExplorerShrink.test.ts`

**Interfaces:**

- Consumes: Tasks 8, 10 to 12 and 18.
- Produces:
  - `cameraRig.ts` keeps its `CameraRig` interface (`show`, `leaveOrbit`, `ask`, `frameIfStill`, `dispose`), minus `follow`. It makes one `viewer.flyTo` per `show`, with a `to` rig, an `OrbitController` with `pivot` and `frame` from the view's subject, and `interrupt: "stop"`.
  - `orbit.ts` keeps configuration: `frameRig`, `AXES_RIG`, `SITE_RIG`, `rangeLimits`, `lunarSiteRange`, `frameTarget`, `isFrameKey`, `pivotPlacement`. `CameraFlow`, `followRig`, `landedLimits` and `rigFraming`'s math go; the controller owns them.
  - The rig stays on ITRF, so the page's overlays stay Earth-fixed. A subject's motion comes through the pivot's and up's reference frames. Durations pass through `"auto"` unless a view names `seconds`.

- [ ] **Step 1: Write the failing test** (`test/framesExplorerShrink.test.ts`, reading the source): neither file imports `orbitBasis`, `orbitPose`, `Camera` or a math module; neither calls `onTick` or `requestAnimationFrame`; `cameraRig.ts` is under 120 lines and `orbit.ts` under 220 (the spec's "shrink to configuration", as numbers). Then move `framesExplorerOrbit.test.ts`'s "following the clock", "handing a flight over" and landed-limit groups: their assertions now run against `OrbitController` and `Transition` in `test/orbitController.test.ts` and `test/transitionInterrupt.test.ts`, values unchanged.
- [ ] **Step 2: Run** and confirm the new test fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, every `framesExplorer*` test, `npm test`, tsc, eslint, prettier.
- [ ] **Step 5: Browser check.** The frames explorer: each scenario's camera moves; a drag and a wheel during a flight take over where it is, with no jump; the earth-turns view at 3,600× orbits with the subject; a drag in space works without grabbing the Earth (the owner's original complaint); reduced motion cuts; both themes, 1440 px and 380 px; a clean console. Stop the server. Record in the commit message what reaches past the public API, for 5i.
- [ ] **Step 6: Commit** with "frames explorer: its camera rig and orbit shrink to configuration over rigs, controllers and transitions".

### Task 20: The done-when checks, and what 5f and 5g stand on

A browser check (port 5193).

**Files:**

- Create: `test/controllersMatrix.test.ts`, `test/data/transitionOrion.test.ts`, `test/replayServed.test.ts`
- Modify: `spikes/controllers.ts`

**Interfaces:**

- Consumes: everything above, with 5b's presets and piecewise reference frames, and 5c's Moon.
- Produces: nothing new. A gap found here is fixed in the task that owns the code.

- [ ] **Step 1: Write the failing or passing tests.** Any that pass at once were already earned; any that fail are fixed where the code lives.
  - `test/controllersMatrix.test.ts`: `describe.each` over `GlobeController`, `OrbitController`, `FreeFlyController`, `CadController`, by three settings: on the Earth (frames resolver on the stubbed catalog, rig on ITRF), on the Moon (rig on MOON_ME, a view with `body: MOON`), and in render space without the frames module (table resolver, default rig; a globe on `EARTH`'s anchor there). Each: synthetic pointer, wheel, touch and key events under the `default` map, each bound action moving the camera or skipped as listed, no NaN, no thrown error, and `camera.version` moving only when the camera did. The `default` map binds to each.
  - `test/data/transitionOrion.test.ts` (the store; `FRAMES_DATA=1`): the Artemis II trajectory in the catalog, `Clock` at 3,600× on an injected clock: a transition from a rig on ITRF to an orbit rig on Orion. `root(view)` is the blend reference frame throughout and Orion's after; at the end Orion's origin projects within 1 px of the rig's own answer at 1,024 px (ruling 10); it holds for a scene-clock transition too. Then `rigPreset("orbital", …)` as the target.
  - Free flight from the Earth to the Moon on the catalog (`test/controllersMatrix.test.ts`, stubbed data): the root goes from ITRF to MOON_ME, with a rigid point's pixel moving under 10⁻³ px at the change beyond the flight's own motion.
  - `test/replayServed.test.ts`, what 5g and 5f need, on an injected clock:
    - a wall-clock ramp eases the logarithm of `clock.rate` from 1 to 20,000 over 2 s, 141.4 at the midpoint within 0.1, while a scene-clock node animation follows the clock;
    - moving the camera (a drag) stops a running transition and leaves the clock's ramp running; touching the clock leaves the transition running;
    - a scene-clock node animation scrubbed backward across its start shows the earlier state;
    - a table of rig and controller per reference frame (§14.4): a stage's body-fixed frame with an orbit, ITRF and MOON_ME with their globe controls, GCRF with an orbit and reference up +Z and no preset (ruling 8), each reached by a transition, with `root` and `rig` right on the next tick;
    - a rig on a piecewise reference frame across its change: no jump, and across its end `held(view)` says so;
    - a named `blendFrame` with `onWeight` driving a `placementBlendSetter` (5f's morph): `t` follows the weight on every tick and is exactly 1 at the end, and the root is the named reference frame until then.
- [ ] **Step 2: Run** them. Fix each failure where the code lives, with that task's test added.
- [ ] **Step 3: Browser check.** `spikes/controllers.html` gains groups `flight` (a transition on a rig that follows a moving node, its target's pixel read from the image within 1 px at the end) and `controllers` (each controller, by synthetic events on the real canvas, moves the view with a clean console). One group at a time. Stop the server.
- [ ] **Step 4: Run** `npm test`, `npm run test:data`, tsc, eslint, prettier.
- [ ] **Step 5: Commit** with "camera: the done-when checks: every controller on each body, a flight to Orion at 3,600×, and free flight to the Moon".

### Task 21: Docs, the plan note, the final gates and Snyk

**Files:**

- Create: `test/cameraDocs.test.ts`
- Modify: the package's README, the handbook's `cameras` tab, the overall plan's §13.14

- [ ] **Step 1: Write the failing test** (`test/cameraDocs.test.ts`): every value export `api/surface.txt` lists from `src/animation` and `src/camera` (by a list in the test) is named in the README, and the handbook's `cameras` tab has a "checked" date no older than this task's. It fails until Step 2.
- [ ] **Step 2: README and handbook.** Document the animation core (clocks, easing, samplers, `Timeline.bind`), setters, per-node transforms, rig kinds and damping and references, the controller seam, each controller's actions and constraints, bindings with their grammar and presets, transitions with their paths, defaults and interruptions, the orthographic camera and what is off in it, `fitBounds`. Update the handbook's `cameras` tab in the same change: prose, "checked" date, status. Keep it to generic words.
- [ ] **Step 3: Plan note** in §13.14, "Frames 5d results": the measured values, the author's calls and rulings one line each, and a "Carried forward from frames plan 5d" list of real deferred work, without nits, written before the ledger is deleted. It includes: ambient occlusion and the light grid in orthographic views; a moving clamped model's path; the design globe's flights moving to transitions (5f); the note for 5g's table on GCRF (ruling 8); and for 5i: `Timeline.bind`'s name, `InspectController`'s rename, the controllers' folder, and what examples reach past the public API.
- [ ] **Step 4: Gates:**
  - `npx tsc --noEmit -p .`, `npx tsc --noEmit -p tsconfig.lib.json`, `npx eslint .`, `npx prettier --check .`;
  - `npm test`, `npm run test:data`;
  - `npm run build`, `npm run build:lib`, `npm run check:bundle`, `npm run shaders:check`;
  - the parity pages and the bench gate against the base commit, one suite at a time, on port 5194;
  - `snyk_code_scan` on `src/animation`, `src/camera`, `src/scene/animationSetters.ts`, `widgets/cachedSurfaceHeight.ts`, the Viewer's files and `spikes/controllers.ts`. Fix new findings and rescan until clean. Record the findings that predate this plan.
- [ ] **Step 5: Commit** the docs and the test with "Plan: frames 5d results".

---

## Self-review

- **Spec coverage.** 11.2: not camera-specific, timing and playback, `finished` (Task 3); easing (1); glTF samplers (2); per-animation clock, scrubbing, one timeline, awake rules (3); setters (4). 11.3: constraints with off switches (8, 9, 13, 17); policies over the rig (6); free flight, its speed, re-attach, hand-over, level (13); CAD with standard views and `fitBounds` (16, 17); full replacement (6); any body (9, 20); orbit with no pick (8); rolled reference frames (5, 8); damping (5); orthographic with its forms (14, 15). 11.4: actions, the serializable map, presets, custom actions, grammar, refusal, skipping (7). 11.5: configurable timing, live blend, cut (10); paths (11); interruption (12); three levels (11); blend reference frame (10); slerp and field of view (10); the dolly (16); the end (10); per-node transforms (4). 11.6: injected clocks (3 and throughout); every controller by synthetic input on three settings (20); Orion at 3,600× (20); free flight (13, 20); the explorer (19).
- **For later sub-plans.** 5f: a named `blendFrame`, `onWeight`, `placementBlendSetter`, the CAD and globe controllers at each end, `Camera.orthographic` and the dolly. 5g: wall and scene clocks side by side, per-node transforms, transitions as the directors' moves, `running`, `held`, separate stops for camera and clock, the table of rig and controller per reference frame.
- **Type consistency.** `RigReference`, `RigDamping`, `freeRig`, `RigPose`, `evaluateRig` (Task 5); `ActionEvent`, `ControllerContext`, `CameraController` (6); `BindingMap`, `GestureInput`, `BINDING_PRESETS`, `STANDARD_ACTIONS` (7); `TargetPose`, `TransitionOptions`, `Transition`, `TransitionEnd` (10); `TransitionPath`, `TransitionDefaults` (11); `FlyBody`, `FreeFlyOptions` (13); `Orthographic`, `Lens` (14); `Bounds`, `fitPose` (16); `CadControllerOptions` (17).
- **Review Focus.** Each line's test sits in its owning task's Step 1 and is marked there.
- **Proportion.** The plan decides names, values and tests. It gives no bodies except the formulas the spec leaves open.

## Questions for the owner

Most important first. Each has the default the plan follows. The owner took all four defaults on 2026-11-08, to be tweaked after trying them.

1. **§13.29 says Entity's uses are covered by "the bindings of 5d", and section 11.4's bindings are gesture maps.** Did you mean values bound to time? *Default:* yes: `Timeline.bind` plus setters, with the names provisional for the vector design and 5i (ruling 1).
2. **Renaming `InspectController` to `OrbitController` now, ahead of 5i, and dropping the old proof-of-concept of that name.** Fine to do it here, or should the names wait for the API review? *Default:* rename now (call 18).
3. **What "offers" means for free flight near a body.** The plan calls an application's `onOffer`, and shows nothing itself. Should the Viewer take the hand-over automatically or show a prompt? *Default:* the Viewer leaves it at `"offer"`, with no prompt, so near a body the camera stays in free flight until the application accepts (call 31).
4. **One gesture set against today's orbit pages.** Under the one `default` map, a right drag zooms everywhere, but in the Viewer's orbit mode it pans today. *Default:* the Viewer keeps panning there through an override (call 28). Say if you'd rather have the one set.
