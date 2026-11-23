---
id: CS-956
title: Merge CS-847, the content-source seam's core
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: "B. A fix round first: Say which of the seams review's findings to fix before it merges (its two Criticals at least); it goes back to its executor, then to the gates and a review, then to you again."
answered_at: 2026-11-23T04:11:41.014Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-847, the content-source seam's core (its types, the kind registry, SourceHost, the shared budget, the sinks, push, and CS-831's three pieces), into main? It adds 75 public names, all experimental, through owner paths (packages/core/src/index.ts and api/surface.txt), and it asks two questions of its own, below. A separate Fable review of the seams, which the chief of staff brings with this question, may lead you to ask for a fix round first.

Every done-when line has a test: types that are data only with the import boundary enforced; a kind registered by module reference with its decoders loaded by URL into every worker; engine.open and world.add for any content; the budget arbiter granting by class and origin over one byte budget (the Mount Rainier test); host.changed waking the engine with changes applied in the apply phase, on a fake stepped clock since CS-816 hasn't landed; an in-memory sample source writing every sink on the fake device; a seam test refusing World, Engine, render or gpu imports in a source module; the handbook's architecture tab. Two Claude reviews found eight and then one Important problem; both rounds fixed them, each with a test and mutations for the budget's: a decoder can't take a built-in job type; content can't draw into a destroyed world or write after destroy; a throwing update returns its grant and its invalidations; settle refuses NaN or negative bytes; prefetch yields to a now want waiting for bytes, and a want larger than the whole budget is refused instead of blocking all prefetch; the seam test catches imports through a barrel; a hung decoder frees its worker slot on cancel; bounded queues; one ID scheme with tilesets. World.feature is now @internal (your CS-922 answer). The chief of staff rebased it onto main after CS-815 merged, the same patch. Its two questions: (1) the public names CS-552's design doesn't give, for CS-102's API review: Engine.sources, SourceRuntime, SourceContent, ContentItem, ContentItemOptions, ContentWorld, OpenOptions, KindRef, DecoderRef, Decoder, DecoderContext, DecoderResult, SourceKinds, UrlResolver, BudgetArbiter, BudgetOptions, Want, WantClass, SourceGrant, SourceClock, SourceView, SourceJobSpec, Credit, PlainValue, SourceExtent, FeatureSchema, RowSink, RowIdentity, FeatureBatch, PointBatch, RasterImage, PropertyColumn, InvalidateChange, EditLayer, Override, ChangeSetLimits, CHANGE_SET_FORMAT, CHANGE_SET_VERSION, changeSetToJson, changeSetFromJson, checkChangeSet, isReadOnly, and the member ContentSinks.images; the executor recommends keeping them as experimental working names and settling them in CS-102. (2) The change-set JSON's format name, cesium-change-set, version 0.1.0, experimental at 0.x per CS-862; the executor recommends keeping it and fixing the name with CS-102; rights who calls it a one-way door. Checked by the orchestrator on main 4f3f026658 (replay 019fd7f268 of 6ef4c512b4 on CS-847's rebased branch, patch identical outside work/): typecheck, tsc -p ., work check, build, npm test exit 0 (407 files, 6,860 tests), test:data, check:bundle, surface current, shaders:check, eslint, the handbook. Main has moved since, so the orchestrator replays again and reruns the gates before merging. CS-903, CS-904 and CS-906, which build on these types, wait for this answer.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the gates, fast-forwards, regenerates the views and logs the merge; the names stay experimental for CS-102, and the seams review's findings become follow-up items.
- B. A fix round first: Say which of the seams review's findings to fix before it merges (its two Criticals at least); it goes back to its executor, then to the gates and a review, then to you again.
- C. Hold it: Nothing merges; the 14 alpha.1 items that need it wait.

Recommended: A fix round first. The seams review's two Criticals are in these types (a source can't map a StableId back to its own keys, and whether the scene item is part of an ID disagrees with the per-content edit layer); fixing them now costs least, since 14 items will build on the types once they merge.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
