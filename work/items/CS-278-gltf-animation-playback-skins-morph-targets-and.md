---
id: CS-278
title: "glTF animation playback: skins, morph targets and animated nodes"
kind: work
state: planned
created: 2026-11-13
project: CS-191
needs: [CS-212]
---

## Done when

Animations from the file play on 5d's animation core, with compute skinning into per-instance streams and `KHR_animation_pointer`.

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 3; `docs/design/transforms-and-instancing.md`, "Designed for, built later".

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).

The owner, 2026-11-17: glTF animation joins one motion model with the animation core and articulations (CS-647).
