---
id: CS-383
title: Timeouts and failure kinds for one-off worker loads
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-145]
---

## Done when

- The sky pack, star map and glare kernel loads fail within a deadline when their origin stalls, with a failure kind (timeout and its phase, network, a status class, decode).
- No failure message carries a URL, a query string or a header value.

Their retries wait until CS-88 owns these loads; that half is CS-508, split from this item on 2026-11-15 (accepted, the plan's question 7).

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, section 12.
