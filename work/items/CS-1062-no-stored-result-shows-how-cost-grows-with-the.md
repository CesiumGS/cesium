---
id: CS-1062
title: No stored result shows how cost grows with the scene
kind: work
state: proposed
created: 2026-11-22
project: CS-195
---

> **Proposal.** Source: the Fable performance review (`fable-review-performance.md`, finding F6), 2026-11-22. Severity: Important. Land before: beta.1. Decider: owner.

## Done when

- Add five sweeps to Dyno as studies, each one axis: resident tiles, tilesets on one origin, views on one engine (CPU, GPU and GPU bytes), features styled and picked, standing rays. Run them once before the freeze so the seam reviews have curves.
- The finding's evidence in the review is rechecked first, since the code may have moved.
