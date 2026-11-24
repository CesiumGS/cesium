---
id: CS-1176
title: Translucency's moments order layers by distance along each pixel's ray from its start
kind: work
state: proposed
created: 2026-11-23
project: CS-188
needs: [CS-1117]
---

> **Proposal** (CS-686). Source: CS-1117's review, via orch-11. Why now: orthographic cameras (CS-1160) put the ray's start behind the camera's position, so layers either side of that position tie or sort in the wrong order. Rough size: small. Decider: owner. Filed: 2026-11-23.

## Done when

- The moments pass orders layers by distance along each pixel's ray from the ray's start, not from the camera's position.
- Perspective images are unchanged (parity suite against the previous commit).
- A test with an orthographic camera and translucent layers either side of the camera's position orders them correctly, with a mutation that restores the old distance.
