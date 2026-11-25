---
id: CS-1321
title: An image check of the lit far-out globe with level-0 terrain tiles only
kind: work
state: proposed
created: 2026-11-24
project: CS-192
needs: [CS-284]
---

> **Proposal.** Source: CS-284's report (re-check East Antarctica drawn as ocean from far out), relayed by orch-11 on 2026-11-24. Why now: the bug survived because no Lab or Dyno suite image renders lit level-0 terrain. The repro camera had only moved off it. Cesium World Terrain's level-0 tile has oct normals up to 71 degrees off geodetic up over the flat ice sheet; CS-284's fix gives level-0 tiles geodetic up. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- An image check renders the lit globe from far out: the repro's camera at 1.5 times its distance, at a sun time that lights the far hemisphere, with level-0 terrain tiles only.
- It runs in the Lab's parity suites (or a Dyno suite), and fails on the commit before CS-284's fix, by East Antarctica drawn as ocean.
- The check states its data (the terrain asset), its camera, its sun time and its threshold.
