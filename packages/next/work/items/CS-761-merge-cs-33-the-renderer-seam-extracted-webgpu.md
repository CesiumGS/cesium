---
id: CS-761
title: Merge CS-33, the renderer seam extracted (WebGPU only, pure moves)
kind: decision
state: planned
created: 2026-11-20
project: CS-9
decider: owner
---

## Question

Merge CS-33, which extracts the seam between the engine and its renderer (WorldDraws, RenderDevice, WorldMirror, ViewRenderer) as pure moves, with WebGPU still the only device, into main?

The world's draw data now lives on the CPU in the scene tier (World.draws, CpuTable with a change log), and the WebGPU device keeps its copy (WebGpuWorldMirror) and its renderers (WebGpuViewRenderer, one per view) behind interfaces in src/scene/renderSeam.ts. The engine's one value edge into the renderer is src/render/webgpuDevice.ts, where CS-35 adds the device choice. The import-boundary test gains a webgl2 tier and names every edge from Engine, World and View into src/render or src/gpu. Nothing public changes (api/surface.txt unchanged); shaders unchanged. Browser parity against the base, run twice there and once on the branch: baseline, parity, models, tileset, selection, globe, translucency and indirect are identical in every field but timing; imagery varies run to run on the base too, and the branch's values all occur in base runs. lod and instances fail the same way on the base (lod is CS-568; instances needs a new item). Outside its touches: tests that pin moved fields, and two spikes. Checked by hand on main 032cba8767 (tested aab4eaced7): both type checks, hitld work check (758 files), surface (no API change), npm test exit 0 (5,828 passed, no unhandled errors), test:data exit 0, shaders:check (45 up to date); no CSS touched. Presentation: orch-11-merge-ready-CS-33.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; CS-23 (Engine and View) and CS-430 are set up from it as slots free, with CS-34 and CS-35 beside CS-23.
- B. Hold it: Nothing merges; the engine keeps reaching GPU state directly, and CS-23, CS-34, CS-35 and CS-430 wait.

Recommended: Merge it. Every gate passes on main's tip, parity is unchanged against the base, and it unblocks the second device's work.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
