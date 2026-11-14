---
id: CS-257
title: Should a frame with `geoidFallback` and `allowBallpark` take the ballpark?
kind: decision
status: Planned
created: 2026-11-13
project: CS-189
decided-by: owner
---

## Question

Today it takes the ballpark answer. Source: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Held for the owner, still open".

## Options and recommendation

- **Keep taking it,** as today.
- **Refuse,** so the ballpark is never used where a geoid fallback is declared.

The source makes no recommendation.

## Answer

Open.
