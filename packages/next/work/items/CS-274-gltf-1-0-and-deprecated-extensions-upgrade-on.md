---
id: CS-274
title: "glTF 1.0 and deprecated extensions: upgrade on load, or drop?"
kind: decision
status: Planned
created: 2026-11-13
project: CS-191
decided-by: owner
---

## Question

`KHR_techniques_webgl`, `KHR_materials_common`, `KHR_binary_glTF`, `WEB3D_quantized_attributes` and `EXT_feature_metadata` are unsupported. Source: `docs/design/parity.md`, "Extension coverage".

## Options and recommendation

- **Upgrade on load,** as 1.x does.
- **Drop** them, with a clear refusal.

The source makes no recommendation.

## Answer

Open.
