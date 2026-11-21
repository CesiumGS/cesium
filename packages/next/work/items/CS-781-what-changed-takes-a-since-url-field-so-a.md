---
id: CS-781
title: What changed takes a since= URL field, so a chosen point can be shared as a link
kind: work
state: proposed
created: 2026-11-20
project: CS-389
needs: [CS-747]
touches: [packages/next/bench/suite/routes.tsx, packages/next/bench/suite/views/workChanges.tsx, packages/next/test/dynoWorkChanges.test.ts]
---

CS-747's What changed view lets the viewer pick a starting point: their last visit, a date, or a commit. That choice lives only in the page. A `since=` field in the URL would let the owner share "what changed since Monday" as a link. The field belongs in the shell's `routes.tsx`, which CS-747 didn't touch.

Source: CS-747's report, relayed by orch-11, 2026-11-20. Why now: the view is meant to give a leadership team a weekly "what changed", and a link is how that gets shared. Rough size: small. Decider: the executor. Filed: 2026-11-20.

## Done when

- `#/work?view=changes&since=<date or commit>` opens at that point. A bad value shows a one-line notice and falls back to the last visit.
- Changing the point in the page updates the URL without adding a history entry for each keystroke.
- Tested with a date, a short commit and a bad value. The owner checks it by clicking around.
