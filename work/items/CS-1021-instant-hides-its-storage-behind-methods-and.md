---
id: CS-1021
title: Instant hides its storage behind methods and states its resolution (CS-1019 A)
kind: work
state: planned
created: 2026-11-22
project: CS-196
needs: [CS-1019]
---

> **Committed by the owner (2026-11-22), through CS-1019 A, before alpha.1.** Source: the Fable accuracy review (`fable-review-accuracy.md`).

## Done when

- `Instant`'s storage is private. Callers use methods for time differences, conversions between time scales, and formatting, never a raw `tt` field.
- Its doc states its resolution, about 0.12 µs near the present, as an accuracy term.
- Before beta.1, a decision item asks whether to split it into two parts.
