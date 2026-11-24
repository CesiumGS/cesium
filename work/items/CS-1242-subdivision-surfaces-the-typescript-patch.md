---
id: CS-1242
title: "Subdivision surfaces: the TypeScript patch conversion, OpenSubdiv in WebAssembly, or both?"
kind: decision
state: planned
created: 2026-11-24
project: CS-193
decider: owner
---

> **Decision for the owner.** Source: CS-577's spike, relayed by orch-11 (2026-11-24), text confirmed by a scoped check. CS-312 needs it. Filed 2026-11-24.

## Question

CS-577 measured both routes on the same cages (`spikes/subdivision/README.md`; Dyno run 2026-11-24T12-15-15-415Z-apple-metal-3, and `spikes/subdivision/memory.mjs` for memory). Which conversion does CS-312 build on, and does OpenSubdiv ship?

## What the spike found

- Patches: the same count at every level, and the same exact surface on regular faces. Both routes are exact at the cage's vertices.
- Accuracy at extraordinary vertices: OpenSubdiv's caps are 10 to 12% closer in position and 1.6 to 1.8 times closer in normal angle, with about the same convergence rate. On a 1 m geodesic sphere at level 4, that is 1.15 mm against 1.03 mm; the reference's own spread there is 0.11 mm.
- Time: the Lab run was taken with the machine under load. About the same on regular cages. OpenSubdiv is 2.4 to 4.5 times faster on cages full of extraordinary vertices: 3.1 s against 0.7 s for 15,360 faces at level 4. The TypeScript route isn't optimized.
- Memory, measured the same way for both (peak resident set of a fresh Node process above a baseline, two runs): the TypeScript route uses about half up to 25,000 patches (26 to 61 MiB against 69 to 98). They are about equal from 150,000 to 340,000 patches (670 against 720 MiB at the largest). Not a reason to choose either.
- Download: 3.3 KB gzipped against 77.5 KB, about 23 times as much.
- License: TOST 1.0, which is Apache 2.0 with a different trademark section.
- Provenance: OpenSubdiv v3_8_0 was verified by git object IDs against GitHub's API; the release has no checksum or signature. Nothing downloaded or built is in the repository.

## Options

- A. The TypeScript conversion only.
- B. OpenSubdiv in WebAssembly only.
- C. Both: TypeScript by default, OpenSubdiv as an optional module for cages with many extraordinary vertices.

No recommendation was relayed; the spike leaves the choice to the owner.
