---
id: CS-1342
title: The styling runtime builds, ships and loads as job types
kind: milestone
state: planned
created: 2026-11-24
project: CS-190
outcome: The styling runtime's Rust workspace builds in CI, its WebAssembly package ships with the engine and loads as job types, and 2.0 pins FORMAT.md and the conformance vectors from the IR crate.
constraints: [CS-1324 c?, CS-1208 c?]
---

## Notes

Joined 2.0.0-alpha.1 (CS-530) on 2026-11-24, when the owner planned CS-1324 and CS-1208 ("Plan all four"). The styling runtime's Rust workspace and its WebAssembly package come first, so later work (labels in CS-259, the WebGL 2 collision path in CS-1328) builds on them rather than on a stand-in. CS-1208 moves FORMAT.md and the conformance vectors to the IR crate, so 2.0 pins one source for them.
