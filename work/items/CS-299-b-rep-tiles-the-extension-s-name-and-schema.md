---
id: CS-299
title: "B-rep tiles: the extension's name and schema, NURBS or Bézier storage, and the USD input path?"
kind: decision
state: done
created: 2026-11-13
project: CS-193
decider: owner
answer: "Spike first: measure NURBS against pre-split Bézier storage and try a USD input path (CS-576); the name stays a draft."
rationale: "owner, 2026-11-18"
answered_at: 2026-11-18T03:04:41.000Z
answered_via: main-session
answered_by: owner
---

## Question

From the note's "Open" list. Source: `docs/design/breps-and-geometry-queries.md`.

## Options and recommendation

- **The extension:** its name (`BENTLEY_brep` today, a draft) and a schema review.
- **Storage:** NURBS in tiles, or pre-split Bézier patches (size against loader work).
- **USD input:** how to read USD BRep without building OpenUSD to WebAssembly, which the note judges large and risky (inferred, not tried).

The note makes no recommendation.

## Answer

Recorded in the front matter: the owner's answer through the question tool in the chief of staff's session. It wasn't asked through `hitld rights ask`, so it has no check code or ledger entry.
