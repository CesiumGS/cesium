---
id: CS-421
title: Every public call can cross a thread
kind: capability
status: Planned
created: 2026-11-14
project: CS-13
outcome: "On the main thread, reads are promises or per-tick snapshots, writes are setters, functions are modules or programs, and engine internals are out of the main entry."
needs: [CS-103 c?, CS-104 c?, CS-105 c?, CS-106 c?, CS-107 c?, CS-378 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

Migrated on 2026-11-14 from the milestone "reshape" of CS-13 (its `milestones` list and its items' `milestone` key). Its 5 items are constraints marked `c?` until shaping links each to a clause.

Renamed on 2026-11-14 from "Reshape" to its outcome, since HITLd names milestones by the state they reach, with its `outcome` written.

CS-378 joined this milestone on 2026-11-15, on the owner's answer: placement modes go in the reshaping, once the review approves.
