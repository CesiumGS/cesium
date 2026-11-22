---
id: CS-567
title: The protocol table classifies every member of api/surface.txt, not only the exported names
kind: work
state: done
created: 2026-11-17
project: CS-13
needs: [CS-101]
claimed_by: orch-11-CS-567
touches: [packages/next/src/thread/protocol.ts, packages/next/scripts/surface.mjs, packages/next/test/threadProtocol.test.ts, packages/next/api/surface.txt]
---

CS-101 merged on 2026-11-17 with only part of its "Done when": it gives a kind to the 856 exported names, but not to every one of the 1,062 members in `api/surface.txt`. Its executor left `scripts/surface.mjs` and `api/surface.txt` unchanged, because adding a kind column would break readers outside CS-101's scope. The owner approved the merge with this follow-up, and CS-102 (the public API review) needs it, so the review starts from the whole map.

## Done when

- Every member of `api/surface.txt` has a kind in the protocol table.
- A new member without a kind fails the test, through the per-name checks (`checkProtocol`: unclassified, stale, duplicated, misclassified).
- The test pins no surface totals (the owner's choice of option B, 2026-11-17). Today `test/threadProtocol.test.ts` pins per-entry and total counts, so every change that adds or removes an export has to bump them in this test and in the worker-façade plan, and parallel branches conflict. CS-200 had to do just that for one export. The counts table in section 1 of `docs/superpowers/plans/2026-11-13-worker-facade.md` is generated from `protocolRows()`, or dated as a snapshot.
- Every reader of `api/surface.txt` and of `scripts/surface.mjs`'s output still works, or is updated in the same change, with each one named in the report.
- The full suite passes.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table (CS-101's row).
