---
id: CS-1346
title: The gltf source places KHR_lights_punctual lights per content item
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-556]
---

> **Proposal.** Source: CS-556's report (glTF files load through the content-source seam), relayed by orch-11 on 2026-11-25. Why now: the gltf kind loads models through the seam but drops their lights. Unblocks: lit glTF scenes opened by URL. Size: small. Decider: owner. Filed 2026-11-25.

## Done when

- The gltf source reads `KHR_lights_punctual` and places each light with its content item, in the item's placement, through the engine's light list.
- A fixture with point, spot and directional lights draws at its parity baseline, and closing the item removes its lights (tested).
