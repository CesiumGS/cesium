---
id: CS-914
title: OpenUSD in WebAssembly as a test oracle for the USD source
kind: work
state: proposed
created: 2026-11-22
project: CS-191
needs: [CS-901]
---

> **Proposal**, contingent on CS-901's answer A. Source: CS-900's comparison (run `2026-11-22T10-56-32-200Z-apple-metal-3`). Decider: owner. Filed 2026-11-22.

## Done when

- A test or a Dyno instrument composes each fixture with OpenUSD 26.11.1 in WebAssembly, built from tagged sources in the setup store, and compares it with the USD source's output.
- OpenUSD never ships and never becomes a package dependency. The oracle runs only where the setup store has its build.
