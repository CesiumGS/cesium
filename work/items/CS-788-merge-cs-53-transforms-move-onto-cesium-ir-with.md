---
id: CS-788
title: Merge CS-53, transforms move onto Cesium IR, with its browser parity bullet not showable today
kind: decision
state: done
created: 2026-11-21
project: CS-10
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the transform and IR tests, fast-forwards main, regenerates the views, runs the cold-start check on main and logs the merge. CS-53 closes; the chief of staff files the parity page and the center-constants measure; CS-49 and CS-54 can start."
answered_at: 2026-11-21T16:04:46.372Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-53, which moves every transform pass (evaluate, autodiff, intervals, kinks, Taylor bounds, the emitters and the compiler) onto Cesium IR and deletes today's ir.ts and its adapter, as pure moves checked against golden fixtures, into main? Its done-when asks for browser parity with no pixel change, but no suite draws through a compiled transform today, so that bullet can't be shown yet.

Golden fixtures were committed alone before anything moved: 28 cases, the 24 built-ins, 3 nested routes and the corridor over the 39-line road in exact, linear, auto and no-normals modes. After every switch, evaluator outputs, Jacobians, Hessians, parameter derivatives, intervals, kink flags, Taylor bounds, per-draw records, uniforms and layouts are bit for bit the same. Listings are equal up to renumbering and compiled WGSL up to let/var renumbering; against a dump of the base, 296 of 338 WGSL texts are byte for byte, and the other 42 (exact-normal routes and modes) differ only in `d<n>`/`e<n>` names because Cesium IR's autodiff writes one equation more or less, explained in two commits. Every built-in's parsed program emits byte-for-byte the base's WGSL. The plan's stated semantic change is in, with a test: clamp, saturate, mix and smoothStep follow KHR_interactivity for reversed bounds and edges; no built-in uses them. Browser parity: no Lab parity suite, image check or catalog scene draws through a compiled route (routes compile only for content under a curvilinear map, and no suite places any), so none could show a pixel change; the executor ran none, and the orchestrator checked that the camera's imports of src/transform are type-only and that per-draw center constants run only in src/scene/world/routes.ts. Two follow-ups for the chief of staff to file under CS-10: a Lab parity page that draws through a compiled curvilinear route (exaggeration or UTM, exact and linear normals), so CS-54, CS-56 and later IR items can be checked in pixels; and a measure of per-draw center constants, since the CPU evaluator is now Cesium IR's generic one in place of today's Float64Array loop. Removed with the adapter: CS-50's parity shims and tests, which mocked modules that now run on Cesium IR themselves, so the suite has fewer tests. Outside its touches: the core-ir spike's front end and benches, and two sentences in the handbook's transform graph tab. Nothing public changes (api/surface.txt unchanged). Checked by hand on main d8a9a567ec (tested cc5cefc071): both type checks, hitld work check (785 files), surface, npm test exit 0 (376 files, 6,159 passed, no unhandled errors), test:data exit 0, shaders:check (45 up to date); no CSS. Your cold-start check (CS-715) passed at the tested commit on AC power: median first frame 1,335 ms without the board (run 2026-11-21T09-10-26-806Z-mac-apple). Presentation: orch-11-merge-ready-CS-53.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the transform and IR tests, fast-forwards main, regenerates the views, runs the cold-start check on main and logs the merge. CS-53 closes; the chief of staff files the parity page and the center-constants measure; CS-49 and CS-54 can start.
- B. Hold it: Nothing merges until a parity page that draws through a compiled route exists and shows no change; CS-49 and CS-54 wait.

Recommended: Merge it. The golden fixtures pin every number bit for bit and every WGSL text up to names, the cold start is within budget, and the one bullet it can't show has no scene to show it on yet.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
