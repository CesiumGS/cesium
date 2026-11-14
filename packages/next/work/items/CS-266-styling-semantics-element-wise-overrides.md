---
id: CS-266
title: "Styling semantics: element-wise overrides, strings and 64-bit IDs, the colour model, labels, porting order?"
kind: decision
status: Planned
created: 2026-11-13
project: CS-190
decided-by: owner
---

## Question

Open questions from the styling notes beyond the language's form. Sources: `docs/design/styling-language.md`; `docs/design/styling-and-a-shared-ir.md`; `docs/design/colour-in-the-styling-language.md`; `docs/design/infrastructure-and-geoscience-capabilities.md`.

## Options and recommendation

- **Element-wise overrides:** feature state read by expressions, or an override table applied after the style. The owner's direction of 2026-11-10 is run-time data keyed by stable element ID that the style reads.
- **Strings** (IDs only?) and **64-bit element IDs**; the rules for 1.x's `undefined` and `NaN`.
- **The colour model:** CSS Color 4 spaces in the spec's profile.
- **Labels' collision:** a GPU pass or a CPU-rate stage.
- **Porting order:** lines and polygons first, then marks over 3D content, on the IR from the start.

The sources make no recommendation beyond the overrides direction.

## Answer

Open.
