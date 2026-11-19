---
id: CS-683
title: Dyno's roadmap zooms like Figma, shows its legend on top, and draws decisions with their question
kind: work
state: done
created: 2026-11-17
project: CS-18
needs: [CS-563]
claimed_by: orch-9-CS-683
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/work.ts, packages/next/bench/suite/DESIGN.md]
---

Three asks from the owner on 2026-11-17 about the roadmap on Dyno's Work page:

- "decisions should draw differently from items not in a milestone in project mode. i want to see the text of the decision and the item names, not just Not in a milestone yet"
- "i also keep wanting to zoom in and out on the roadmap view, like figma, let's implement that"
- "i want the critical path descriptor on top of the roadmap instead of the bottom. actually move the whole legend to the top and make it easier to read"

## Done when

- In project mode, a decision draws as a decision (its kind's color and symbol, per CS-573), showing its question and the names of the items that wait on it; items in no milestone show their names, not only "Not in a milestone yet".
- The roadmap zooms and pans like Figma: pinch and Ctrl or Cmd with the wheel zoom about the pointer, the wheel and a drag pan, keys zoom in, out, to fit and to 100 %, and the zoom level shows and can be reset. Text stays legible at every zoom, and the controls work with the keyboard only.
- The whole legend, the critical-path descriptor with it, sits above the roadmap, laid out so each mark's meaning reads at a glance.
- Checked on a Dyno server of the executor's own, never the owner's 5190, in both themes, at 380 px wide, with the keyboard only, with reduced motion and with a clean console (`packages/next/AGENTS.md`, "UI and examples").
