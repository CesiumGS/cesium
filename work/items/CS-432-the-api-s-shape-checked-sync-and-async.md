---
id: CS-432
title: "The API's shape checked: sync and async, cancelling, lifetimes, events, units and errors"
kind: work
state: planned
created: 2026-11-14
project: CS-437
needs: [CS-101]
---

## Done when

The public surface is checked for shape, and each departure is listed with a proposed fix for the review (CS-102): synchronous against asynchronous, `AbortSignal` wherever work can be cancelled, `dispose` lifetimes, events or subscriptions against polling, units and reference frames named in types, and errors that say what to do. It also compares idioms with three.js, Babylon.js and MapLibre, as CS-102 asks. And no WebGPU type sits in a signature that a second renderer would have to honour (`docs/design/investigations-2026-11-13.md`, the rules for the API review; `docs/design/layers-engine-renderer-backend.md`).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 15.2.
