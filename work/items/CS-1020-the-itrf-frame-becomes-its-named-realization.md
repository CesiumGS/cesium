---
id: CS-1020
title: The ITRF frame becomes its named realization, confirmed from the EOP series in use, and other realizations are refused (CS-1018 A)
kind: work
state: planned
created: 2026-11-22
project: CS-196
needs: [CS-1018]
---

> **Committed by the owner (2026-11-22), through CS-1018 A, before alpha.1.** Source: the Fable accuracy review (`fable-review-accuracy.md`).

## Done when

- The frame now called `ITRF` is named by the realization its Earth orientation data give, likely ITRF2020. That's confirmed against the EOP series the setup store holds, cited with its version.
- Every frame in the catalog names its realization, in its name or its accuracy note, as the Moon frames already do (DE440).
- A request for another ITRF realization is refused by name until CS-223 adds time-dependent Helmert transformations.
- The 0.26 m difference against SPICE is explained in the accuracy note, or reduced.
