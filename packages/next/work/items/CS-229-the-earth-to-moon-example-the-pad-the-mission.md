---
id: CS-229
title: "The earth-to-moon example: the pad, the mission clock, stage reference frames, cameras and the flight path"
kind: work
state: planned
created: 2026-11-13
project: CS-188
needs: [CS-228, CS-221, CS-222, CS-220]
---

## Done when

`examples/earth-to-moon/` runs on the public API: the stack on Launch Complex 39B with a T−/T+ clock, every stage a piecewise reference frame, the follow and free-flight cameras and the spec's presets, the flight path in GCRF, ITRF, MOON_ME and the Earth–Moon rotating frame, readouts in four reference frames with their accuracy. Scrubbing backwards across a separation shows the stack whole. Until 5h lands, the replay jumps, labelled, from the pad to the data's first state.

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, sections 14.2, 14.4 and 14.5.
