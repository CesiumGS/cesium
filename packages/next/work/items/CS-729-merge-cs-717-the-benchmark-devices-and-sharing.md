---
id: CS-729
title: Merge CS-717, the benchmark devices and sharing design
kind: decision
state: done
created: 2026-11-19
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays its two commits onto main's tip, reruns work check, fast-forwards main, regenerates the views and logs the merge; the build items and decisions follow it."
answered_at: 2026-11-20T04:22:51.534Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-717, the design for one benchmark database across machines (docs/design/benchmark-devices-and-sharing.md), into main?

CS-717 adds one design document (519 lines) and closes the item; no code. It settles identity in three parts (device, configuration, state), comparable runs per device, storage in a bucket dyno owns with client-side sealing and one immutable object per record, what syncs, multi-device views by each device's own ratios, and when a result carries to another hardware class. Its owner decisions (D1, the backend and its spend, and five more) and 8 build items are being filed separately by the chief of staff; merging records the design and commits to no spend. Light checks passed: hitld work check (721 files), markdownlint, prettier and the private-term check. Presentation: orch-10-merge-ready-CS-717.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays its two commits onto main's tip, reruns work check, fast-forwards main, regenerates the views and logs the merge; the build items and decisions follow it.
- B. Hold it: Nothing merges; the design stays on its branch while you read it, and the build items wait on it.

Recommended: Merge it. It meets the item's Done when, it commits to nothing until you answer D1 and the other decisions, and the alpha milestone's build items need it on main.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
