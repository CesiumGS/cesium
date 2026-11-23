---
id: CS-1134
title: Which evaluator does per-feature style work in 2.0?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:22:11.159Z
answered_via: question-tool
answered_by: owner
---

## Question

2.0's architecture lists no CPU style evaluation as its win over 1.x, but the styling runtime evaluates per feature on CPU jobs. Which evaluator does per-feature work?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. GPU first: whatever lowers to the GPU runs there; the runtime's CPU jobs handle strings, aggregation, generators and CPU-side picks and queries; the planner decides per expression.
- B. Always the runtime.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
