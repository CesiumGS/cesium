---
id: CS-1228
title: A build-ID handshake between content workers and their pool
kind: work
state: proposed
created: 2026-11-24
project: CS-199
needs: [CS-969]
---

> **Proposal.** Source: CS-363's and CS-914's reviews, relayed by orch-11 (2026-11-24). Why now: a worker script cached from an older build can run against a newer pool and fail in ways that are hard to trace. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A worker reports its build ID on start, and the pool refuses a worker from another build with a named error, with a test.
