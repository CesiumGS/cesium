---
id: CS-1198
title: Can a correct df64 route-center pass meet the 1e-7 m bound on any GPU? Settle it before CS-161
kind: work
state: proposed
created: 2026-11-23
project: CS-10
needs: [CS-955]
touches: [packages/core/src/transform/**, docs/design/transform-graph.md]
---

> **Proposal.** Source: the Opus GPU review of CS-955 and its report, relayed by orch-11 with the merge decision CS-1196 (2026-11-24). Why: on the Apple M2 the pass misses the stated 1e-7 m bound by millions of times because relaxed math folds the df64 sums. Before CS-161 puts every draw's center constants on the GPU, we need to know whether a correct pass (for example integer arithmetic, or Slang's precise mode) can meet 1e-7 m at all, or whether the bound or the design must change. Size: medium (a study). Decider: owner. Filed 2026-11-24.

## Done when

- A written answer in `docs/design/transform-graph.md`: whether a df64 or integer route-center pass can keep 1e-7 m at the Earth's surface on WebGPU, with the arithmetic it needs and the evidence (a Lab run or a derivation).
- If it can't, the options for CS-161 (a looser stated bound, the CPU path, another representation) go to the owner as a decision item.
- No accuracy is claimed past what the evidence shows.
