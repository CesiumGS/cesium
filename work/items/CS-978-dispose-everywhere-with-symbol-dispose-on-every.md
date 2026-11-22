---
id: CS-978
title: dispose() everywhere, with Symbol.dispose on every disposable (CS-976 A)
kind: work
state: planned
created: 2026-11-22
project: CS-437
needs: [CS-976]
---

> **Committed by the owner (2026-11-22), through CS-976 A.** Source: the Fable API review (`fable-review-api.md`, finding F7). The chief of staff placed it in alpha.1, since renaming before the first public release costs users nothing (reversible).

## Done when

- Every class that ends a lifetime has `dispose()` and `[Symbol.dispose]`. `destroy()` is gone, or stays as a deprecated alias only if the 1.x naming rule (the API review's F11) says to keep 1.x names.
- Examples, the handbook and the tests use `dispose()`.
- `api/surface.txt` is committed with the change.
