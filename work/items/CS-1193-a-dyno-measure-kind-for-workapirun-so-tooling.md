---
id: CS-1193
title: A dyno measure kind for workApiRun, so tooling runs queue like the others
kind: work
state: proposed
created: 2026-11-23
project: CS-389
touches: [bench/suite/workApiRun.mjs, bench/suite/measure.mjs, bench/suite/commands/**, bench/suite/DESIGN.md, .claude/skills/dyno/**, test/**]
---

> **Proposal.** Source: orch-11's report on CS-1172 (2026-11-24). Why: `bench/suite/workApiRun.mjs` runs outside `dyno measure`, so it doesn't queue behind other measurements, doesn't follow the quiet rule through the same gate, and leaves no completion record. CS-1172's part 5 waited two hours at the gate without running. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `dyno measure` has a kind for the Work board's API run, so it queues, waits for quiet and records its run like suite runs.
- `workApiRun.mjs` is reached through it, and the dyno skill and `bench/suite/DESIGN.md` say so.
- A focused test covers the new kind's queueing and its completion record.
