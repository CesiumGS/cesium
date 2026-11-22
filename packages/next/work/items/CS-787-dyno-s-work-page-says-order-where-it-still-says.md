---
id: CS-787
title: Dyno's Work page says Order where it still says Plan view, and DESIGN.md drops the old Projects section
kind: work
state: proposed
created: 2026-11-21
project: CS-389
needs: [CS-749]
touches: [packages/next/bench/suite/work.ts, packages/next/bench/suite/views/work.css, packages/next/bench/suite/views/Work.tsx, packages/next/test/dynoWork*.test.ts, packages/next/bench/suite/DESIGN.md]
---

After CS-749 turned the Plan view into Order, some text still names the Plan view: the Dependencies help (`Dependencies.tsx`) and three strings and comments in `Projects.tsx`. `bench/suite/DESIGN.md` also keeps a section on CS-693's Projects tab, which CS-748 replaced.

Source: CS-749's report, relayed by orch-11, 2026-11-21. Why now: help text that names a view that's gone confuses the owner. Rough size: small. Decider: the executor. Filed: 2026-11-21.

## Done when

- No UI string or help text says "Plan view". Each one names Order, and where it describes the old slot setting, it describes Order's history range instead.
- The Dependencies help and the old Projects view go with CS-775, along with their "Plan view" wording and DESIGN.md's old Projects section. This item covers what's left elsewhere. (Changed 2026-11-22.)
- `measuresOf` in `bench/suite/work.ts` has no caller since CS-752 (Flow), so it goes. (Added 2026-11-21, from CS-752's report.)
- `proposalsForOwner` and its stage types, which have only test callers since CS-753, go with their tests. So do the `work.css` rules that nothing uses, each checked by grep before it's removed. (Added 2026-11-21, from CS-753's report.)
- A test fails if "Plan view" appears in a view's UI strings again.
