---
id: CS-1149
title: What names content that nobody named? (revisits CS-1100)
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T23:57:07.407Z
answered_via: question-tool
answered_by: owner
---

## Question

From the third architecture review of CS-847 (fable-cs847-architecture-3.md): every remaining finding comes from deriving a name from a URL. Since derived names stay local (CS-1147) and hosts save keys (CS-1088), what names undeclared content?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. A session name: random, minted at open, nothing derived; a declared name is the only way to stable IDs across opens, worlds, runs and peers.
- B. Keep derivation with review 7's fixes.
- C. SHA-256 over the raw URL, with an options encoder and a session-name fallback.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
