---
id: CS-775
title: The Dependencies view's waves grid retires now that the Path view answers what it did
kind: work
state: proposed
created: 2026-11-20
project: CS-389
needs: [CS-746]
touches: [packages/next/bench/suite/views/Dependencies.tsx, packages/next/bench/suite/views/*.css, packages/next/bench/suite/DESIGN.md, packages/next/test/dynoWork*.test.ts]
---

The owner, 2026-11-20, answering CS-746's question: the Dependencies view's waves grid ("Earliest possible start, in waves") goes, but only after the owner has tried the Path view. This item stays proposed until then.

Source: the owner's answer to CS-746's question, through the chief of staff. Why now: Path answers "what does this target wait on?" for one target, which was the grid's real job, and two views of one answer drift apart. Rough size: small. Decider: the owner commits it once they've used Path. The executor removes only the grid and its key, and anything that only the grid used. Filed: 2026-11-20.

## Done when

- The waves grid and its key are gone from the Dependencies view. Code only the grid used, such as `wavesOf` if nothing else calls it, goes with it.
- Old links to the grid land on the Path view, with a one-line note saying where the grid went.
- `bench/suite/DESIGN.md` says the grid is retired and why.
- The owner checks it by clicking around: both themes, 380 px wide, keyboard only.
