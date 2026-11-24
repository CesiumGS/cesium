---
id: CS-621
title: The core installs alone, and the whole engine installs from one umbrella package
kind: milestone
state: planned
created: 2026-11-17
project: CS-615
outcome: A host installs only the core, or the whole engine through `cesium@2`, with every package at one version.
constraints: [CS-616 c?, CS-617 c?, CS-618 c?, CS-363 c?, CS-310 c?, CS-834 c?, CS-882 c?, CS-943 c?, CS-977 c?, CS-978 c?, CS-1001 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

From the owner's release planning on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`). Release: alpha.1. Its items are constraints marked `c?` until shaping links each to a clause.

CS-310 (the OCCT license check) joined on 2026-11-17 (owner): packages can't split until it's known whether OCCT can ship.

CS-834 (the package and seam map) and CS-835 (the move to it) joined on 2026-11-21, on the owner's word.

CS-882 (PROJ behind a coordinate-operations seam) joined on 2026-11-21, from CS-834's package map.

CS-835 (the move into packages) moved to CS-614 on 2026-11-21, which breaks a loop between the two milestones. The package split here then follows the move.
