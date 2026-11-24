---
id: CS-1169
title: Does 2.0 accept MapLibre style JSON as a styling front end?
kind: decision
state: planned
created: 2026-11-23
project: CS-10
decider: owner
---

## Question

Does 2.0 accept MapLibre style JSON as a styling front end that lowers to Cesium IR, and if so, how much of it, and when?

CS-557 (MVT vector tiles load through the content-source seam) sends this back as a question, and CS-1146's review found the styling-runtime note answering it without an owner decision. CS-1140 already settled the front ends that do ship: an experimental language of our own and the 1.x styling language, both lowering to the IR. MapLibre is the style format most MVT data comes with.

The format has two parts:

- **Expressions** (JSON S-expressions over feature properties, zoom and feature state). `docs/design/core-ir.md` found them a good input language: no vectors and no `atan2`, so they lower to the IR without new IR features.
- **Whole style documents** (sources, layers, paint and layout properties, sprites and glyphs). Their layout half (symbol placement, text and icons) depends on label placement (CS-1137) and on the styling runtime's outputs, which CS-1146 is still settling.

## Options and recommendation

- A. Expressions now, documents later. An experimental MapLibre expressions front end lowers to the IR alongside MVT (CS-557). Whole style documents follow as their own item once label placement and the styling runtime's outputs settle.
- B. Whole documents with MVT. CS-557 or a sibling item accepts MapLibre style documents (layers, paint and layout) for MVT sources. This needs label placement and the outputs first, so the MVT work waits on them.
- C. Later, on the experimental line. No MapLibre front end before 2.0.0. MVT styles go through our own language and the 1.x front end, and MapLibre is proposed again after 2.0.0.
- D. No. MapLibre style JSON is never a front end. Users convert their styles themselves.

Recommended: A. Expressions are cheap and interoperable, and they need nothing new from the IR. Documents depend on work that hasn't settled, so they wait for it, and the MVT work doesn't have to.

## Answer

Open.
