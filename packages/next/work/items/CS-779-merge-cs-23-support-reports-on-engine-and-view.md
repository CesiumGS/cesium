---
id: CS-779
title: Merge CS-23, support reports on Engine and View (view.support, view.effective, view.explain, strict)
kind: decision
state: done
created: 2026-11-20
project: CS-8
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the protocol and support tests, fast-forwards main, regenerates the views, runs the cold-start check on main and logs the merge; CS-35, CS-763, CS-764, CS-507 and CS-202 can then start."
answered_at: 2026-11-21T07:50:27.358Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-23, which gives each view a support report (view.support), its effective settings with the reason for each (view.effective), an explain(feature) trail, the strict and warnings options and support notices, with glare now chosen by the profiles resolver, into main? It adds seven public types to the API.

For each catalog feature, a view says what was asked, what was given, its scope and the rules and reasons behind it. The values stay right after a resize and after a device loss: tested onto a replacement GPU, where the support report follows the new device and glare re-resolves. Under strict, a pinned step that can't run throws, at addView (no view is added) or when a view changes; a cost step, such as glare on Intel, doesn't throw. Glare now comes from the resolver, so its old tier code is gone. Parity against its base: the observer suite 79 of 79 on both, identical but for one GPU timing, and translucency 8 of 8 identical. New public types: SupportReport, EffectiveSettings, EffectiveFeature, Importance, Reason, Step and Notice (api/surface.txt +7 lines), each with its thread kind in the protocol table. Not done here, as the item split them out: the limit notices for World clamps, the imagery slice pool, screen-space error and the caster scale (CS-507). Outside its touches: the device's cached facts in src/render/webgpuDevice.ts (where CS-33 left the place), the protocol rows, the Notice type in src/gpu/EngineErrors.ts, the glare migration in src/render/post/glare.ts, src/index.ts exports, the handbook's Engine profiles bullet and API map, and four tests that now leave support notices out of their assertions. Checked by hand on main 18ad72d121, after CS-52 (tested a80c0e0e42 and replayed as 83b9a3055c): both type checks, hitld work check (776 files), npm test exit 0 (374 files, 6,318 passed, no unhandled errors), test:data exit 0, shaders:check (45 up to date), and the protocol, support, boundary and seam tests on the replay. Your cold-start check (CS-715) passed at the commit that would merge: median first frame 1,297 ms without the board and 1,324 ms with it (run 2026-11-21T07-43-21-896Z-mac-apple). Three questions from the executor, for you, not part of this merge: (1) Notices reach a listener through engine.onError(e => e.kind === 'support' && e.notice), not the plan's engine.errors.on('support', ...), because errors is an array today, and notices carry no view yet, since there's no ViewId type. Recommendation: keep onError and add a view id with the worker facade (CS-31). (2) The moments fallback: the plan wants 'unsupported' for moments32, but the catalog puts the exact method first, so the notice is 'unmet'. Every default view on a device without float32-blendable (every fake test device too) warns once, and throws under strict. Recommendation: CS-507 settles the ladder or the mapping; until then the plan's warn-and-throw stays. (3) The remaining limit notices: the plan's CS-23 row names them, while the item split them into CS-507, which lists all but the caster scale. Recommendation: CS-507 does them through engine.notices.report, adding the caster scale. Presentation: orch-11-merge-ready-CS-23.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the protocol and support tests, fast-forwards main, regenerates the views, runs the cold-start check on main and logs the merge; CS-35, CS-763, CS-764, CS-507 and CS-202 can then start.
- B. Hold it: Nothing merges; views keep today's silent choices, and CS-35, CS-763, CS-764, CS-507 and CS-202 wait.

Recommended: Merge it. Every gate passes on main's tip, parity is unchanged, the cold start is within budget, and the seven new types are the plan's own names.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
