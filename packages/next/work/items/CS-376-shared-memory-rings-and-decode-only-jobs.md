---
id: CS-376
title: Shared-memory rings and decode-only jobs
kind: work
state: proposed
created: 2026-11-13
project: CS-12
needs: [CS-87]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/job-system.md`, "Shared memory, detected", made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-465 (Jobs share one tick budget and decode can't hang), so that milestone cannot be checked while this stays proposed. It also waits on CS-87. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

Fetching moves out of decode jobs; workers and the device thread share rings, with stealing and decode writing into a shared upload ring, if measurements show copies matter.

Detail: `docs/design/job-system.md`, "Shared memory, detected".
