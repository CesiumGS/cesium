---
id: CS-739
title: "Studies across devices: noise floors per hardware class, pooling, and the health bar"
kind: work
state: proposed
created: 2026-11-19
project: CS-389
needs: [CS-404, CS-733, CS-738, CS-732]
touches: [packages/next/bench/suite/studies.mjs, packages/next/bench/suite/commands/studies.mjs, packages/next/bench/suite/schema.ts, packages/next/work/studies/README.md, packages/next/test/bench*.test.ts]
---

**Proposal** (CS-686). Source: CS-717's design, 2026-11-19. Why now: the design's build list for devices and transportability. Rough size: large. Decider: the owner, through CS-732. Filed: 2026-11-19.

From CS-717's design, filed by the main session on 2026-11-19. Not in CS-722: it needs CS-404 (milestone CS-480), so CS-732 decides whether it joins CS-480 (recommended) or alpha.1. The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: large.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- An instrument's noise floor is stored per hardware class, and the power analysis uses it.
- The health bar reads the machine's state before each run, and a study whose arms lose runs to it at clearly different rates warns (fixture).
- The hierarchical model pools devices within classes and recovers a planted one-device difference (fixture).
- Each verdict lists, per hardware class, measured, carried or can't tell, and a class without runs is never "measured".
