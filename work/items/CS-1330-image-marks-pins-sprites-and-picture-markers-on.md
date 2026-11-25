---
id: CS-1330
title: "Image marks: pins, sprites and picture markers on the point path"
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-261]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.3, its item VP), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: pins and picture markers need no text shaping, so they can replace HTML pins before labels land. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- Points whose shape is an image rectangle in an atlas in the style's group, with coverage from the image's alpha, sized in pixels, from `FeatureSink` rows and from styles.
- A pin with an image replaces an HTML pin in one example that uses one.
- The handbook's vector tab says what's built.
