---
id: CS-1326
title: Text shaping and label candidates as runtime jobs
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-1324]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.11, its item RS), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: labels wait on the runtime (Q2), and shaping is its first CPU job; the owner chose the licenses (Q7: "OFL font, permissive crate (Recommended)"). Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Text shaping and candidate positions run as runtime jobs on the CPU (CS-1137), with a font under the SIL Open Font License and a Rust shaping crate under a permissive license such as MIT or Apache-2.0, writing `glyphRun` rows: per label its anchor, feature key, candidates and, along a line, its window of up to 16 simplified vertices; per glyph its glyph, offset and advance.
- Before either is added, each is checked for license, maintenance and security, and the report names both for the owner's review.
- The font's glyph outlines go into the glyph table the drawing side reads (the design's section 3.2).
- Tested on fixtures in the runtime's crate and through the WebAssembly package in 2.0.
