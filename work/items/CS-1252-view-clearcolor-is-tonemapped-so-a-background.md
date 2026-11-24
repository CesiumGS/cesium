---
id: CS-1252
title: View.clearColor is tonemapped, so a background color can't be shown as given
kind: work
state: proposed
created: 2026-11-24
project: CS-8
---

> **Proposal.** Source: a host application's measurements, reported by its team (2026-11-24). Why now: `View.clearColor` is documented as "Background color as displayed (already exposed)" (`packages/core/src/scene/View.ts`, line 227), but it clears the scene's HDR target (`packages/core/src/render/view/scenePasses.ts`, lines 452 to 454), so the tonemap and output encoding run over it. With `pbrNeutral` and `srgb` output, a saturated background such as #0000ff can't be reached. A host that inverts the tonemap and adds a post stage to compensate also tints translucent content drawn over the background. Size: small to medium. Decider: owner. Filed 2026-11-24.

The rule this follows is the owner's r26 (`docs/decisions/r4-owner-decisions.md`): unlit color is display-referred and never tonemapped. A background color is display-referred in the same way.

## Done when

- A view's background color can be given as any CSS color (CS-1141's CSS Color 4 handling), and the displayed pixels match it exactly: display-referred, never exposed or tonemapped, like unlit content.
- Translucent content over the background blends with the color as shown, with no host-side inverse tonemap.
- A pixel test covers saturated colors (#0000ff, #ff0000, #00ff00) and a mid gray, under `pbrNeutral` and the other tonemaps, with `srgb` and `gamma2.2` output, on WebGPU and on WebGL 2 (`packages/core/src/webgl2/device.ts`, lines 312 to 314).
- `View.clearColor`'s documentation says what it does, and the atmosphere background is unchanged.
