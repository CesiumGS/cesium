---
id: CS-1255
title: Say why a feature style is refused when show and color together run out of vertex-stage slots
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-55]
---

> **Proposal.** Source: CS-55's review, relayed by orch-11 (2026-11-24). Why now: show and color share the vertex stage, which also carries the color's rgb slots, so 600 show numbers plus 200 colored rules are refused at 1,200 without saying why. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The refusal names the vertex stage's shared slots, the count asked for, the limit, and how show and color each add to it, with a test on the example above.
