---
id: CS-1220
title: The content boundary's exotic-object check costs about 100 times the old copy per class instance
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-1188]
---

> **Proposal.** Source: CS-1188's scoped Opus check after its fix round, relayed by orch-11 (2026-11-24). Why now: a careless source could block the main thread for minutes while staying within its bounds. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The exotic-object check costs about what the copy did before CS-1188 (about 3.5 µs per class-instance node, against about 350 µs now), measured in Dyno.
- It checks only intrinsic exotic prototypes, or caches its verdict per prototype; a test shows a hostile prototype is still refused.
