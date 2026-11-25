---
id: CS-1332
title: The vector path as a render feature in CS-848's slots
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-261, CS-848, CS-972]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.5, its item VR), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: CS-848 gives modules named slots with declared picks, rays and shadows; the vector path should draw through them, not beside them. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- The vector path registers its passes in CS-848's slots: `opaque`, `translucent`, `overlay` (after tone mapping, as the owner answered), and `ground` once draping lands.
- It declares per kind that it writes IDs, gives a ray adapter (strokes and fills) and casts shadows (opaque 3D fills only), and the test that refuses a feature with no declarations passes.
- Its context reaches the GPU only through the seams (CS-972), and the seams' bypass tests cover it.
- Records take CS-1118's draw layers once that item lands.
