---
id: CS-1333
title: "Spike: glyphs by the coverage kernel or a distance-field atlas"
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-258]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.6, its item VL), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: labels (CS-259) draw glyphs by one of two methods, and the choice needs measurements, not a guess. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- One spike page, on the executor's own server, draws the same labels both ways: the coverage kernel over outlines, and a multi-channel distance-field atlas. Its glyph outlines come from a font already licensed for the repository's tests, or from the font the runtime's shaping item adds; it ships nothing.
- It states quality at 10, 12, 16 and 64 pixels, halos of 1 and 2 pixels, GPU time at 2,000 and 20,000 glyphs, and memory per font, measured through Dyno on the Mac's Apple M-series GPU and on the NVIDIA RTX laptop GPU, with run IDs.
- It ends with the decision asked and a recommendation. "Can't tell" is an honest answer for a GPU it couldn't run on.
- It takes the gpu lock for every browser run, and lives under `spikes/` only.
