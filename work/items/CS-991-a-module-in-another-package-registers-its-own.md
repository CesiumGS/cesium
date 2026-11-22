---
id: CS-991
title: A module in another package registers its own content-source kind by package name, documented, on the experimental tier
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-847]
---

> **Committed by the owner (2026-11-22).** Source: a request from another of the owner's projects, which builds a content module outside this repository. Why: an outside module must work against 2.0 by package name alone, with no patches to the engine.

## Done when

- A module in another package registers its own content-source kind, with its asset resolver and fetch provider, importing the engine only by package name. It uses the seam's experimental tier.
- The way to do it is documented, with a worked example that lives outside the engine's source folders.
- A test registers a kind from a separate package in a temporary project, installed from a packed set (CS-938), and loads content through it.
- Render passes for outside modules are out of scope.
