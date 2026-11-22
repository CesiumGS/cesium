---
id: CS-908
title: Gaussian splats from USD's ParticleField into the splat render feature
kind: work
state: proposed
created: 2026-11-22
project: CS-191
needs: [CS-277, CS-901]
---

> **Proposal.** Source: `docs/design/simready-and-usd.md` (CS-833). Why: SimReady's NuRec profile and one sample put Gaussian splats in USD. It needs the splat render feature (CS-277) and the reader (CS-901). Size: medium. Decider: owner. Filed 2026-11-22.

## Done when

- A USD source writes ParticleField splats as rows of the registered splat render feature (CS-848's render features), so the splat renderer draws them.
- They are picked by CS-832's rule for opacity 0.5.
