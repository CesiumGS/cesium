---
id: CS-447
title: The cost of antialiased translucency lists, measured, then shading once and covering separately
kind: work
status: Planned
created: 2026-11-14
project: CS-198
---

## Done when

The antialiased translucency lists' cost is measured on NVIDIA and on Windows, where the probe should choose `fsList` and the lists should cost about the single-sampled ones plus the sort's 13%. If they do, "shade once, cover separately" (a single-sampled pass shades each fragment, a trivial multisampled pass covers) is tried on Apple's GPUs only, and kept if it pays.

Detail: `docs/history/m4-visual-parity.md`, "Later (the antialiased lists' cost)".
