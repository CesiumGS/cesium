---
id: CS-1212
title: Merge CS-1179, Dyno's quiet rule reads foreground, background and GPU load
kind: decision
state: planned
created: 2026-11-24
project: CS-389
decider: owner
---

## Question

Merge CS-1179 into main? Dyno's quiet rule stops using the load average and reads foreground CPU, background-priority CPU and the GPU's busy share, each against its own bar.

As you asked, at the front of the queue. `dyno status` now splits CPU by priority (priority 4 and below is background, read from `ps` with no extra privilege), reads the GPU's busy share from `ioreg`, and calls the machine quiet when foreground CPU is under 0.2 per core, the GPU under 15 percent, and background CPU under 0.2 per core. The bars are named settings; the old load bar stays as the fallback where CPU can't be split. Its noise test found background load lengthened time to settle on both engines, so background counts above its bar rather than being ignored; the review found that result plausible but not settled (one run per arm, with a confound), and the docs now say so, with a repeated interleaved test as a follow-up. Status and the measurement waiter use one exported quiet check, tested with mutations. Risk to weigh: overnight the GPU's busy share sat near 37 percent for hours with no measurement running (source not identified), and utility-priority system work (Spotlight, Creative Cloud) counts as foreground; under the new rule either one alone keeps measurements waiting until it stops, as the old rule did with load. Follow-ups for those. An Opus review found the code sound. Owner path: `.claude/skills/dyno/SKILL.md`. Checked by the orchestrator on the replay e33dd89fde (patch identical outside work/): typecheck, tsc, surface, shaders, eslint and the related tests (149 of 149) pass. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. Measurements then wait on foreground, GPU and background bars instead of the load average.
- B. B. Hold it: Nothing merges; measurements keep waiting on the load average, which counts the OS's background work.

Recommended: A. Merge it. It measures what affects results instead of the load average, and its bars are settings you can tune as the follow-up tests come in.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
