---
id: CS-789
title: Merge CS-35, the probe, the renderer option and an empty WebGL 2 device
kind: decision
state: planned
created: 2026-11-21
project: CS-9
decider: owner
---

## Question

Merge CS-35, which adds the renderer option ('auto', 'webgpu' or 'webgl2', default 'auto') and the device choice, the WebGL 2 probe on both threads, the webgl2-basic and webgl2-chrome personas with emulate, WebGL 2 support rules, and an empty WebGL 2 device that clears and refuses content until CS-36, into main? It adds public API: EngineOptions.renderer, EngineOptions.emulate and the type RendererOption.

emulate: 'webgl2-basic' makes an engine that clears to the view's color; tested in Node with a fake WebGL 2 (clear color, per-view scissor, resize every tick, loss reported once, picks resolve undefined) and on a probe page in Chrome on this Mac, where the inspector reads 'WebGL 2 · emulating webgl2-basic' and the probe agrees between the page and a worker. Below the floor, Engine.create rejects naming what's missing, for example 'WebGL 2 lacks the extension EXT_color_buffer_float (float and half-float render targets (HDR color))'. The empty device refuses content with one message: 'The WebGL 2 renderer draws no content yet (CS-36), so it can't take geometry' (or a texture, a sampler, a texture binding, imagery); it's a plain Error, not a CapacityError, so streaming doesn't retry it, and a world and its view still clear. Support rules say what WebGL 2 can't do (glare, city lights, exact translucency). The WebGL 2 tier is its own lazy chunk (6.8 KB), and nothing of it is in the main chunk: the bundle check now asserts that. WebGPU parity: parity identical, baseline the same shape and API calls. The engine's two module-level reads of GPUBufferUsage and GPUTextureUsage became lazy, with a guard test, so a browser without WebGPU can load the engine and fall back. Outside its touches (it used src/webgl2/, the boundary test's tier): the device choice in src/scene/deviceChoice.ts, World, Slabs, renderSeam, renderTarget and a headless context in src/scene, src/profile's rules, the widgets' engine and inspector, the protocol rows, src/index.ts, the bundle check, the API map, and a probe page under bench/. On the first replay, CS-34's new WorldMirror members made it fail to type-check; the executor rebased and chose that the empty device refuses content (above). Checked by hand on main 0429543e1c (tested 1343ac9961): both type checks, hitld work check, surface (+RendererOption), npm test exit 0 (381 files, 6,518 passed, no unhandled errors), test:data exit 0, shaders:check (45 up to date), the bundle check; no CSS. Your cold-start check (CS-715) passed at the tested commit on AC power: median first frame 1,276 ms without the board (run 2026-11-21T09-28-46-900Z-mac-apple). Three questions for you, not part of this merge: (1) Which real devices run the probe page (bench/webgl2Probe.html)? The plan wants an iPhone on iOS 18, an Android phone with a Mali or Xclipse GPU, and Firefox on Linux or an Intel Mac; each page's copied report is what the webgl2-firefox, -apple-mobile and -android personas are written from. (2) Safari on this Mac is unchecked: the session can't drive it, so someone should open the page there once. (3) The API shape: the plan names renderer and emulate; the exact type of emulate (the WebGL 2 persona names) and exporting only RendererOption are the executor's choices. Presentation: orch-11-merge-ready-CS-35.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the WebGL 2, boundary and protocol tests, fast-forwards main, regenerates the views, runs the cold-start check on main and logs the merge; CS-780, CS-763, CS-764 and CS-507 can then start, CS-780 from a base with this in it.
- B. Hold it: Nothing merges; there's no renderer option or WebGL 2 fallback, and CS-780, CS-763, CS-764, CS-507 and CS-36 wait.

Recommended: Merge it. Every gate passes, WebGPU parity is unchanged, the WebGL 2 code stays out of the main chunk, the cold start is within budget, and the option is the plan's own name.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
