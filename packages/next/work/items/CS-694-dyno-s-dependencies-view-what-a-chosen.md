---
id: CS-694
title: "Dyno's Dependencies view: what a chosen milestone or item waits on and unblocks, with the global structure behind a toggle"
kind: work
state: planned
created: 2026-11-18
project: CS-18
needs: [CS-692]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

The second of the three views the owner agreed on 2026-11-18 (Plan, CS-692; Dependencies, this item; Projects, CS-693), on the brief CS-692 records in `bench/suite/DESIGN.md`. The roadmap map draws every wait between 90-odd milestones at once, which at the owner's 7% zoom (screenshot, 2026-11-18) is unreadable, and answers neither "what is this waiting on?" nor "what does this unblock?". Those are asked about one thing at a time.

## Done when

- Choosing any milestone or item (from the Plan view, a list, search or the pane) opens a **Dependencies** view centered on it: what it waits on to the left, what it unblocks to the right, as a small tree a few levels deep, expandable, with open owner decisions and outside waits marked on it in their kind's encoding, and the release each node belongs to.
- Each node shows its state and whether it's ready, and opens its pane; the tree's depth and counts say how far the chain goes when it's cut short.
- Behind a toggle, the global structure for reshaping work: the depth layering, honestly labeled "earliest possible start", in **waves** (never "steps"), and the project matrix that CS-693 moves out of its default.
- The always-on drawing of every wait is gone from the default views.
- Direct labels and tooltips, no legend beyond one key line, per the brief.
- Tests in `test/dynoWork.test.ts` cover the upstream and downstream trees, cycles and the depth cut.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console, with a UX review on the real page and its findings fixed.
