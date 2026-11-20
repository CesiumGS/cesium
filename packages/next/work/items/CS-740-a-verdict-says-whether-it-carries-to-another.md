---
id: CS-740
title: A verdict says whether it carries to another hardware class
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-739, CS-394, CS-732]
touches: [packages/next/bench/suite/studies.mjs, packages/next/bench/suite/report.mjs, packages/next/bench/suite/schema.ts, packages/next/test/bench*.test.ts]
---

From CS-717's design, filed by the main session on 2026-11-19. It joins alpha.1 with CS-404, CS-393 and CS-394 (the owner's answer to CS-732, and "Yes, pull them in"). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: medium.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- Each run records its work counters and its bottleneck per scene.
- A verdict on class A carries to class B only when B's counters match within their spread, B has a calibration study for that work, and both share a bottleneck. Otherwise it says "can't tell", naming the failed check and what to measure (three fixtures, one per failed check, plus one that carries).
