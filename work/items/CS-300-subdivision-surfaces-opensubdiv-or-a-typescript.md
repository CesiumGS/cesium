---
id: CS-300
title: "Subdivision surfaces: OpenSubdiv, or a TypeScript patch conversion?"
kind: decision
state: done
created: 2026-11-13
project: CS-193
decider: owner
answer: "Spike first, to understand the performance tradeoffs between OpenSubdiv in WebAssembly and a TypeScript patch conversion (CS-577)."
rationale: "owner, 2026-11-18: we need a spike here too to understand performance tradeoffs"
answered_at: 2026-11-18T03:04:41.000Z
answered_via: main-session
answered_by: owner
---

## Question

Subdivision surfaces are planned as another representation for the query interface (owner, 2026-11-10), not designed. Source: `docs/design/breps-and-geometry-queries.md`, "Subdivision surfaces".

## Options and recommendation

- **OpenSubdiv** built to WebAssembly.
- **A TypeScript conversion** to patches for step 5's GPU path.

The note makes no recommendation.

## Answer

Recorded in the front matter: the owner's answer through the question tool in the chief of staff's session. It wasn't asked through `hitld rights ask`, so it has no check code or ledger entry.
