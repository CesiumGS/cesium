---
id: CS-1312
title: "Render features: the overlay slot"
kind: work
state: proposed
created: 2026-11-24
project: CS-191
---

> **Proposal.** Source: CS-848's report (render features: passes in named slots, declared for picks, rays and shadows), which came back partial, relayed by orch-11 on 2026-11-24. Why now: CS-848's contract names the overlay slot, but the engine has no pass that draws over the scene yet, so the slot refuses passes. Per the owner's answer to CS-258, overlay runs after tone mapping. Related: CS-1118 (draw layers share names with render features' slots). Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- The engine has a pass that draws over the scene after tone mapping, and the overlay slot registers render features into it instead of refusing them.
- Overlay features keep their declared picks; they cast no shadows and take no rays unless they declare otherwise.
- Tests on the fake device cover an overlay feature drawn after tone mapping, with its colors unchanged by the tone curve.
- The handbook tab that describes render features says the overlay slot works.
