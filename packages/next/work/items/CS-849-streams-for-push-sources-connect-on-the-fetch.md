---
id: CS-849
title: "Streams for push sources: connect on the fetch and credential provider"
kind: work
state: planned
created: 2026-11-21
project: CS-191
needs: [CS-847, CS-809, CS-844]
touches: [packages/next/src/io/**, packages/next/test]
---

Push sources get streams (WebSocket, server-sent events) through `connect` on CS-809's fetch and credential provider, under the same proxies and credentials (CS-844, A).

From CS-552's design and plan (`docs/design/content-source-seam.md`; `docs/superpowers/plans/2026-11-21-content-source-seam.md`, section 3.3), filed by the chief of staff with the owner's answers to D1 to D6 (CS-841 to CS-846). Rough size: small. Decider: the executor, within the plan. Filed: 2026-11-21.

## Done when

- CS-809's provider gains `connect(url, init)` for WebSockets and server-sent events, under the same per-origin header rules, credentials and proxies as `fetch`.
- A token or header value never appears in logs, errors, URLs or test output, as CS-809's test checks for `fetch`.
- A push source in a test receives samples over a local socket fixture, with no polling.
