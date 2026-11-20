---
id: CS-739
title: "Studies across devices: noise floors per hardware class, pooling, and the health bar"
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-404, CS-733, CS-738, CS-732]
touches: [packages/next/bench/suite/studies.mjs, packages/next/bench/suite/commands/studies.mjs, packages/next/bench/suite/schema.ts, packages/next/work/studies/README.md, packages/next/test/bench*.test.ts]
---

From CS-717's design, filed by the main session on 2026-11-19. It joins alpha.1 with CS-404 (the owner's answer to CS-732). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: large.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- An instrument's noise floor is stored per hardware class, and the power analysis uses it.
- The health bar reads the machine's state before each run, and a study whose arms lose runs to it at clearly different rates warns (fixture).
- The hierarchical model pools devices within classes and recovers a planted one-device difference (fixture).
- Each verdict lists, per hardware class, measured, carried or can't tell, and a class without runs is never "measured".
