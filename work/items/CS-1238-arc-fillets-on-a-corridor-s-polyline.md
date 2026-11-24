---
id: CS-1238
title: Arc fillets on a corridor's polyline
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-56]
---

> **Proposal.** Source: CS-56's review; the plan has it, and no item covers it, relayed by orch-11 (2026-11-24). Why now: without fillets the offset map jumps at corners, which is why the search can't count as a kink for the road. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- A corridor's polyline has arc fillets at its corners, the offset map is continuous through them, and a test shows no jump.
