---
id: CS-898
title: 64-bit integer properties keep their exact value
kind: work
state: proposed
created: 2026-11-21
project: CS-191
---

> **Proposal.** Source: research on CAD and BIM content (chief of staff, 2026-11-21), checked against the code. Why now: it's a live correctness bug, and CAD and BIM content often names its elements with 64-bit IDs. It also blocks CS-338's per-element overrides for that content. Size: small. Decider: owner. Filed 2026-11-21.

## The bug

`componentValue` in `src/io/features.ts` reads `INT64` and `UINT64` properties with `getBigInt64` and `getBigUint64`, then converts them with `Number(...)`. A double holds integers exactly only up to 2⁵³. Larger values, which are common in 64-bit element IDs, come back rounded. So two different elements can get the same ID, and a pick or a lookup can return the wrong element without any error.

## Done when

- `INT64` and `UINT64` property values reach the caller exactly, as `bigint` or as a decimal or hex string. Which form is a call for the API review.
- A test reads a value above 2⁵³ and gets it back unchanged, and a second test checks that two IDs one apart stay distinct.
- Any public type that carries a property value says how 64-bit integers are represented.
