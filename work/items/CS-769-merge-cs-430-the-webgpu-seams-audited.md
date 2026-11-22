---
id: CS-769
title: Merge CS-430, the WebGPU seams audited
kind: decision
state: done
created: 2026-11-20
project: CS-437
decider: owner
answer: "A. Merge it: The orchestrator merges it after CS-721, replays it onto main's tip, reruns the work check, fast-forwards main, regenerates the views and logs the merge; CS-102 takes its list."
answered_at: 2026-11-21T06:31:40.601Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-430, which adds docs/design/webgpu-seams-audit.md, a list for the first public API review (CS-102) of every WebGPU seam in place with its bypass test, where those tests don't reach, and the seams still missing with what each would cost today, into main?

Nine seams in place: per-draw constants, placements, draw arguments, geometry submission, rays and spatial queries, bindless resources, the acceleration-structure hook, the capability registry and the renderer seam CS-33 merged. Each test was checked by planting a bypass, seeing it fail with the line named, and removing it; no plant was committed. Five plants passed when they shouldn't, and the document lists them as holes: a GPU type in renderSeam.ts, a render import in Camera.ts, castTerrainRay in widgets/index.ts, a property-texture read in surface.slang, and a capability read in World.ts. Six seams are still missing, judged against your rule ('only where the seam costs nothing today'): two pass (property textures behind an accessor; a per-tick event in the acceleration hook), cluster data passes on cost but waits on a format (CS-352), and three fail today (picks as ray queries, per-pass immediates, queue affinity in the pass graph). These are recommendations for CS-102, not decisions. It read main at 99c8aeea5b. It changes no code: one new document and the item's close. Checked by hand on main 8acd08c42f with CS-746, CS-748, CS-750 and CS-721 under it (tested 1f3f494c7c): hitld work check (763 files), the stale-names check (0), markdownlint (0), no absolute paths or tokens in the document. A follow-up for the chief of staff to file: a test-only item that closes the five holes. Presentation: orch-11-merge-ready-CS-430.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator merges it after CS-721, replays it onto main's tip, reruns the work check, fast-forwards main, regenerates the views and logs the merge; CS-102 takes its list.
- B. Hold it: Nothing merges; CS-102 waits for the list.

Recommended: Merge it. It's a document only, every check passes, and CS-102 needs its list.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
