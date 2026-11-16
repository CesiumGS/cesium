---
id: CS-157
title: The app's auth-refresh hook
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-156, CS-150]
---

The app's auth-refresh hook among the request options (owner, 2026-11-13). Needs CS-156 and ion tokens (CS-150).

## Done when

- A source's 401 or 403 calls `onAuthFailure` once per generation.
- The source's requests continue with the returned headers or query parameters.
- When the hook returns nothing, those requests fail.
- No returned value appears in any diagnostic.

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
