---
id: CS-696
title: "One hover card for the Work page's views: state, progress with labeled colors, open blockers, room to slip, next step"
kind: work
state: done
created: 2026-11-18
project: CS-18
needs: [CS-692, CS-694, CS-693]
claimed_by: orch-9-CS-696
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

The owner, 2026-11-18: "the tooltip when hovering over an item on the roadmap is hard to read and i'm not sure is giving useful information (i like the slip idea though). How can we improve the UI/UX of that hover?" and "also not clear what the colors in the progress bars mean, they need a tooltip too, or something". Today's hover (`work-map-tip` in `views/Work.tsx`) is seven plain lines of equal weight: title, project, stage counts, every upstream milestone, slack in steps, tokens left and budget, several of them only saying something is unknown. Agreed the same day ("great, let's do both"), to run after the three views (CS-692, CS-694, CS-693) so it fits all of them.

## Done when

- One shared hover card component serves the Plan, Dependencies and Projects views and the lists, and on keyboard focus too, never covering the mark it describes; about 320 px wide, readable contrast, short section labels.
- **What and how far:** kind glyph, title, one state chip (Ready, Blocked, In progress, Proposed or Done), the release it belongs to, a small progress bar matching the mark, and a line under it labeling each color in place with a swatch: "3 done · 2 ready · 2 blocked".
- **What's holding it up:** only open blockers, two at most by name, then "+N more"; anything waiting on the owner first and set apart ("Needs your answer: CS-118 …").
- **Room to slip:** one plain line measured against its release in the Plan view's sequence ("Sets beta.1's finish: any delay moves beta.1" or "Room to slip: about 40k tokens before beta.1 moves"), with a small bar of the slack against the release marker. The words "critical path" don't appear.
- **Next step:** a muted footer, "Click for details · D for dependencies", opening the pane or CS-694's view.
- Unknowns are hidden rather than spelled out: no token lines when nothing has an estimate (one muted note instead), no budget line until hitld records spending.
- Every progress bar's segments on the Work page have their own hover and focus label ("2 blocked: waiting on CS-118 and CS-55"), in CS-573's stage colors.
- Tests in `test/dynoWork.test.ts` cover the card's content rules (blocker order, the owner's items first, hidden unknowns, slack wording).
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console, with a UX review on the real page and its findings fixed.
