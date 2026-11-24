---
id: CS-1172
title: Dyno's Work board reads live sources cheaply and pauses for measurements
kind: work
state: planned
created: 2026-11-23
project: CS-389
touches: [scripts/vitePluginWork.ts, scripts/workBoard.mjs, scripts/workBoard.d.mts, bench/suite/useWork.ts, bench/suite/views/Work.tsx, bench/suite/workApiRun.mjs, bench/suite/DESIGN.md, test/**]
---

## Problem

On 2026-11-23, with eight executors running, the owner's Dyno server on 5190 used about one core on average. That kept the load above the quiet bar (0.3 per core), so CS-1152's measurement b47a waited for more than an hour.

The page polls only once a minute, so the polling isn't the cause. The server is (`scripts/vitePluginWork.ts`, `scripts/workBoard.mjs`):

- The board keeps each read until its key changes, but the keys change with every executor action. The claims re-read on any ref or worktree change, and the run status, the merge queue and the unmerged list re-read on every ledger event.
- The check (`hitld work check`) re-runs after any file the dev server watches changes, not only item files.
- Each read starts a new `hitld` node process, at about a full core for a second or two.
- A read that brings something new pushes `work:changed`, and every open page reads again.
- A hidden tab skips the minute poll (`bench/suite/useWork.ts`), but it still reads again on every `work:changed`.

So the board's cost grows with the executors' activity, which is exactly when a measurement needs quiet.

## Done when

1. **Quiet rule.** While a measurement is waiting for quiet or running (what `dyno status` reports as `waiting-for-quiet` or `busy`), the server starts no live re-read and pushes no `work:changed`. The board says, in its own words, that live updates are paused for a measurement and when the snapshot was read. When the measurement ends, one read catches up. The test is a fake status, with no real measurement.
2. **Coalescing.** Changes to refs, the ledger and the run state cause at most one background read per source every 10 seconds, however many arrive. The interval is a named constant. The check re-runs only when an item file under `work/` changes or HEAD moves, not on any watched file.
3. **Hidden tabs.** A hidden tab that hears `work:changed` marks its data stale and reads once when it is visible again, never while hidden.
4. **Fewer processes.** The board's hitld reads run in the dev server's process through hitld's library entry, if hitld v0.1.0-rc.1 exports one. If it doesn't, they share one child process per read cycle rather than one per source, and the report says which.
5. **Measured.** `bench/suite/workApiRun.mjs` gains a configuration with a busy tracker (refs and ledger events changing every second for a minute). It reports the hitld processes started and the CPU seconds they used, before and after, as Dyno run IDs under `bench_runs`. This measurement follows the quiet rule itself.
6. Tests cover each of 1 to 3 with a mutation that fails them. `bench/suite/DESIGN.md` describes the new read cadence. The full suite, type checks, eslint and prettier pass.

## Notes

- The board's answers don't change: the same snapshot, at most about 10 seconds behind while executors work, and paused during a measurement.
- Don't stop or restart the owner's server on 5190. Test on your own port.
- CS-1156 (Merges on Your move say which step each finished item is at) also edits the Work page. Whichever lands second rebases onto the first.
