---
id: CS-1314
title: Per-draw no-pick and no-shadow flags, so unpickable or shadowless features can use the opaque slot
kind: work
state: proposed
created: 2026-11-24
project: CS-191
---

> **Proposal.** Source: CS-848's report (render features: passes in named slots, declared for picks, rays and shadows), which came back partial, relayed by orch-11 on 2026-11-24. Why now: the opaque slot needs every feature to answer picks and cast shadows, so an unpickable or shadowless feature is refused today rather than letting picks lie. Per-draw flags would let it use the opaque slot. They go through the per-draw constants seam. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- Per-draw no-pick and no-shadow flags exist, set through the per-draw constants seam.
- A render feature that declares picks or shadows skipped can register in the opaque slot; its draws carry the flags, so picks pass through it and it casts no shadow.
- Tests on the fake device cover a no-pick draw, a no-shadow draw, and a pick that passes through to the content behind it.
