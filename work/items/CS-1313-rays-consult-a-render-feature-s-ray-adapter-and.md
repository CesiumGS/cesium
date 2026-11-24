---
id: CS-1313
title: Rays consult a render feature's ray adapter, and skip a feature that declares rays skipped
kind: work
state: proposed
created: 2026-11-24
project: CS-191
---

> **Proposal.** Source: CS-848's report (render features: passes in named slots, declared for picks, rays and shadows), which came back partial, relayed by orch-11 on 2026-11-24. Why now: CS-848's features declare how they answer rays, but rays ignore the declaration today. Related: CS-1285 (each content declares, per kind of query, whether it answers). Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- A ray consults a render feature's ray adapter when the feature declares one, and skips a feature that declares rays skipped.
- A feature that declares neither is refused at registration, as CS-848 does for missing declarations.
- Tests on the fake device cover a feature with an adapter, a skipped feature and a refused one.
