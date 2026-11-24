---
id: CS-337
title: "Scalar fields on any geometry: values, color ramps, legends and picks"
kind: work
state: proposed
created: 2026-11-13
project: CS-196
needs: [CS-1146]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/infrastructure-and-geoscience-capabilities.md`, capability 1, made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-534 (Infrastructure and geoscience data shows in 2.0), so that milestone cannot be checked while this stays proposed. Its old need, CS-265, was dropped as superseded (2026-11-23). Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

Rescoped (2026-11-23) to the contour test case of `docs/design/styling-runtime.md`, section 10.2. Scalar fields work on any representation, on the styling runtime's three rates:

- Values per vertex, element or cell on any representation, drawn through color ramps, transfer functions and bands as GPU-rate style. No generator runs for them.
- One contour expression, such as `contour(elevation, 10 m)` with the unit an IR type (CS-1139), lowers two ways: screen-space isolines in the fragment shader, and generated polylines from the runtime, labeled along the line and pickable, with a CPU form for WebGL 2 (CS-1135).
- The generated form reads the field as a declared viewer input on its side: sampled heights for a CPU job, a texture for a GPU kernel.
- The two lowerings agree to a stated bound in meters per data set, within the field's sample spacing, and the work says "can't tell" where the field's own accuracy is unknown.
- Legends are a CPU evaluation of the same IR. A pick returns the value, or the contour's level.
- The work uses the shapes 2.0 reserves before beta.1 (`docs/design/styling-runtime.md`, section 11): the style stage's outputs, a generated batch in the draw-arguments seam, the viewer-input interface and per-feature state.

Detail: `docs/design/styling-runtime.md`; `docs/design/infrastructure-and-geoscience-capabilities.md`, capability 1.

## Note (2026-11-23)

This replaces the first scope ("values per vertex, element or cell on any representation, with color ramps and transfer functions, legends, and picks that read the value"), which it contains. CS-534 still counts on it. The item stays proposed until the owner decides it (CS-686).
