---
id: CS-898
title: 64-bit integer properties keep their exact value
kind: work
state: planned
created: 2026-11-21
project: CS-191
---

> **Committed by the owner for alpha.1 (2026-11-21).** Source: research on CAD and BIM content (chief of staff, 2026-11-21), checked against the code. Why now: it's a live correctness bug, and CAD and BIM content often names its elements with 64-bit IDs. It also blocks CS-338's per-element overrides for that content. Size: small. Filed 2026-11-21.

## The bug

`componentValue` in `src/io/features.ts` reads `INT64` and `UINT64` properties with `getBigInt64` and `getBigUint64`, then converts them with `Number(...)`. A double holds integers exactly only up to 2⁵³. Larger values, which are common in 64-bit element IDs, come back rounded. So two different elements can get the same ID, and a pick or a lookup can return the wrong element without any error.

## Done when

- `INT64` and `UINT64` property values reach the caller exactly, always as `bigint`, whatever their size. `FeatureValue` gains `bigint`, in arrays too.
- Where a 64-bit property has `offset`, `scale` or `normalized`, the result follows what the 3D Tiles metadata specification says for those types. Check the specification and cite it in a comment.
- A test reads a value above 2⁵³ and gets it back unchanged, and a second test checks that two IDs one apart stay distinct.
- `FeatureValue`'s doc comment says that 64-bit integers are `bigint`, and that `JSON.stringify` throws on them, so code that serializes values converts them first.
- `npm run surface` is rerun if the type change shows there, and `api/surface.txt` is committed with it.

## The owner's answers (2026-11-21)

- Always `bigint` for `INT64` and `UINT64`, rather than a decimal string or a number when it fits.
- Committed for alpha.1: CS-530 needs this item.
