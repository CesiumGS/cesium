---
id: CS-1338
title: "Design: content as keyed components, and every answer at a declared accuracy that can be refined"
kind: work
state: planned
created: 2026-11-24
project: CS-191
---

> **Proposal.** Source: the owner's review of a host application's needs of the content-source seam, 2026-11-24. The owner asked: "take a step back and look at the requests architecturally. what job are they asking to be done? how might our system elegantly handle the general case for these asks?" Five jobs reduced to two ideas, and the owner answered: "i like this new framing". Why now: the host's needs change the seam's contract, which the API review (CS-102) reads, and today's `FeatureBatch` carries identity, geometry and attributes together, so each need would otherwise be a patch. Size: medium (design). Decider: owner. Filed 2026-11-24.

## The two ideas

1. **Content is keyed components.** A feature is a key. Everything else attaches to the key as a component, from any source, at any time, each with one declared owner: geometry representations (a mesh, an exact B-rep), attribute columns, placement, and host state. This widens the seam's "keyed state, three owners" rule from three fixed owners to a declared owner per component.
2. **Every answer has a declared accuracy and may be refined.** A draw's representation (a coarse mesh, a fine mesh, an exact B-rep, chosen by the view's error), a query's answer (a local answer, then a source's or host server's), and a placement's reference frame accuracy (CS-1322: declared, never inferred) follow one rule. The engine holds a current best answer with its stated accuracy, upgrades it without a jump, and falls back under the shared budget.

## Done when

- `docs/design/content-source-seam.md` gains these two ideas as the seam's model, and states:
  - **Identity in the schema:** which property or row name keys a feature, how a 64-bit integer property becomes key text (so a host can make the same key), and which columns are taxonomies. With CS-961's two-part IDs.
  - **A schema that grows additively, live:** declared late columns are pre-shaped, null until filled, and a push fills them in place, joined by key. Enums grow by appending, as category keys whose own attributes (visibility, overrides by group) a host writes as style inputs, with no recompiling (with CS-55 and CS-1245). Any other schema change stays an invalidation, and the two-outcome rule holds for values for features that aren't resident.
  - **Derived geometry inherits identity:** edges, silhouettes, outlines and section caps carry the feature of what they came from (CS-1336).
  - **Exact geometry as a representation of a draw:** a B-rep is a `DrawSink` geometry on the experimental tier, with features per body, material per face, instances and placement as for meshes. The engine chooses a representation per view under the shared budget (CS-322, CS-317) and draws the mesh when the exact form is dropped. Preparation is a job whose output is plain data a tile can carry (with CS-89).
  - **One placement:** a reference frame by its registered name, as plain data that works in worker mode, plus a float64 origin and local coordinates, for rows, extents and B-reps alike. Measurement reads the reference frame's accuracy.
  - **Staged queries:** asynchronous, cancelable answers by key, each with its accuracy, upgrading a local answer (CS-1284, CS-1285, CS-303, CS-302).
  - **Composition as a join:** a source adds components to keys another source produced, in the shared key space that declared names give, without wrapping that source or rewriting its draws (with CS-554 and CS-991). It says who answers a query by key when several sources contribute, and which source's writer takes an edit.
- It says where the model stops. The model is logical: a tile's batch stays co-located for the GPU, a projection of the joined components, patched when one arrives. It is not a general database, and `DrawSink` keeps its handles.
- It names the two measurements that decide whether the model holds: the join's cost at tile load, and the key registry's memory per resident feature. The first follow-up it lists takes them through Dyno.
- It says which filed items become components or steps of this model, and how: CS-338 (overrides at scale), CS-1116 (the feature mask), labels by feature, CS-1284, CS-1285, CS-303, CS-961, CS-991, CS-554.
- It lists the follow-up items in order with their needs, for the main session to file. Questions only the owner can answer become decision items. The tile format for view-refined exact content stays with CS-305 and CS-576.
- CS-102 gets a note pointing at the amended seam, and the handbook's architecture tab says what changed, with its "checked" date.
- Nothing in the repository names a particular host application.

Planned by the owner on 2026-11-24 ("Plan it now"). Design-heavy, so it runs on the most capable model.
