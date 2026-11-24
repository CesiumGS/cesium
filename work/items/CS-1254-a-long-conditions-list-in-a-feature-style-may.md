---
id: CS-1254
title: A long conditions list in a feature style may exceed the WGSL parser's nesting depth
kind: work
state: proposed
created: 2026-11-24
project: CS-10
---

> **Proposal.** Source: CS-55's review, relayed by orch-11 (2026-11-24). Why now: the default inline style path nests one `select(` per condition (`packages/core/src/scene/FeatureStyle.ts`, line 207, unchanged since c22476c673), so a long conditions list may exceed the parser's depth. WGSL's limit of 127 is on brace nesting; the parenthesis depth limit is Tint's own. Likely a bug on main today; not reproduced yet. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A Lab row draws a style with a long conditions list (hundreds of conditions) and states whether Chrome compiles it.
- If it fails, the style path emits a flat form (a chain of `if` statements, or a balanced tree of `select`) that stays under the limit, with a test at the longest list the row found.
