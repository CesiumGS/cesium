---
id: CS-881
title: "CS-834 D3: what prefix do catalog adapters use?"
kind: decision
state: done
created: 2026-11-21
project: CS-615
decider: owner
answer: A
answered_at: 2026-11-22T06:17:14.784Z
answered_via: question-tool
answered_by: owner
---

## Question

What prefix do catalog adapters (STAC, CSW, OGC Records) use?

From CS-834's package map (`docs/design/package-map.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. `catalog-*`, settled when CS-818 (the catalog seam) is committed. (cost: none now.)
- B. `catalog-*` now. (cost: fixes a name before its seam exists.)

Recommended: A, the map's recommendation.

## Answer

The owner, 2026-11-21: A. `catalog-*`, decided with CS-818.
