---
id: CS-1133
title: May Rust and WebAssembly reach 2.0's production builds?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: "amend fully: WebAssembly is required to run 2.0, and Rust and WebAssembly are used wherever they help"
answered_at: 2026-11-23T23:21:49.241Z
answered_via: question-tool
answered_by: owner
---

## Question

The owner's 2026-11-13 decision (core-ir.md, decision 4) says Rust and naga never reach a production build. A Rust styling runtime compiled to WebAssembly and running in browsers changes that.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Amend, measured: the runtime's WebAssembly package only, loaded lazily, with size and start time budgeted.
- B. Amend fully: Rust and WebAssembly wherever they help.
- C. Keep the rule.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
