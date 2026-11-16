---
id: CS-226
title: A declared chord tolerance in `BENTLEY_engineering_frame`, and measured sag for tiles that declare none
kind: work
state: planned
created: 2026-11-13
project: CS-188
---

## Done when

4b's generator writes the tolerance; for a reprojected tile that declares none, the decoder measures its largest face's sag and states it as the tile's display error; picks and snaps on it carry it as an accuracy term. No engine subdivision (owner, 2026-11-07).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 13.4.
