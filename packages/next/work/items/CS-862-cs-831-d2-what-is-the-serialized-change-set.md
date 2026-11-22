---
id: CS-862
title: "CS-831 D2: what is the serialized change-set format?"
kind: decision
state: done
created: 2026-11-21
project: CS-579
decider: owner
answer: A
answered_at: 2026-11-22T06:05:30.345Z
answered_via: question-tool
answered_by: owner
---

## Question

Applications and servers may write the serialized change-set format, so it's a public format.

From CS-831's design (`docs/design/editing.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. JSON with a format name and a 0.x version, experimental until a second writer exists, as CS-836 decided for the IR's JSON. (cost: none now.)
- B. 1.0 at alpha.1. (cost: frozen early.)
- C. No serialized format in the engine. (cost: each application invents one.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A. JSON with a format name at 0.x, experimental until a second writer exists.
