---
id: CS-722
title: Benchmark results are shared across machines, and dyno is one command
kind: milestone
state: planned
created: 2026-11-19
project: CS-389
outcome: Every run records its device, configuration and machine state; results from every machine sit in storage dyno manages, and Trends, charts and studies compare devices; and dyno is one non-interactive command that people and hitld call.
constraints: [CS-390 c?, CS-717 c?, CS-721 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check. CS-717's design proposes them.

## Notes

The owner, 2026-11-19: "let's do the 717 design and then take the output from that and the other cli stuff and make a new milestone for them for alpha." It joins 2.0.0-alpha.1 (CS-530).

- **Its items so far:** CS-390, run identity and the run lock, which CS-721 needs and the design's `machine` field builds on. CS-390 also stays in CS-478. Then CS-717, the design, and CS-721, the dyno command.
- **Still to join:** the build items CS-717 lists, once the main session files them.
- **The closure rule:** releases need whole milestones. If a build item needs CS-404 (studies, in CS-480), CS-406 or CS-407 (the hub and remote runs, in CS-481), the owner chooses whether that part moves to beta or those items join alpha.
- **Not in it:** CS-718, hitld's side, which is external and would hold alpha on another project.
