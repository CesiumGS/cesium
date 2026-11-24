---
id: CS-1278
title: Re-run CS-395's example-scene runs after CS-166's settle fix
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-166]
---

> **Proposal.** Source: CS-166, relayed by orch-11 (2026-11-24). Why: run `2026-11-22T20-27-35-715Z-mac-apple` settled every example scene before its tilesets had loaded, so its reference images show unloaded scenes. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- CS-395's example-scene runs are run again after CS-166's settle fix, and each run settles only after its tilesets load.
- The new run IDs replace the old run's in CS-395's references, and the old run is marked as superseded.
