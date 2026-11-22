---
id: CS-997
title: Is StableId a branded type?
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: B
answered_at: 2026-11-22T21:31:48.310Z
answered_via: question-tool
answered_by: owner
---

## Question

StableId is a plain bigint, and CS-898 made 64-bit property values bigint too, so a property value could be passed as an ID. Brand it?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Keep type StableId = bigint.
- B. Brand it (bigint & { readonly __stableId: unique symbol }), made only by stableIdOf and parseStableId.

Recommended: can't tell.

## Answer

Open.
