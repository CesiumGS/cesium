---
id: CS-855
title: Merge CS-831, the design for editing back through the seams
kind: decision
state: done
created: 2026-11-21
project: CS-579
decider: owner
answer: "A. Merge it: The orchestrator replays the rewritten commits onto main's tip, rechecks, fast-forwards main, regenerates the views and logs the merge. The main session files D1 to D5 and the follow-ups."
answered_at: 2026-11-22T06:03:21.750Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-831, the design note for writing edits back through every seam (docs/design/editing.md, replacing its stub, plus one index line in CESIUM2_WEBGPU_PLAN.md), into main? It is docs only. Merging doesn't answer its five owner decisions (D1 to D5); the main session files those as their own items, and the owner's review of the note is still to come.

The note designs: write capabilities declared per source (WriteCapabilities, READ_ONLY); an edit layer that draws edits at once as hide, replace and insert overrides keyed by CS-815's stable IDs, with queries seeing edits; change sets as plain data (patch updates, named-CRS geometry, undo as an inverse commit, replay, a serialized form); commits through each source's writer, optimistic by default, with a typed Conflict naming mine, base and theirs, an overwrite only when explicit and recorded, idempotency and no write retries; a change feed in through CS-552's push updates, with presence as hooks in a module after alpha.1; and security: credentials stay in CS-809's provider, and a browser never writes to a database. How each source's edits get back: PostGIS through OGC API Features Part 4, WFS-T or a host API; 3D Tiles as overrides now, then the upstream writer and a re-tile with version invalidation, on CS-306; Esri applyEdits; iTwin through a host backend and changesets; USD through an edit-target layer; files through a WritableDataResource beside CS-808; app layers through a CRDT adapter, with no algorithm picked; MVT, WMS, WMTS, imagery and terrain can't write. 'What the seam must carry in alpha.1' lists S1 to S11, including a write kind with no write retries in CS-809's provider, and source keys and provisional IDs in CS-815. Read first: 'The write path in one page', then 'Decisions for the owner'. Its five decisions, each recommended A: D1, the alpha.1 change-set type extends CS-552's, or keeps it as written; D2, the serialized change-set format is JSON at 0.x, experimental, or 1.0 at alpha.1, or no engine format; D3, a source may poll its own server's version on a declared interval and turn it into pushes, which changes CS-552's 'no source polls', or stays strict; D4, CS-453's vector and GIS half is answered by this note, or by the vector renderer's plan; D5, the edit layer in alpha.1 ships types, rules and hide, replace and insert in CS-552's core as experimental API, or types and rules only. It proposes 13 follow-ups. Checked by the orchestrator on main 09d77048d1 (replay b3aafc4868 of 4912972b36, patch identical outside work/; the claim's touches conflict with the chief of staff's fix on main was resolved by keeping main's touches and the claim): markdownlint with the root config 0, prettier clean, hitld work check 851 files, staleNames 0. A scan of the added text finds nothing internal-only. The commit messages are being rewritten so their trailers parse, with trees unchanged.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays the rewritten commits onto main's tip, rechecks, fast-forwards main, regenerates the views and logs the merge. The main session files D1 to D5 and the follow-ups.
- B. Hold it: Nothing merges; CS-834, CS-847 and the seam items read the note from its branch.

Recommended: Merge it. Docs only, every check passes, it covers every seam and source the item asks for, and its open questions go to the owner as their own items.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
