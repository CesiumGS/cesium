---
id: CS-1256
title: `whenReady` shader swaps ask for the waited pipelines first and wait only on what the content draws
kind: work
state: proposed
created: 2026-11-24
project: CS-11
needs: [CS-71]
---

> **Proposal.** Source: CS-71's review, relayed by orch-11 (2026-11-24). Why now: routed pipelines compile one at a time, so warm pipelines asked first delay the swap; and a failure in a pipeline the content never draws can abandon a valid swap. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A `whenReady` swap asks for the pipelines it waits on before the warm ones, with a test on the order.
- The wait set holds only what the content draws: blended ghost keys through `isBlendedGhost`, and clipped keys only where the content is clipped. A test shows a failure in an undrawn pipeline leaves the swap valid.
- `hold(undefined)` is guarded, checked again when CS-972 merges.
