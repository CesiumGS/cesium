---
id: CS-281
title: "Runs on an Intel integrated GPU: the observer cost page, the glare check and indirect draws"
kind: external
state: planned
created: 2026-11-13
project: CS-192
waiting_on: devices
---

## Waiting on

The owner's Intel laptop (UHD 7xx or Iris Xe, Windows 11) running `bench/observerCost.html`, the glare check and `spikes/gpu-check.html`. The indirect-draw hang (Intel article 000102979) is untested on that architecture. Sources: `docs/design/sky-light-and-points-unifications.md`, "Sky and observer results"; `docs/design/indirect-draws-on-intel.md`; `docs/superpowers/plans/2026-11-08-sky-and-observer.md`, Task 16.
