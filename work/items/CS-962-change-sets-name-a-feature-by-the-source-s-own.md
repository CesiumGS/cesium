---
id: CS-962
title: Change sets name a feature by the source's own key, with the engine's stable ID beside it (CS-952 A)
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-952]
---

> **Committed by the owner (2026-11-22), through CS-952 A.** Source: the Fable seams review (`fable-review-seams.md` in the shared notes). Before alpha.1: the change-set format is a one-way door.

## Done when

- A change set names each feature by the source's own key, with the engine's stable ID beside it, so a server or a peer can produce it and read it.
- The change-set format's doc and its version say so, and a test round-trips a change set through a source that knows only its own keys.
