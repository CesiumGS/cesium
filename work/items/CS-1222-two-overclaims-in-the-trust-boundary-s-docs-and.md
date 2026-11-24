---
id: CS-1222
title: Two overclaims in the trust boundary's docs, and a null-prototype Date copied as {}
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-1188]
---

> **Proposal.** Source: CS-1188's scoped Opus check, relayed by orch-11 (2026-11-24). Why now: the docs promise more than the code does. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `docs/design/trust-boundary.md` line 29 ("a record's prototype is never read") and `copyIn.ts` line 24 ("a refusal costs no copy") say what the code does.
- A Date with a null prototype is refused or copied as a Date, with a test.
