---
id: CS-1208
title: FORMAT.md and the conformance vectors move to the IR crate, and 2.0 pins them
kind: work
state: proposed
created: 2026-11-23
project: CS-10
touches: [packages/core/src/ir/FORMAT.md, packages/core/test/**, test/**]
---

> **Proposal.** Source: `docs/design/styling-runtime.md` (CS-1146, merged a2f2493930), section 13's list, relayed by orch-11 (2026-11-24). Why: CS-1130 puts Cesium IR's spec and conformance vectors in the Rust workspace's IR crate, and 2.0 pins a version and runs the vectors. Waits for the workspace, which isn't started and has no item yet. Size: small once the crate exists. Decider: owner. Filed 2026-11-24.

## Done when

- `FORMAT.md` and the conformance vectors live in the IR crate, and this repository keeps a pointer, not a copy.
- 2.0 pins one version of the vectors and runs them in its tests; a version change is a deliberate commit.
