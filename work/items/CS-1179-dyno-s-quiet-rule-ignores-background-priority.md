---
id: CS-1179
title: Dyno's quiet rule ignores background-priority load and checks the GPU, once a noise test shows that is safe
kind: work
state: planned
created: 2026-11-23
project: CS-389
touches: [bench/suite/commands/status.mjs, bench/suite/telemetry.mjs, bench/suite/coldStart.mjs, bench/suite/commands/measure.mjs, bench/suite/DESIGN.md, .claude/skills/dyno/**, test/**]
---

## Problem

The owner, 2026-11-23: "i think dyno's load sensing needs to be aware that some of that load is preemptible and will auto background and won't affect benchmarking, how do we do that?" Later, the same day: "let's force the QoS fix to the front of the queue so we can get everything unblocked".

`dyno status` divides the one-minute load average by the core count and calls the machine quiet below 0.3 per core (`DYNO_QUIET_LOAD`). The load average counts every runnable thread at any priority. On 2026-11-23 the operating system's own indexing and media analysis ran at background priority (`PRI 4` in `ps`) for hours. That held two measurements waiting for quiet, and through the pause it held the merge gates and the executors. In one sample, background work used about 1 core and everything else about 0.8 cores, or 0.1 per core. By that count the machine was quiet, but the load average said 0.47 per core.

On macOS, background-priority work runs mostly on the efficiency cores and yields to foreground work. It still shares the GPU, memory bandwidth and thermal headroom. So whether it leaves our measurements alone is a question for data, not an assumption.

## Done when

1. **Two figures.** `dyno status` reports foreground CPU (processes above background priority) and background CPU separately, in cores and per core. On macOS it reads priorities with no extra privilege. Where the platform can't tell, it falls back to today's load average and says so.
2. **The GPU.** On macOS it also reads the GPU's busy share (IOAccelerator's "Device Utilization %", no sudo) and reports it. A busy GPU counts against quiet on its own bar.
3. **The rule.** The machine is quiet when foreground CPU per core and the GPU's busy share are both under their bars. Background CPU is reported, not counted, unless the noise test says otherwise. The bars are named settings beside `DYNO_QUIET_LOAD`. Measurement records keep the foreground, background and GPU figures, so a later reader can see what ran beside a result.
4. **The noise test.** Before the rule changes, run the same Dyno comparison twice: once with heavy background-priority work and once without, on the same build. Report each scene's spread and whether the primary statistic moves beyond its noise. The record cites the run IDs. If background load does move results, the item says by how much, and the rule counts background load above a stated level instead of ignoring it.
5. **Gates read the same rule.** `dyno status`'s exit code and its `busy` and `waiting-for-quiet` states follow the new rule, so the orchestrator's pause and the merge gates unblock when it does.
6. **Docs.** The `dyno` skill and `bench/suite/DESIGN.md` describe the two figures, the GPU check and the noise test result.
7. Focused tests cover the priority split with fake `ps` output, the GPU read with fake `ioreg` output, the fallback, and the exit codes.
