---
id: CS-358
title: Snyk findings in the dev server and the bench suite
kind: work
status: Planned
created: 2026-11-13
project: CS-199
---

## Done when

Path traversal and error leaks in the dev server's file endpoints, DOM XSS in the parity pages and bench suite, the open redirect in `limitsTier.ts` and the missing rate limits are fixed; a Snyk rescan shows only false positives, each explained.

Detail: `docs/design/shaders.md`, "To fix (r60)"; `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from the frames example" and "from frames plan 4b".

Was `priority: high` until 2026-11-14; order now comes from what each item unblocks.
