---
id: CS-1322
title: "Frames: does a host's affine transform table with no stated accuracy read as exact or unstated?"
kind: decision
state: done
created: 2026-11-24
project: CS-196
decider: owner
---

> **Decision for the owner, answered.** Source: CS-1022's review (a missing accuracy reads as unstated), relayed by orch-11 (2026-11-24). Filed 2026-11-24.

## Question

CS-1022 makes a curvilinear map with no stated accuracy read as unstated. A host's `FrameResolver` with no `accuracy()` still reads a transform table of affine steps as exact (0 m). It's the same case, but the review asked whether hosts rely on today's behavior. What should an affine table with no stated accuracy read as?

## Options and recommendation

- Unstated, like the rest (recommended by the reviewer): the route's accuracy is undefined, with a note.
- Exact for affine-only tables, said in the `FrameResolver` contract.

## Answer

The owner, 2026-11-24, first: "host's don't rely on today's behavior, it's all in flux, what's the right thing to do for the engine architecture?"

Asked again with the architectural answer (accuracy belongs to the data, not to the form of the math: an affine step is exact as arithmetic, and its float error is precision, but its numbers usually come from measurement, so the engine can't tell), the owner chose "Declared, never inferred (Recommended)".

The rule: exactness is always declared, never inferred from a transform's form. Built-ins that are exact by definition (unit changes, EPSG conversions, a reference frame defined by convention) declare 0 m explicitly. An affine table with no stated accuracy reads as unstated, and so does the route through it, with a note naming the step.
