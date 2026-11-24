---
id: CS-870
title: An OGC API Features source and its Part 4 writer, checked against the standard's status and two servers
kind: work
state: proposed
created: 2026-11-21
project: CS-579
needs: [CS-868, CS-869, CS-663]
---

Reads Part 4's current status before building, and corrects the design note if it differs.

**Proposal** (CS-686). Source: CS-831's design (`docs/design/editing.md`, "Follow-up items"), filed by the chief of staff on 2026-11-21 when the owner merged it. Why now: it is the next piece of editing back through the seams once its needs land. Rough size: see the design note. Decider: the owner, when committing it. Filed: 2026-11-21.

## Done when

- As the design note's follow-up section and the sections it points to describe, with its tests and checks.

## A host application's need

On 2026-11-24 a host application said it will write to 2.0 sources that can write, such as OGC API Features and Esri feature services, through the same writer shape it uses for its own models. So it depends on CS-831's edit layer (CS-868) and the writers (CS-870, CS-877, CS-878).
