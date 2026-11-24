---
id: CS-1253
title: `dyno lab --changed` sees both sides of a rename, and never reads a suite name as its base
kind: work
state: proposed
created: 2026-11-24
project: CS-195
needs: [CS-581]
---

> **Proposal.** Source: CS-581's review, relayed by orch-11 (2026-11-24). Why now: with rename detection on, a file renamed out of `packages/core/src/ir` lists only its new name, so the gate can miss it. Nothing tests that `--changed` followed by a suite name isn't read as a git ref. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `changedFiles` passes `--no-renames`, with a test that a file renamed out of `packages/core/src/ir` still selects irWgsl.
- A test shows `dyno lab --changed <suite>` with no base refuses or uses the default base, and never reads the suite name as a ref.
