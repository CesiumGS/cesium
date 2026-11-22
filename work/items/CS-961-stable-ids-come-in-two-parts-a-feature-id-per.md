---
id: CS-961
title: "Stable IDs come in two parts: a feature ID per content and an instance ID per placement (CS-957 A)"
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-957]
---

> **Committed by the owner (2026-11-22), through CS-957 A.** Source: the Fable seams review (`fable-review-seams.md` in the shared notes). Before alpha.1: the ID's meaning is a one-way door.

## Done when

- A pickable thing has a feature ID, derived from its content and the same wherever the content is placed, and an instance ID for the placement.
- Edits, metadata and labels name the feature ID. Picks, ray hits and the ID image report both IDs.
- CS-815's identity design and its doc comments say so. The ID image carries the instance, in its own channel or a combined form, with its GPU memory cost stated.
- Tests place one content twice and show the same feature ID with two instance IDs.
