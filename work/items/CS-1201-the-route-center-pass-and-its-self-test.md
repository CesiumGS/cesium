---
id: CS-1201
title: The route-center pass and its self-test measured on a second GPU vendor
kind: work
state: proposed
created: 2026-11-23
project: CS-10
needs: [CS-955]
touches: [bench/results/**, docs/design/transform-graph.md]
---

> **Proposal.** Source: the Opus GPU review of CS-955 and its report, relayed by orch-11 with the merge decision CS-1196 (2026-11-24). Why: this Mac has only an Apple GPU, so no number for NVIDIA, AMD or Intel GPUs is claimed. One command runs it on another machine: `npx @cesium/dyno lab irWgsl --port <n>`, then read the center-pass rows and the self-test's verdict. Waits for a second machine that runs the Lab (the Windows laptop). Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A Lab run on a non-Apple GPU, with its run ID, and the center-pass errors in meters at the Earth's surface for each route kind.
- `docs/design/transform-graph.md` states which vendors are measured and which path each takes.
