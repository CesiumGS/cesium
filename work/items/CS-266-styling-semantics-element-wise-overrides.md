---
id: CS-266
title: "Styling semantics: element-wise overrides, strings and 64-bit IDs, the colour model, labels, porting order?"
kind: decision
state: dropped
created: 2026-11-13
project: CS-190
decider: owner
reason: "Superseded by the owner's piecewise answers of 2026-11-23: per-feature state (CS-1108), strings and an item rate in the IR (CS-1136), the color model (CS-1141), missing values (CS-1142), label placement (CS-1137), units (CS-1139); 64-bit IDs are CS-898 and CS-936. The key's width on the GPU moves to CS-1081. Closed as superseded on the owner's word."
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

## Note (2026-11-23)

The owner chose per-feature state (2026-11-23, CS-1108 A): run-time columns keyed by stable ID that styles read. The host builds its override table on them, and the edit layer, labels and search use the same mechanism. No separate override table.
