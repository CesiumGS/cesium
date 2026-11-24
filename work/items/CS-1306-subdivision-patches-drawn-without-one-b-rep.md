---
id: CS-1306
title: "Subdivision patches drawn without one B-rep face per patch: a patch list per coarse face"
kind: work
state: proposed
created: 2026-11-24
project: CS-193
needs: [CS-1242]
---

> **Proposal.** Source: CS-577's report (the subdivision surfaces spike), relayed by orch-11's report audit (2026-11-24). Why now: today addBrep takes about 3 minutes for 154,000 patches, and 338,000 patches exceed a world's 128 MiB arena. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Subdivision patches are drawn without one B-rep face per patch: a patch list per coarse face, written straight to the GPU's span records.
- 338,000 patches fit within a world's arena, and adding 154,000 patches is measured as a Dyno run against today.
