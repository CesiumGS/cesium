---
id: CS-1359
title: Merge CS-972, a render feature's context reaches the GPU only through the seams
kind: decision
state: done
created: 2026-11-25
project: CS-191
decider: owner
answer: "A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh, then CS-848."
answered_at: 2026-11-25T15:38:37.371Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-972 into main? A render feature registered from outside the engine gets no raw GPUDevice, queue, encoder, buffer or texture, directly or through anything reachable from its context, and every GPU buffer, texture and query-set destroy in the engine waits until after the tick's submit.

A render feature's context is built from the seams only (ShaderBindings owns a shader's resources across worlds; the seam check reads the exact linked WGSL with WGSL's full comment grammar), with a planted bypass the tests catch. Your answers, as given: 'CS-972 A, stack' (CS-848 builds on this replay and merges right after it), and 'A: structural round', after a little research ('have it do a little research on how other engines handle this structurally'). The research, a section of docs/design/webgpu-seams-audit.md with sources and dates, found Babylon.js's WebGPU engine defers destroys to after the frame's submit, the shape built here; WebGPU frees submitted work's resources itself, so fence-indexed queues aren't needed. The design change it named: one deferred list per JavaScript realm with destroyGpu as the only call, instead of one per context, and the rule over all of packages/core/src (61 more sites), enforced by a bypass test with an empty allowlist; the wider rule found a real case (a view's environment probe). Reviews: an Opus review and four scoped Opus checks under your patch-chain guard. Round 3's check found its fix incomplete one level down (a slab's buffers), which went to you and led to the structural round. Round 4's check found no new Important: each case you named (a revoke that empties a slab, removeView, removeWorld and slab growth inside a tick) passes, and is refused by WebGPU's rule when the deferral is planted out; the realm-wide list held for interleaved engines, a throwing tick, an engine destroyed in its own tick, async code and workers. The Lab's customShader and parity suites on main (run 2026-11-25T01-32-00-092Z-apple-metal-3) and on the replay (run 2026-11-25T06-01-13-240Z-apple-metal-3) agree in all 334 result fields apart from timings. Follow-ups filed: CS-1317 (the bypass test matches the resolved method), CS-1318 (World.destroy while a view shows that world), CS-1289 (the linker enforces provides for every custom shader); the raw WebGPU routes stay public at alpha.1 by your CS-1288 answer, moving later in CS-1290. The orchestrator resolved one conflict on the replay (renderTick.ts: main's readListCounts kept, its destroy through destroyGpu). No owner paths. Checked by the orchestrator on the replay bbf4b86035. Under your batch rule, the full suite runs once on the batch before any merge. Cheap gates on the replay: typecheck, tsc -p ., surface and shaders:check pass; the repository-wide eslint ran out of memory twice (at 8 GB, with the machine loaded), so eslint ran on the 56 changed files instead: clean. The related tests' one failure, importBoundary's globe-only bundle check, passed alone (30 of 30).

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh, then CS-848.
- B. B. Hold it: Nothing merges; CS-848 waits on it, and features keep today's context.

Recommended: A. Merge it. It meets the done-when, every review finding is closed or filed, and the last scoped check found nothing new.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
