---
id: CS-1296
title: If the adapters' seams aren't done, does alpha.1 keep waiting for CS-977?
kind: decision
state: done
created: 2026-11-24
project: CS-437
decider: owner
---

> **Decision for the owner, answered.** Source: CS-977 (adapters leave core's public entry), relayed by orch-11's report audit (2026-11-24). Filed 2026-11-24.

## Question

alpha.1 waits until the adapters leave core's public entry (CS-974 C). Their seams (CS-269 ion, CS-554 3D Tiles, CS-556 glTF, CS-810 imagery and terrain providers, CS-811 decoders) are planned but not started. If they aren't done first, what happens to alpha.1?

## Options and recommendation

- Keep waiting (recommended): keep C, and order CS-554, CS-556 and CS-810 ahead of alpha.1's other work so the wait is short.
- Publish with the names: publish alpha.1 with the adapters' names still in core's entry, using CS-973 C's right to rename them later.

## Answer

The owner, 2026-11-24: "Keep waiting (Recommended)", the option that reads "Keep C. Order CS-554, CS-556 and CS-810 ahead of alpha.1's other work so the wait is short."
