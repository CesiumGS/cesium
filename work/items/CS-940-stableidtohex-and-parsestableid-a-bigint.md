---
id: CS-940
title: "stableIdToHex and parseStableId: a bigint StableId to and from 16 hex digits (CS-936)"
kind: work
state: done
created: 2026-11-22
project: CS-437
needs: [CS-815]
claimed_by: orch-11-CS-940
---

> **Committed by the owner (2026-11-22), through CS-936's answer A.**

## Done when

- `stableIdToHex(id)` writes a bigint `StableId` as 16 lowercase hex digits, and `parseStableId(text)` reads it back, refusing anything else by name.
- Their doc comments say that `JSON.stringify` throws on a bigint, and show the round trip.
- Tests cover zero, the largest 64-bit value, and a refused string.
- `api/surface.txt` is committed with the change.
