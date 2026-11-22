---
id: CS-985
title: A declarations report beside api/surface.txt records signatures, as an owner path (CS-981 A)
kind: work
state: planned
created: 2026-11-22
project: CS-437
needs: [CS-981]
---

> **Committed by the owner (2026-11-22), through CS-981 A, before beta.1.** Source: the Fable evidence review (`fable-review-evidence.md`).

## Done when

- A declarations report, generated from the packed `.d.ts` files, records every public export's signature beside `api/surface.txt`.
- It's an owner path, so a signature change needs the owner's merge.
- `npm run surface -- --check` fails when a signature changes without the report.
