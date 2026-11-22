---
id: CS-831
title: "A design for editing back through the seams: write capabilities, an edit layer, change sets, conflicts and collaboration"
kind: work
state: planned
created: 2026-11-21
project: CS-579
touches: [packages/next/docs/design/editing.md, packages/next/docs/design]
---

The owner, 2026-11-21: "we also need to think about how editing works back through all of the seams we just called out. for example, for the PostGIS thing, how might we push data edited in a 2.0-based application back to the database? or for 3d tiles? or any other content source. so we could enable collaborative editing of these content sources when they support that." The owner chose to design this first and review it before CS-453 is answered.

Today the plan treats content as streamed, immutable and tiled. CS-453 (what editing the engine supports) points to `docs/design/editing.md`, which doesn't exist yet.

Source: the owner's review of 2.0's seams, with the chief of staff. Why now: the content-source seam (CS-552) freezes in alpha.1, and write-back changes its shape. Rough size: medium (a design note). Decider: the executor writes it, and the owner reviews it. It answers or raises CS-453's vector and GIS half. The CAD and B-rep half stays with the B-rep work. Filed: 2026-11-21.

## Done when

- `docs/design/editing.md` designs the write path through every seam, starting from this sketch:
  - write capabilities declared per source (read-only; update, insert, delete; versioned; transactions; live changes);
  - a local edit layer that draws edits at once as overrides on streamed content, keyed by CS-815's stable IDs;
  - change sets as plain data that can be serialized, undone, redone and replayed;
  - commits through each source's writer, with optimistic concurrency and typed conflicts that name the feature and both versions, never a silent overwrite;
  - a change feed in, through CS-552's push updates, with presence hooks for collaboration.
- For each source, it says how an edit gets back, or that it can't:
  - PostGIS: through OGC API Features Part 4, WFS-T or a host API, never directly from a browser;
  - 3D Tiles: overrides now, then edit the source and re-tile, with version invalidation, building on CS-306's editing overrides;
  - iTwin changesets;
  - USD layers;
  - files, through a writable data-resource provider;
  - app layers, with a CRDT behind the same change-set interface. The engine picks no collaboration algorithm.
- It names what must be in CS-552's alpha.1 seam (the capability declaration, the override contract and the change-set type) and what can come later as modules.
- It proposes the follow-up items, including a collaborative PostGIS editing example for CS-830.
- The owner has reviewed it, and CS-453's vector and GIS half is answered or raised again as a decision.
