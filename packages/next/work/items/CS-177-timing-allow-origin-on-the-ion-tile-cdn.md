---
id: CS-177
title: `Timing-Allow-Origin` on the ion tile CDN
kind: external
state: planned
created: 2026-11-13
project: CS-16
waiting_on: Cesium ion
---

## Waiting on

Add `Timing-Allow-Origin` to the ion tile CDN (`assets.ion.cesium.com`). Without it browsers hide per-request timing (time to first byte, connection setup) and possibly the negotiated protocol from clients, which protocol-aware request scheduling wants. Google's tile host already sends it.

- **For:** Cesium ion
- **Where it is explained:** `docs/design/tile-selection-and-memory.md`
- **Status (2026-11-13):** To ask
- Formerly row 4 of the overall plan's follow-ups table.
