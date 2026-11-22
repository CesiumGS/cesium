---
id: CS-971
title: Every Slang loop is bounded by a constant, and a test enforces it
kind: work
state: in-progress
created: 2026-11-22
project: CS-8
claimed_by: orch-11-CS-971
---

> **Committed by the owner (2026-11-22), for alpha.1.** Source: the Fable security review (`fable-review-security.md`). It enforces AGENTS.md's GPU-safety rule, which protects every app on the machine.

## Done when

- Every loop in `packages/core/src/**/*.slang` is bounded by a constant, with an early `break`. The review lists about ten that aren't, three of them over buffers that content fills.
- Every buffer index read from data is clamped.
- A test fails on any Slang loop whose bound isn't a constant, shown by a planted loop.
- `npm run shaders:check` passes, and the Metal output of each changed kernel is read with `scripts/dumpMsl.mjs` before its first browser run.
