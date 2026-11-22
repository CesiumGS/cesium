---
id: CS-983
title: "Every Lab parity suite gives a verdict: no regression against the last accepted run, plus the design's thresholds (CS-979 C)"
kind: work
state: planned
created: 2026-11-22
project: CS-199
needs: [CS-979]
---

> **Committed by the owner (2026-11-22), through CS-979 C.** Source: the Fable evidence review (`fable-review-evidence.md`). It extends CS-926, which covers only the two pages that already have pass fields.

## Done when

- Every parity suite in `parity/` returns a `pass` for each row and for the suite. It fails when a row regresses against the last accepted run on the same renderer class, beyond the suite's tolerance, or breaks an absolute threshold that `docs/design/parity.md` states.
- A suite with no rows, an error row or a lost device fails. It never reports "ran".
- Each result file records the build that made it: the commit, a dirty flag and the renderer.
- `dyno lab` exits nonzero on any failing suite, and a planted regression shows it.
