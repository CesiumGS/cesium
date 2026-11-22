---
id: CS-948
title: test:data's dish-tracks fails in full runs under load and passes alone
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: orch-11's gates on CS-938 and CS-919 (2026-11-22). Why: it failed once under load in each of two merges, at loads of 60 to 72, and passed alone twice each time (60 of 60). Each merge's evidence has to explain it, and it isn't flaky until a cause is shown. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- The failure's message is captured under load.
- The cause is found and fixed (a timeout, a shared resource, or ordering), or shown to be the machine's, with evidence.
- A full `test:data` run under load passes.
