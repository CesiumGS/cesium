---
id: CS-1264
title: Decoded imagery sources stay within MAX_SOURCES while jobs wait
kind: work
state: proposed
created: 2026-11-24
project: CS-17
---

> **Proposal.** Source: CS-165's diagnosis, relayed by orch-11 (2026-11-24). Why now: decoded imagery sources reached 9,773 against `MAX_SOURCES` of 512 at valley ×10, α 1, because waiting jobs mark their sources used on every update, so none is ever evicted. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- Decoded imagery sources stay within `MAX_SOURCES` while jobs wait.
- A test with more waiting jobs than `MAX_SOURCES` shows the count stays within it.
