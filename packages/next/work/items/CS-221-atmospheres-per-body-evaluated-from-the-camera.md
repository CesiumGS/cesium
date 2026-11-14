---
id: CS-221
title: Atmospheres per body, evaluated from the camera's true place and composited physically
kind: work
status: Planned
created: 2026-11-13
project: CS-188
milestone: 5e sky and light per body
needs: [CS-209]
---

## Done when

Sky radiance agrees with `AtmosphereReference` from the ground to 1,000 km and from the Moon's distance, at the gate's tolerances. Above the atmosphere the sky is black but for the stars and the sun, and the explorer's orbit scenes lose the sunrise colours (confirm the cause first). The Moon seen from the ground is attenuated by the air at its elevation. An Earth-only globe scene's pixels are unchanged.

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 12.
