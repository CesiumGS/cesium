---
id: CS-1129
title: Where does the shared styling runtime's code live?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:08:42.007Z
answered_via: question-tool
answered_by: owner
---

## Question

A shared styling runtime (any styling language lowered to Cesium IR; generators, operators, aggregation and labels; plug-in inputs per viewer; output to several viewers) needs a home outside 2.0's monorepo, since other viewers must use it without TypeScript.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. One Rust workspace with the new 3D Tiles decoder: separate crates for the IR, the decoder and the styling runtime, WebAssembly packages for browsers and a C interface for other engines.
- B. Its own repository.
- C. In cesium-native, in C++.
- D. Decide later.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
