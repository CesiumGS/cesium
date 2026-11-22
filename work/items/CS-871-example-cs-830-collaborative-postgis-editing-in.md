---
id: CS-871
title: "Example (CS-830): collaborative PostGIS editing in two views, with a conflict shown"
kind: work
state: proposed
created: 2026-11-21
project: CS-579
needs: [CS-870, CS-825]
---

Two views edit one local fixture database through a Part 4 server that pushes changes; a conflict names the feature, both versions and both values. No outside service, no token.

**Proposal** (CS-686). Source: CS-831's design (`docs/design/editing.md`, "Follow-up items"), filed by the chief of staff on 2026-11-21 when the owner merged it. Why now: it is the next piece of editing back through the seams once its needs land. Rough size: see the design note. Decider: the owner, when committing it. Filed: 2026-11-21.

## Done when

- As the design note's follow-up section and the sections it points to describe, with its tests and checks.
