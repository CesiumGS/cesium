---
id: CS-1128
title: "CS-921's remaining minors: the rounding assumption, overflow wording, the wide floor, the tie note and the corridor budget"
kind: work
state: proposed
created: 2026-11-23
project: CS-10
needs: [CS-921]
---

> **Proposal.** Source: CS-921's last Opus review (2026-11-23). None is Important. Size: small. Decider: owner. Filed 2026-11-23.

## Done when

- `centerTerm.ts`'s header states round-to-nearest for the i32-to-f32 conversion as a platform assumption, since WGSL allows either neighbor. The product guard's 512-unit band holds either way.
- The header says that "falls back only on overflow" means any partial sum overflowing, not only the final term, within the wide bound.
- The wide floor is tightened toward 0.1 after a sweep of the seeds. It's 0.05 today, against a measured worst of 0.131.
- The tie note moves to where the off-by-one whole unit actually happens, for example an eye at −647,483,647.5.
- The corridor's size budget (39,500 characters) is re-measured when the next helper lands.
- Round 3's generator caps and its text-tied `wide` lines are closed as settled by round 5.
