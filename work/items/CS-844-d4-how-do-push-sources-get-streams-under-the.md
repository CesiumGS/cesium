---
id: CS-844
title: "D4: how do push sources get streams under the same proxies and credentials?"
kind: decision
state: done
created: 2026-11-21
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T05:07:02.748Z
answered_via: question-tool
answered_by: owner
---

## Question

Push sources need streams (WebSocket, server-sent events) under the same proxies and credentials as `fetch`. CS-809's provider covers `fetch` only.

From CS-552's design (`docs/design/content-source-seam.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. Add `connect` to CS-809's provider in a follow-up after CS-809 merges. (cost: one more item.)
- B. Widen CS-809 now. (cost: delays CS-809.)
- C. Push sources open their own connections. (cost: credentials and proxies bypass the provider.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A: `connect` for streams goes on CS-809's provider, in a follow-up after CS-809 merges (CS-849).
