---
id: CS-274
title: "glTF 1.0 and deprecated extensions: upgrade on load, or drop?"
kind: decision
state: done
created: 2026-11-13
project: CS-191
decider: owner
---

## Question

`KHR_techniques_webgl`, `KHR_materials_common`, `KHR_binary_glTF`, `WEB3D_quantized_attributes` and `EXT_feature_metadata` are unsupported. Source: `docs/design/parity.md`, "Extension coverage".

## Options and recommendation

- **Upgrade on load,** as 1.x does.
- **Drop** them, with a clear refusal.

The source makes no recommendation.

## Answer

The owner, 2026-11-17: core refuses these formats with a clear message naming the format and the fix, and an optional legacy-glTF module upgrades them on load: glTF 1.0, `KHR_materials_common`, `KHR_binary_glTF`, `WEB3D_quantized_attributes`, and `EXT_feature_metadata` to `EXT_mesh_features` and `EXT_structural_metadata`; `KHR_techniques_webgl` falls back to the base color with a warning. The module is CS-665, in the experimental tier after beta.1. Record: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
