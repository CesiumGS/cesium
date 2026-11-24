---
id: CS-1196
title: Merge CS-955, the df64 route-center pass measured, with a CPU fallback
kind: decision
state: planned
created: 2026-11-23
project: CS-10
decider: owner
---

## Question

Merge CS-955 into main? On this Mac's Apple GPU the df64 route-center pass folds to float32 and is off by meters, so a self-test now sends those routes to the CPU's float64 path.

As your CS-954 A asked: a Lab readback runs the GPU pass against the CPU's float64 records. On the Apple M2 (WebGPU on Metal) the pass is off by about 0.3 to 1.2 m at the Earth's surface on the Earth routes and up to 184 m on `flatten`, millions of times its stated 1e-7 m bound, with the eye at any distance. A self-test runs the real pass once per device on first use; where it misses the bound, routes with a dynamic parameter and 16 or more draws keep the CPU's records, and the device report says so. An Opus GPU review traced every path (before the self-test, after a device loss, routes made before the probe loads) and found none that draws folded records here; the kernels have no loops. Parity before and after: identical in every field but timings, plus seven new center-pass rows. No second GPU vendor is measured yet (this Mac has only an Apple GPU); one command runs it elsewhere. Follow-ups the review asks for before any device can take the GPU path, and before CS-161: check each route kind on its first GPU use rather than one fixed case (one case can't vouch for `flatten`), check whether a correct df64 pass can meet the 1e-7 m bound at all, clamp two indices in the emitter, record a failed self-test instead of swallowing it, and correct the note's device-loss wording. No owner paths. Checked by the orchestrator on the replay b32a6ffa1c onto main b01b665dcc (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. CS-941 can then start.
- B. B. Hold it: Nothing merges; Apple GPUs keep drawing with folded records on routes with 16 or more draws.

Recommended: A. Merge it. It measures what CS-954 asked, stops Apple GPUs from drawing meters off, and changes nothing that parity can see.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
