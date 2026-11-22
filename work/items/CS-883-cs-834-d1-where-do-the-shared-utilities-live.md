---
id: CS-883
title: "CS-834 D1: where do the shared utilities live?"
kind: decision
state: done
created: 2026-11-21
project: CS-615
decider: owner
answer: A
answered_at: 2026-11-22T06:33:45.247Z
answered_via: question-tool
answered_by: owner
---

## Question

Where do shared utilities (math, small containers, IDs, readers) live in the package map? From CS-834's package map, asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. In core, under one `@cesium/core/internal` subpath that first-party packages share. It isn't public API, so it can change freely. (cost: outside projects can't use it.)
- B. Their own public package, such as `@cesium/utilities`. (cost: public API under semver, changed only in a major release.)

Recommended: A, the map's recommendation. A module can be promoted to a package later through the API review.

## Answer

The owner, 2026-11-21: A, internal for now. Promote a module later if a consumer (1.x, iTwin, a host) needs it.
