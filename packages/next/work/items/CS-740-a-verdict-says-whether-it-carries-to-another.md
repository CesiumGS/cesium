---
id: CS-740
title: A verdict says whether it carries to another hardware class
kind: work
state: proposed
created: 2026-11-19
project: CS-389
needs: [CS-739, CS-394, CS-732]
touches: [packages/next/bench/suite/studies.mjs, packages/next/bench/suite/report.mjs, packages/next/bench/suite/schema.ts, packages/next/test/bench*.test.ts]
---

**Proposal** (CS-686). Source: CS-717's design, 2026-11-19. Why now: the design's build list for devices and transportability. Rough size: medium. Decider: the owner, through CS-732. Filed: 2026-11-19.

From CS-717's design, filed by the main session on 2026-11-19. Not in CS-722: it needs CS-404 (milestone CS-480), so CS-732 decides whether it joins CS-480 (recommended) or alpha.1. The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: medium.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- Each run records its work counters and its bottleneck per scene.
- A verdict on class A carries to class B only when B's counters match within their spread, B has a calibration study for that work, and both share a bottleneck. Otherwise it says "can't tell", naming the failed check and what to measure (three fixtures, one per failed check, plus one that carries).
