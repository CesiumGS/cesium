---
id: CS-926
title: dyno lab exits nonzero when a row fails, not only on console errors
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: orch-11, reading CS-54's evidence (2026-11-22). Why now: merge evidence quotes "lab exit 0", but `lab.mjs` counts only console errors, and the irWgsl and irGlsl pages don't log a failing row. So a failing row can exit 0. Until this is fixed, merge evidence reads the `pass` fields in the result file. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- `dyno lab` exits nonzero when any row's `pass` is false, on every page, whatever the console says.
- A test plants a failing row on irWgsl and on irGlsl, and the exit is nonzero.
