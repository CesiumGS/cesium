---
id: CS-847
title: "The content-source seam's core: types, kind registry, host, shared budget, sinks and push"
kind: work
state: done
created: 2026-11-21
project: CS-191
needs: [CS-552, CS-809, CS-815, CS-831, CS-846]
claimed_by: orch-11-CS-847
touches: [packages/next/src/source/**, packages/next/src/io/Jobs.ts, packages/next/src/io/WorkerPool.ts, packages/next/src/io/worker.ts, packages/next/src/scene/World.ts, packages/next/test/importBoundary.test.ts, packages/next/test/seams.test.ts, packages/next/src/index.ts, packages/next/api/surface.txt]
---

The content-source seam's core: the interface's types, the kind registry, `SourceHost`, the budget arbiter, the sinks, push, and CS-831's three alpha.1 pieces. No source moves yet. Ion is an `AssetResolver` (CS-846).

From CS-552's design and plan (`docs/design/content-source-seam.md`; `docs/superpowers/plans/2026-11-21-content-source-seam.md`, section 3.1), filed by the chief of staff with the owner's answers to D1 to D6 (CS-841 to CS-846). Rough size: large; Opus. Decider: the executor, within the plan. Filed: 2026-11-21.

## Done when

- From CS-831's decisions, answered by the owner on 2026-11-21:
  - the change-set type is extended (CS-861);
  - it serializes as JSON at 0.x, experimental (CS-862);
  - a source may poll its own server's version on a declared interval and turn the result into pushes, while the engine never polls (CS-863, which changes CS-552's "no source polls");
  - the edit layer's hide, replace and insert are built here, with experimental public API (CS-865).
- `SourceKind`, `ContentSource`, `SourceCapabilities`, `SourceHost`, `SourceTick`, `BudgetClient`, the sinks (`DrawSink` as it is, `RasterSink`, `FeatureSink`, `PointSink`, custom rows), `SourceChange`, `AssetRef`, `AssetResolver` and `ResolvedAsset` exist as the design gives them. They are data-only, and the import-boundary test refuses a GPU type or a `World`, `Engine` or renderer import in them.
- CS-831's three pieces are in: `WriteCapabilities` with `READ_ONLY`, the override contract on the sinks (every row has a stable ID from CS-815), and `ChangeSet`, `SourceWriter` and `CommitResult` as types, shaped by CS-831's design.
- A kind is registered by module reference, and its decoders load by URL into every worker of the pool as Jobs types. A test registers a kind and a decoder from a test module, opens a source, and decodes on a worker.
- `engine.open(ref)` resolves a plain URL through the URL resolver, picks the kind, and returns content. `world.add(content, options)` takes any content, not only a `Tileset3D`.
- The budget arbiter takes wants (class, benefit, cost, origin) from every source and grants per origin and over one byte budget. A test with two sources on one origin shows one source's `now` wants served before the other's `prefetch`, the Mount Rainier case in `docs/design/tile-selection-and-memory.md`.
- `host.changed` wakes the engine, and a change applies in the apply phase. A test source pushes samples and an invalidation and uses no timer. With CS-816's stepped clock (or a fake clock if CS-816 hasn't landed), samples apply at their times, and two runs give the same rows.
- An in-memory sample source, in the tests only, writes to every sink and runs on the fake device with no network.
- A seam test fails on any file under a source module that imports `World`, `Engine`, `src/render/` or `src/gpu/`.
- `npm run surface` is run, and `api/surface.txt` is committed. The handbook's architecture tab says what is built.
