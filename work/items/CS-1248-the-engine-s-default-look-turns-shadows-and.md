---
id: CS-1248
title: The engine's default look turns shadows and ambient occlusion on, with parity, bench and tests pinning their looks
kind: work
state: proposed
created: 2026-11-24
project: CS-8
needs: [CS-1246, CS-23, CS-121, CS-202, CS-55]
---

> **Proposal.** Source: CS-29's report (the Viewer's defaults migrated), relayed by orch-11 (2026-11-24). Why now: contingent on the owner's answer to CS-1246; it stays proposed until then. Size: medium; 14 tests in 7 files, and about 30 parity, bench, example and handbook pages. Decider: owner. Filed 2026-11-24.

## Done when

- `View.ts` defaults shadows and ambient occlusion to on, matching the profile catalog.
- Every parity, bench, example and handbook page that creates a view with no look pins the look it measures, and the 14 tests that assumed off are updated.
- The Viewer's two overrides are removed, which finishes CS-29.
