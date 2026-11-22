---
id: CS-375
title: One tick budget, and more progressive jobs
kind: work
state: proposed
created: 2026-11-13
project: CS-12
needs: [CS-90, CS-91, CS-93]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/job-system.md`, "Where it plugs in" and "Next steps", made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-465 (Jobs share one tick budget and decode can't hang), so that milestone cannot be checked while this stays proposed. It also waits on CS-90, CS-91, CS-93. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

The fixed per-phase budgets come from one tick budget (the time to the next vsync), and imagery compositing and stats recounts become progressive jobs.

Detail: `docs/design/job-system.md`, "Where it plugs in" and "Next steps".
