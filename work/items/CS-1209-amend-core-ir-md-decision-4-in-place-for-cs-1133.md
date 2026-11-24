---
id: CS-1209
title: Amend core-ir.md decision 4 in place for CS-1133
kind: work
state: proposed
created: 2026-11-23
project: CS-10
touches: [docs/design/core-ir.md]
---

> **Proposal.** Source: `docs/design/styling-runtime.md` (CS-1146, merged a2f2493930), section 13's list, relayed by orch-11 (2026-11-24). Why: CS-1133 (Rust and WebAssembly may reach production builds) amends `docs/design/core-ir.md` decision 4, but that file still states the old text. The owner answered the note's open question 14 on 2026-11-24 (below). Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- Decision 4 in `docs/design/core-ir.md` states CS-1133's answer in place, with the owner's answer on naga.
- The styling-runtime note's pointer to it is updated.

## The owner's answer to question 14

The owner, 2026-11-24, asked whether CS-1133's answer also covers naga, the WGSL-to-GLSL shader translator, in production builds for the WebGL 2 route: "Yes, naga is covered (Recommended)", the option that reads "naga is Rust built to WebAssembly, so CS-1133 covers it. CS-1209's amendment says so in place." The styling-runtime note's open item 14 closes with that answer.
