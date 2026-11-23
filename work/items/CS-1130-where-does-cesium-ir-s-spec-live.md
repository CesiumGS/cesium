---
id: CS-1130
title: Where does Cesium IR's spec live?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:09:03.376Z
answered_via: question-tool
answered_by: owner
---

## Question

Cesium IR's JSON format and conformance vectors must be passed by 2.0's TypeScript compiler and the runtime's Rust interpreter. Where does the spec live?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. In the Rust workspace's IR crate; 2.0 pins a version and runs the vectors in its tests.
- B. A neutral spec repository.
- C. It stays in 2.0's packages/core/src/ir/FORMAT.md.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
