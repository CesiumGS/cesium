---
id: CS-665
title: "The legacy-glTF module: glTF 1.0 and the deprecated extensions upgraded on load"
kind: work
state: planned
created: 2026-11-17
project: CS-191
needs: [CS-556, CS-274]
---

## Done when

- Core refuses glTF 1.0, `KHR_materials_common`, `KHR_binary_glTF`, `WEB3D_quantized_attributes`, `EXT_feature_metadata` and `KHR_techniques_webgl` with a message naming the format and the fix.
- An optional module upgrades them on load; `EXT_feature_metadata` maps to its successors, and `KHR_techniques_webgl` falls back to the base color with a warning. Ships in the experimental tier, after beta.1.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
