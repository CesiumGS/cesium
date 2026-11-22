---
id: CS-453
title: What editing should the engine support, with vector data and GIS sources among it?
kind: decision
state: planned
created: 2026-11-14
project: CS-579
decider: owner
needs: [CS-831]
---

## Question

What editing should the engine support: CAD-style mesh editing, b-rep solid modelling, and vector editing with GIS sources (PostGIS and the like, MVT servers, WMS and the other streaming protocols)? Today's content is streamed, immutable and tiled, so: how does edited geometry coexist with tiles, how often do buffers change, where does a modelling kernel sit relative to the engine's seams, which GIS protocols should the engine read, and what happens to an edit when the data is tiled or served by someone else?

Detail: `docs/design/editing.md`, including "Vector data and GIS sources (owner, 2026-11-08)".

## Options and recommendation

- Brainstorm it in its own session now.
- Brainstorm it with the vector renderer's plan, for the vector half, and with design space for the CAD half.
- Leave it until a host needs editing.

Recommendation: split it: the vector and GIS half with the vector renderer's plan, the mesh and b-rep half with design space and the b-rep work, so each answer meets the design it changes.

The owner, 2026-11-21: design the write path through the seams first (CS-831), review it, then answer this decision's vector and GIS half.

## Answer

Open.
