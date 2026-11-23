---
id: CS-1081
title: Is StableKey's feature encoding, ["feature", source, key(, row)], the persisted format for saved feature IDs?
kind: decision
state: planned
created: 2026-11-22
project: CS-437
decider: owner
---

## Question

CS-847 adds a "feature" kind to the public `StableKey`, encoded as `["feature", source, key]` with an optional row. That encoding is what's hashed into saved feature IDs, so it becomes a persisted format. Is it the format?

From CS-847's executor and the orchestrator (2026-11-22).

## Options and recommendation

- A. Approve it: freeze it as the hashed format, versioned and documented.
- B. Review it first, with StableKey's other encodings, in the API review (CS-102).

Recommended: A.

## Answer

Open. The owner, 2026-11-22: review it first. Ask again with CS-102's API review, which looks at StableKey's encodings together.

The chief of staff's call (reversible): until then, CS-847 keeps the encoding on the experimental tier, and nothing documents it as persisted.
