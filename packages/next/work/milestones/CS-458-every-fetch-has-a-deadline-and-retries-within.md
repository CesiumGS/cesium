---
id: CS-458
title: Every fetch has a deadline and retries within its origin's budget
kind: capability
status: Planned
created: 2026-11-15
project: CS-16
outcome: "Fetches are tested against injected faults; each has a deadline from its origin's measured latency and fails with a structured kind, transient failures retry with backoff inside per-origin budgets, and requests take 1.x's options (proxies, query parameters, headers, credentials)."
needs: [CS-144 c?, CS-145 c?, CS-146 c?, CS-156 c?, CS-383 c?, CS-158 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 6 items are constraints marked `c?` until shaping links each to a clause.
