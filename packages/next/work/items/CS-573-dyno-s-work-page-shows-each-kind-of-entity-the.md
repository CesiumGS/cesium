---
id: CS-573
title: Dyno's Work page shows each kind of entity the same way everywhere, and its detail pane says plainly what you're looking at
kind: work
state: in-progress
created: 2026-11-17
project: CS-18
claimed_by: orch-9-CS-573
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
tier_override: 3
---

The owner, 2026-11-18: in the detail panes that open when an entity is clicked on Dyno's Work page (`?item=CS-<n>`, `bench/suite/views/Work.tsx`), the kind (milestone, work item, decision, external, project, release) is hard to see. They want consistent color coding by kind, alongside the symbols already used, readable in the detail view. And the panes in general are hard to parse: "i'm never quite sure what i'm looking at".

Today the kind is a small `work-kind` label (`KIND_NAMES`, about line 3748), and color is spent on the stage (proposed, planned, in flight, done). So kind and stage compete for one channel.

## Done when

- Each kind has one encoding, a color and a glyph, used the same way in every view (Your move, Roadmap, Proposals, Flow, the lists) and in the pane, with a legend. Kind and stage stay distinguishable: if both use color, one of them moves to another channel, and the design note says which.
- The pane opens with what it is: the kind (encoded and named), the ID and title, the state, and where it sits (its project, its milestone or the milestones it feeds, the release it gates), before any body text.
- The pane's sections follow one order for every kind, with a heading on each. Fields a kind doesn't have are left out, not shown empty. A decision shows its question, options and answer first. A milestone shows its outcome and its constraints' progress.
- `bench/suite/DESIGN.md` records the kind encoding and the pane's layout, and a UX review on the real page finds the kind and the "what is this" answer at a glance. The review's findings are fixed.
- Checked in both themes, at desktop and at 380 px wide, with the keyboard only, with reduced motion and a clean console, and for color contrast and for readers who can't tell the colors apart (the glyph carries the kind alone). Run on a Dyno server of the executor's own, never the owner's 5190 (`packages/next/AGENTS.md`, "UI and examples").
