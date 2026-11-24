---
id: CS-1200
title: "Route-center pass upkeep: two index clamps in the emitter, a failed self-test recorded, the device-loss wording"
kind: work
state: proposed
created: 2026-11-23
project: CS-10
needs: [CS-955]
touches: [packages/core/src/scene/world/**, packages/core/src/transform/**, packages/core/src/gpu/**, test/**]
---

> **Proposal.** Source: the Opus GPU review of CS-955 and its report, relayed by orch-11 with the merge decision CS-1196 (2026-11-24). Why: the review's Minors for the pass. They are small, but they belong before any device takes the GPU path. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The two emitter indices the review named are clamped, per the GPU safety rules in `AGENTS.md`.
- A self-test that throws or fails is recorded in the device report rather than swallowed, and the CPU path stays.
- The note on what happens after a device loss says what the code does: the CPU path until the new device's self-test runs.
