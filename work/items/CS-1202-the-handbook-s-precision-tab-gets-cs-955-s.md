---
id: CS-1202
title: The handbook's precision tab gets CS-955's Apple GPU numbers and the CPU fallback
kind: work
state: proposed
created: 2026-11-23
project: CS-10
needs: [CS-955, CS-1027]
touches: [handbook/src/tabs/precision.tsx, handbook/src/sources.ts]
---

> **Proposal.** Source: the Opus GPU review of CS-955 and its report, relayed by orch-11 with the merge decision CS-1196 (2026-11-24). Why: the precision tab should state the measured Apple M2 numbers and the CPU fallback. CS-1027 is changing the handbook now, so this waits for it. Overlaps CS-989 (accuracy statements cover the float64 math only); do them together if both are ready. Size: small. Decider: owner (the handbook is for outside readers). Filed 2026-11-24.

## Done when

- The precision tab gives CS-955's Apple M2 figures (from `docs/design/transform-graph.md`), says those routes use the CPU's float64 path there, and claims nothing for unmeasured vendors.
- The tab's checked date and status are updated.
