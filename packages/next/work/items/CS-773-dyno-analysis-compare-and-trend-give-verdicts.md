---
id: CS-773
title: dyno analysis compare and trend give verdicts with noise estimates, and bisect hands off to CS-325
kind: work
state: proposed
created: 2026-11-20
project: CS-389
needs: [CS-721]
touches: [packages/next/bench/dyno.mjs, packages/next/bench/suite/commands/**, packages/next/bench/suite/changepoints.mjs, packages/next/test/dyno*.test.ts]
---

CS-721's `dyno` command exits 3, "not built yet", for analysis compare, trend and bisect, and these have no item. An agent or a script that wants a verdict ("is this branch slower than its base?") has to open Dyno's Compare and Trends pages, which a program can't read.

Source: CS-721's report, relayed by orch-11, 2026-11-20. Why now: executors are asked to measure with the benchmark tool and cite run IDs, and with no verdict they cite bare numbers. Rough size: medium. Decider: the executor for the command's shape, within CS-721's JSON contract (`api_version`, `command`, `ok`). Automatic bisection itself is CS-325 and stays there. Filed: 2026-11-20.

## Done when

- `dyno analysis compare <run> <run>` gives a verdict per metric (faster, slower or can't tell) with its noise estimate, and refuses to compare runs from different devices, the same rule CS-738 sets for the Compare page.
- `dyno analysis trend <metric>` lists the baseline runs and any change points, using `changepoints.mjs`.
- `dyno analysis bisect` prints what CS-325 will need and exits 3, naming CS-325, until that item lands.
- Each command prints one JSON object and has `--help`. Tests use stored fixture runs and need no GPU.
