---
id: CS-989
title: Accuracy statements gain a drawing term for the GPU's arithmetic, and the docs say statements cover the float64 math until then (CS-987 A)
kind: work
state: planned
created: 2026-11-22
project: CS-10
needs: [CS-987]
---

> **Committed by the owner (2026-11-22), through CS-987 A.** Source: the Fable accuracy review (`fable-review-accuracy.md`, F6).

## Done when

- Now: the docs and the handbook's precision tab say that accuracy statements cover the float64 math only, not what the GPU's arithmetic does when it draws. The tab stops saying compiled routes keep their millimeters.
- Before beta.1: `routeAccuracy`, a pick's terms and `accuracyOf` gain a drawing term, from measured GPU error per device class (CS-921, CS-955), named and documented.
