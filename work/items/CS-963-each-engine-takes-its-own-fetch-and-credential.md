---
id: CS-963
title: Each engine takes its own fetch and credential provider, defaulting to the page's (CS-958 A)
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-958]
---

> **Committed by the owner (2026-11-22), through CS-958 A.** Source: the Fable seams review (`fable-review-seams.md` in the shared notes). Before beta.1.

## Done when

- Each engine takes its own fetch and credential provider, defaulting to the page's.
- Two engines on one page can use different credentials. A test shows a request from each going out with its own.
- The provider reaches worker mode.
