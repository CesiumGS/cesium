---
id: CS-1229
title: Slang's and the Moon map's workers take workerUrl-style URLs too
kind: work
state: proposed
created: 2026-11-24
project: CS-199
needs: [CS-363]
---

> **Proposal.** Source: CS-363's executor (packaging for pages without a build step), relayed by orch-11 (2026-11-24). Why now: CS-363 adds `Engine.create({ workerUrl })` for content workers only, so pages without a build step still can't host these two. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The Slang compiler's worker and the Moon map's worker load from a URL the host can set, the same way as `workerUrl`, with a test on a page without a build step.
