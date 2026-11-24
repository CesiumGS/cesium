---
id: CS-1300
title: Find what holds the GPU's busy share near 37 percent with no measurement running
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-1179]
---

> **Proposal.** Source: CS-1179's report (Dyno's quiet rule), relayed by orch-11's report audit (2026-11-24). Why now: the GPU's busy share held near 37 percent for hours with no measurement running, from a source not found; under the new rule that alone keeps a measurement waiting. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The source of the GPU's busy share with no measurement running is found, or the investigation's steps are recorded with "can't tell".
- If it is our own work, it stops or yields to measurements; if not, the quiet rule's GPU bar accounts for it, backed by a noise test.
