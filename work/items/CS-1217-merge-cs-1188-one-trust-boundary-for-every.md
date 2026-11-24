---
id: CS-1217
title: Merge CS-1188, one trust boundary for every content-source inlet
kind: decision
state: planned
created: 2026-11-24
project: CS-191
decider: owner
---

## Question

Merge CS-1188 into main? Every content-source inlet now copies what a source pushes through one shared module, checked by three invariants: no late reads, bounded work and closed text.

As your step back on CS-847 asked (CS-1186 A), this replaces inlet-by-inlet patches with one module, packages/core/src/boundary/, and a schema table per inlet in source/inlets.ts. I1: a pushed value is read once, data properties only, with no getters, species, iterators or prototype lookups beyond the stated ones. Typed arrays are copied through intrinsic length and set. I2: a forged length or count is refused before any allocation sized by it, and a 256 MiB byte budget per call is charged before any copy, so one buffer aliased many times can't multiply the bounds. I3: every refusal is engine text plus a schema path. Under CS-1187 A, sources are trusted code; the stated exceptions are a source's own Error, functions, the job's AbortSignal, and two inlets left to CS-1189 (sinks.draws, SourceHost.fetch). The tests generate hostile values: getters, symbols, proxies, forged and detached typed arrays, other realms, aliased buffers. A heap-growth oracle replaces the old T1. Two Opus checks, gated on the invariants only, as you asked: the first found one I2 break (aliased buffers multiplied the bounds), fixed in one round; the second found I1, I2 and I3 holding, with no Important. Follow-ups, not blockers: the new check for exotic objects costs about 350 µs per class-instance node, so a careless source pushing many class instances could block the main thread for minutes while staying in bounds (fix: check only intrinsic prototypes, or cache per prototype); the byte budgets refuse lines and polygons over about 11M vertices and batches over five float64 columns at the full row count, which the comments don't yet say; two doc sentences overclaim; tests for a change between read and copy, and for an honest maximal batch. No owner paths. Checked by the orchestrator on the replay 1841fefe70 (patch identical outside work/): typecheck, tsc, surface, shaders, eslint and the work check pass; of 3,918 related tests, three failed under machine load. frameCatalog passed alone. noSceneGains' glare test and dish-tracks failed alone too, and both also fail on main at the same load (about 56), so neither is this change's (noSceneGains is CS-538's, awaiting your merge). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`, and the follow-ups are filed.
- B. B. Hold it for the exotic-check cost: One more round fixes the 350 µs per node cost and states the effective limits, then a scoped check, then this decision again.
- C. C. Hold it: Nothing merges; the inlets keep their separate checks from CS-847.

Recommended: A. Merge it. The three invariants hold at every inlet on a scoped check, as your step back set the bar, and the cost finding is bounded and has a local fix.

If unanswered by 2026-11-26T12:00:00Z: C. Hold it.

## Answer

Recorded in the front matter once answered.
