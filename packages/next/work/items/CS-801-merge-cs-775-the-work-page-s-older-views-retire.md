---
id: CS-801
title: Merge CS-775, the Work page's older views retire
kind: decision
state: planned
created: 2026-11-21
project: CS-389
decider: owner
---

## Question

Merge CS-775, which removes the Work page's Older views menu, the Dependencies view (with its waves grid) and the old Projects matrix, about 6,200 lines, with old links opening Path and a dismissible note, into main?

Your word: 'you can get rid of the older views in the work tab'. Old links still land somewhere useful: roadmap=deps, waves and matrix open Path with a one-line note you can dismiss; roadmap=projects opens CS-748's Projects view; roadmap=plan opens Order. A drawer's 'Its path' link opens Path focused on the item, and the hover card's D key now reads 'D for path'. Removed with them: bench/suite/projects.ts, most of dependencies.ts (only matchFocus stays, which Path's search uses), work.ts's dependencyMatrix, Work.tsx's unused pieces, the route parameters slots, deps, depth and psort, and their tests; DESIGN.md's Dependencies and old Projects sections, with a new section saying what retired. I checked every one of the 157 CSS classes it removes: every class CS-748's Projects view uses is still defined (one, work-projects-lands, never had a rule). It also covers most of CS-787 (the Plan view wording, the stale CS-693 section, dependencyMatrix and seatbelt lines), so CS-787 can be trimmed after this merges. Outside its touches: projects.ts and dependencies.ts and the root eslint.seatbelt.tsv lines. The executor saw two test files fail (styleParity, volumes) because its worktree had no built @cesium/core; in my merge worktree, which has it, both pass. Checked by hand on main fa89cfee90 (tested ccdd9d1158; the branch's tip 8d0877108d has the same tree, with its claim's trailers amended): both type checks, hitld work check (798 files), surface (no API change), npm test exit 1 on one noSceneGains test (CS-538, known under load; this touches nothing under src/), then 8 of 8 alone three times, every other file passed; test:data exit 0. Cold start isn't needed: Dyno views only. To try it once merged: #/work?view=roadmap&roadmap=deps on Dyno (it opens Path with the note; dismiss it); roadmap=projects and roadmap=plan; a drawer's 'Its path'. Presentation: orch-11-merge-ready-CS-775.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge; the chief of staff trims CS-787.
- B. Hold it: Nothing merges; the Older views menu, the Dependencies view and the old Projects matrix stay.

Recommended: Merge it. It does what you asked, old links keep landing on the right view, no style the remaining views use is removed, and every gate passes but one known load failure that passes alone.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
