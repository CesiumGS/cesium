---
id: CS-692
title: "Dyno's roadmap Plan view: what gets built when, grouped by release, as the run would work through it"
kind: work
state: planned
created: 2026-11-18
project: CS-18
needs: [CS-685]
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

The owner, 2026-11-18, after the release bands and zoom landed: "something still generally feels off in how we're presenting this information to really understand what is getting built when and what the dependencies are and what milestones are going into what releases. take a step back and think about this from UX and information visualization science first principles." The owner agreed a three-view design the same day ("Yes, go with it"): **Plan** (this item), **Dependencies** (CS-694) and **Projects** (CS-693). Earlier the same day: "i find that depth thing a little confusing, because i read it as a sequence", and a step becomes a **wave**.

The principles the design rests on, to record in `packages/next/bench/suite/DESIGN.md` as the Work page's roadmap brief:

- Position carries the question being asked. Across is sequence, never dependency depth, because position always reads as order.
- One view per question: when (Plan), why (Dependencies), how ready (Projects).
- Overview by aggregation, not by shrinking: release, then milestone, then item, drilled into rather than zoomed out to unreadable.
- Direct labels on the marks; at most one key line, the rest in a "?" popover and tooltips.
- Dependencies shown on demand for the thing chosen, not every edge at once.

## Done when

- The roadmap's default view is **Plan**: a timeline with no dates. Across is cumulative tokens as the run's executor slots (`max_executors`, today one, shown and adjustable) would work through the items in the planner's order (`hitld ready`'s tiers and order, or the same rule in `work.ts`), respecting `needs` and CS-685's release bands. Never a time estimate.
- Rows are grouped by release in ladder order (alpha.1, beta.1, rc.1, 2.0.0, then no release). Collapsed, a release is one summary bar; expanded, one bar per milestone from its first item's start to its last item's finish; a milestone expands to its items.
- Each release is a labeled marker on the axis where its last needed item finishes. Markers and labels are part of the plot and scale with zoom; labels stay legible.
- Choosing a release answers "what sets its finish?": the chain of items that ends last is lit, with its length. The words "critical path" no longer appear on the page.
- Kind, state and "proposed" are shown on the marks themselves, with details in tooltips. The legend above the map shrinks to one key line at most, with the rest in a "?" popover.
- Where token sizes are missing, the view sequences by item count and says so, naming how many items it counted at a default size.
- The depth layering stays reachable from the Dependencies view only (CS-694), labeled "earliest possible start", with a "wave" in place of a "step" everywhere on the Work page.
- `bench/suite/DESIGN.md` records the three-view brief and the principles above.
- Tests in `test/dynoWork.test.ts` cover the sequencing with one and several slots, with release bands, the release markers and the finishing chain.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console (`packages/next/AGENTS.md`, "UI and examples"), with a UX review on the real page and its findings fixed.
