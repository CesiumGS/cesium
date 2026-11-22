---
id: CS-863
title: "CS-831 D3: may a source turn polling of its own server into pushes?"
kind: decision
state: done
created: 2026-11-21
project: CS-579
decider: owner
answer: A
answered_at: 2026-11-22T06:05:36.925Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-552 settled that no source polls. A collaborative view of a server with no push channel then never sees others' edits until reload.

From CS-831's design (`docs/design/editing.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. A source may check its server's version on an interval it declares and turn what it learns into pushes. The engine never polls, and a source without push says `live: false`. (cost: changes CS-552's rule, inside sources only.)
- B. Keep "no source polls". (cost: collaboration only on servers that push.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A. A source may poll its own server's version on a declared interval, under the shared budget, and turn it into pushes. The engine itself never polls.
