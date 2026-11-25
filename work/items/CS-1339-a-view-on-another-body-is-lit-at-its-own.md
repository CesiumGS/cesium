---
id: CS-1339
title: A view on another body is lit at its own distance from the sun
kind: work
state: proposed
created: 2026-11-24
project: CS-188
needs: [CS-569, CS-202]
---

> **Proposal.** Source: CS-569's review (Mars as a known body), relayed by orch-11 on 2026-11-24. Today a view with body `MARS` gets the Earth's sun direction in Earth-fixed axes and the Earth-distance illuminance, about 2.3 times too bright at Mars's mean distance. CS-569's fix round turns this into a reported placeholder. Checked against CS-202 (a view on another body; its merge decision is CS-1249): CS-202 already turns the sun direction, stars and Moon into the body's axes, and keeps the outside-air illuminance at 1 AU "until 5e". So this item covers the illuminance by distance, plus a check that CS-202's direction holds for Mars. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A view on another body takes the sun's illuminance from that body's distance from the sun at the view's time, in float64: the outside-air value at 1 AU times (1 AU / r)². At Mars that runs from about 0.36 to 0.52 of the Earth's value over its orbit.
- An Earth view keeps every value it has today, identically.
- A Mars view's sun direction, from CS-202's turn into the body's axes, matches an independent ephemeris to a stated bound.
- CS-569's placeholder report goes, and the "until 5e" note in the code agrees with what's built.
- Tests: Earth identity, Mars at perihelion and aphelion against the inverse square, and the Moon within a stated bound of the Earth's value.
