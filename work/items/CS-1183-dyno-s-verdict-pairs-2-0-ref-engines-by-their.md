---
id: CS-1183
title: Dyno's verdict pairs 2.0@ref engines by their config, so two builds of 2.0 compare
kind: work
state: proposed
created: 2026-11-23
project: CS-389
touches: [bench/suite/commands/table.mjs, bench/suite/commands/measure.mjs, bench/suite/report.mjs, bench/suite/DESIGN.md, .claude/skills/dyno/**, test/**]
---

Source: orch-11's report on CS-971's measurement, 2026-11-24. Why now: a change's own before-and-after measurement (two builds of 2.0) gets no verdict, so merge decisions that depend on one can't be made from Dyno's answer. Rough size: small. Decider: owner (commit, drop or shape). Filed 2026-11-23.

## Problem

A measurement that compares two builds of 2.0 (`2.0@<ref>` against `2.0`) ends with "verdict: none (no scene measured by both engines)". This happened for run a085 and again for 2026-11-24T05-28-31-281Z-mac-apple (CS-971's measurement), although every run in it was valid.

Each run records its engine as `2.0`, and keeps the `2.0@<ref>` build only in its config field. The verdict pairs runs by engine, so both sides look like one engine and nothing pairs.

## Done when

1. The verdict pairs runs by the engine and build each one ran (the `2.0@<ref>` label, or a build field the run records), so `2.0@<ref>` against `2.0` and `2.0@<ref1>` against `2.0@<ref2>` each give a verdict per scene.
2. Comparisons of 1.x against 2.0 pair as they do today.
3. The report and `dyno result show` name both builds by their refs.
4. Focused tests cover two 2.0 builds pairing, 1.x against 2.0 unchanged, and a run with no build label.
5. The `dyno` skill says how to measure a change against its base.
