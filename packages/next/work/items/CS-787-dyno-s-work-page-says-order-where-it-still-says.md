---
id: CS-787
title: Dyno's Work page says Order where it still says Plan view, and DESIGN.md drops the old Projects section
kind: work
state: proposed
created: 2026-11-21
project: CS-389
needs: [CS-749]
touches: [packages/next/bench/suite/views/Dependencies.tsx, packages/next/bench/suite/views/Projects.tsx, packages/next/bench/suite/DESIGN.md]
---

After CS-749 turned the Plan view into Order, some text still names the Plan view: the Dependencies help (`Dependencies.tsx`) and three strings and comments in `Projects.tsx`. `bench/suite/DESIGN.md` also keeps a section on CS-693's Projects tab, which CS-748 replaced.

Source: CS-749's report, relayed by orch-11, 2026-11-21. Why now: help text that names a view that's gone confuses the owner. Rough size: small. Decider: the executor. Filed: 2026-11-21.

## Done when

- No UI string or help text says "Plan view". Each one names Order, and where it describes the old slot setting, it describes Order's history range instead.
- `DESIGN.md` drops or folds in the old Projects section, keeping anything CS-748's section still relies on.
- A test fails if "Plan view" appears in a view's UI strings again.
