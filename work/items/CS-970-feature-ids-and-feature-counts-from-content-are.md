---
id: CS-970
title: Feature IDs and feature counts from content are checked, so one tile can't name another item's features
kind: work
state: planned
created: 2026-11-22
project: CS-191
---

> **Committed by the owner (2026-11-22), for alpha.1.** Source: the Fable security review (`fable-review-security.md`).

## Done when

- Feature IDs and feature counts read from content are checked against the content's own tables before they reach picks, the ID image or metadata.
- An out-of-range ID or a count that doesn't match is refused by name, and never names another item's features or breaks feature IDs for the world.
- Tests cover both, with a hostile tile.
