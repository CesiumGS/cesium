---
id: CS-737
title: A classification label on every benchmark result
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-734, CS-728, CS-721]
touches: [packages/next/bench/suite/storage/**, packages/next/bench/suite/commands/result.mjs, packages/next/bench/suite/cli.mjs, packages/next/bench/suite/schema.ts, packages/next/test/bench*.test.ts]
---

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: small.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- Every new run records `classification`, from the store's default or `--classification`, and legacy runs read with the default (tested).
- `dyno result show` prints no raw values without `--values`, and `dyno result fetch` refuses to put a confidential blob into a git working tree (tested).
- A relabel is an event, and the run file doesn't change.
