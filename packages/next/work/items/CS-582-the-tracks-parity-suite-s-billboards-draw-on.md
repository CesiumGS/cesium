---
id: CS-582
title: The tracks parity suite's billboards draw on the first run after a cold server start
kind: work
state: planned
created: 2026-11-17
project: CS-195
touches: [packages/next/bench/**, packages/next/src/vector/**]
tier_override: 2
---

CS-201's executor ran the `tracks` parity suite on 2026-11-18: its first run on the branch was 6 of 8, with both billboard cases drawing 0 red pixels. The rerun was 8 of 8 and matched the base exactly. It was the first run after a cold server start; the base passed on its one run. The cause wasn't found (bench runs `2026-11-18T03-01-26-812Z-apple-metal-3`, 6 of 8, and `2026-11-18T03-04-49-839Z-apple-metal-3`, 8 of 8). The owner merged CS-201 with this follow-up.

## Done when

- The cause is named: a race in the billboard path (an atlas or texture not ready on the first ticks), the harness capturing too early, or something else, shown by reproducing it from a cold server start.
- It's fixed where the cause is, or the suite waits on the engine's convergence rather than a timer, and the change says which.
- The suite passes from a cold start several times in a row, and still fails when a billboard doesn't draw.
