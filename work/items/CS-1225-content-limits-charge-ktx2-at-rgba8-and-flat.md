---
id: CS-1225
title: Content limits charge KTX2 at RGBA8 and flat shading at 56 bytes per index
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-969]
---

> **Proposal.** Source: CS-969's Opus security review, relayed by orch-11 (2026-11-24). Why now: the charges overstate cost, so real tiles hit limits early. They belong with the owner's question on public, raisable limits (CS-969's merge decision, Q1). Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- KTX2 is charged at the size of the format it transcodes to, and flat shading at what it allocates, each with a test.
