---
id: CS-853
title: Merge CS-832, the design for semantic metadata and picking
kind: decision
state: done
created: 2026-11-21
project: CS-191
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge. The main session files Q1 to Q4 and the new items it suggests."
answered_at: 2026-11-22T05:42:58.212Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-832, the design note for semantic metadata, stable-ID binding and what a pick means without surfaces (docs/design/semantic-metadata-and-picking.md, plus one index line in CESIUM2_WEBGPU_PLAN.md), into main? It is docs only. Merging doesn't answer its four owner questions (Q1 to Q4); the main session files those as their own items, and the owner's review of the note is still to come.

The note settles how metadata reaches the engine (3D Tiles metadata, glTF EXT_mesh_features and EXT_structural_metadata, USD SemanticsLabelsAPI, host labels, with a precedence rule), how labels are keyed by taxonomy, how they bind to CS-815's stable IDs, how picks, ID images and ray hits return them, and, in a table, what a pick, instance ID, semantic ID and ray hit mean for point clouds, Gaussian splats, labeled fields and learned fields, each a defined answer or a refusal. It leaves room for embeddings and semantic search (CS-817) without a model, and lists what CS-815 and CS-813 must carry. Read first: 'What to read first', which points to 'Decisions for the owner'. Its four questions, each recommended A: Q1, ID images carry 64-bit stable IDs as two u32 words per pixel (CS-813's done-when then changes) or 32-bit indexes plus a table; Q2, a pick in splats names the splat where accumulated opacity first reaches 0.5, with coverage and the top k, or the most blend weight, or both; Q3, the default taxonomy is named 'class' or there is none; Q4, alpha.1 reserves types and names for fields and embeddings, refused by name until built, or nothing. Executor's calls (reversible): a stable ID includes the scene item's key; label precedence is the nearest level per taxonomy, unmerged; the public PickResult drops featureId; point ray hits test discs of the declared spacing and refuse without one; the first USD source reads labels at the default time only. Checked by the orchestrator on main 5e205cde7f (replay a2c3313189 of faea01028d, patch identical outside work/): markdownlint with the root config 0, hitld work check 850 files, staleNames 0, trailers parse. Minor: prettier would rewrap three code-block lines, which the root .prettierignore skips for docs/. A scan of the added text finds nothing internal-only.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge. The main session files Q1 to Q4 and the new items it suggests.
- B. Hold it: Nothing merges; CS-815, CS-813 and CS-833 read the note from its branch.

Recommended: Merge it. Docs only, every check passes, it covers each part the item asks for, and its open questions go to the owner as their own items.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
