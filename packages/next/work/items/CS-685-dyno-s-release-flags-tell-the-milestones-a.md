---
id: CS-685
title: "Dyno's release flags list only the milestones a release needs, and flag items that cross a release"
kind: work
state: planned
created: 2026-11-17
project: CS-18
needs: [CS-683]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

On the roadmap, a release's flag says "after" and lists every milestone that holds any item the release needs, through the needs between items. So alpha.1's flag (owner's screenshot, 2026-11-17) listed milestones it needed only one item from. The owner, on 2026-11-17, called the partial milestone a smell rather than a display problem: "if a milestone crosses a release, it's not really a milestone, is it?" The rule the owner accepted, also sent to human-in-the-lead as feedback: a release gate needs milestones only, and every open item a gated milestone needs, directly or indirectly, belongs to a milestone the same gate needs (or to no milestone). A violation is fixed in the tracker, by splitting a milestone or moving an item, never explained on screen. Re-scoped on 2026-11-17, before work started.

## Done when

- A release flag lists exactly the milestones its release item needs.
- `bench/suite/work.ts` computes the closure rule for each release item (CS-530 to CS-533), with tests, and the Work page shows each violation as a problem to fix: the release, the item it pulls in, the milestone that item belongs to, the path of needs from the release to it, and the two fixes (move the item into a milestone the release needs, or split the milestone). With no violations, the roadmap says so.
- Hovering or focusing a flag highlights the milestones it needs.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console (`packages/next/AGENTS.md`, "UI and examples").
