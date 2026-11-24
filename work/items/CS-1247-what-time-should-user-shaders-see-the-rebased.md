---
id: CS-1247
title: "What time should user shaders see: the rebased shader clock, or a monotonic engine time?"
kind: decision
state: planned
created: 2026-11-24
project: CS-14
decider: owner
---

> **Decision for the owner.** Source: CS-121 (the signed transition word and the hourly clock rebase), relayed by orch-11 (2026-11-24). It is a public contract. Filed 2026-11-24.

## Background

Precision near the hour mark needs a rebase. CS-121 made a reversible call: `Engine.time` and `SourceClock.wallSeconds` stay monotonic, as seconds since the engine started in float64, and only the shader clock rebases. CS-121 carries on with A, documented, until this is decided.

## Options

- A. The rebased shader clock (`fsInput.time`, `vsInput.time`, `${view.time}`). It is precise, but drops by 3,600 s once an hour. An animation whose period divides 3,600 s runs on unchanged; others can read `Engine.time` through a uniform.
- B. A monotonic time user shaders own, such as a separate `engineTime` input fed from `Engine.time` in float32. It only counts up, but loses precision with uptime: a 0.06 s step after 11 days, and 1 s after about 3 months.

**Recommendation (the executor's):** A.
