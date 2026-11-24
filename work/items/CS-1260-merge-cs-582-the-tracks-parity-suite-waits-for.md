---
id: CS-1260
title: Merge CS-582, the tracks parity suite waits for the world's pipelines
kind: decision
state: planned
created: 2026-11-24
project: CS-195
decider: owner
---

## Question

Merge CS-582 into main? The tracks parity suite captures once the world's pipelines are ready instead of after four fixed ticks, so its billboard cases stop failing on the first run after a cold server start.

The cause, reproduced from cold starts under the gpu lock: the billboards' custom shader compiles in the background, and the engine draws its stand-in (no red) until World.ready() is true. That's designed behavior. On a cold start the first real draw came on tick 4 or 5, while the harness captured after a fixed four ticks of 30 ms, so with no delay it only just crossed the line. With pipeline creation delayed 1.5 s or 3 s, the old suite gave 6 of 8, with both billboard cases at 0 red pixels, which is the symptom CS-201 saw. The fix is in the harness (parity/tracks.ts): a settle() that renders until World.ready() is true, then four more ticks, with a 30 s ceiling that throws rather than capturing a half-drawn image. It also applies to the two clamping scenes, which have the same custom-shader draws. Engine.whenReady can't be used because this page drives ticks by hand. Results: 8 of 8 with delays of 0, 1.5 and 3 s, and 8 of 8 on five separate cold starts. A mutation that never draws the far billboards fails both cases; a 60 s delay throws as designed. Lab run 2026-11-24T14-07-49-279Z-apple-metal-3, 8 of 8. The orchestrator read the diff (one file, 45 lines); it's harness-only, with an empty changeset and no owner paths. Checked on the replay 12188b95a5 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; the tracks suite can fail its billboard cases on a cold start.

Recommended: A. Merge it. It names the cause with a reproduction, fixes the harness where the cause is, and the suite still fails when a billboard doesn't draw.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
