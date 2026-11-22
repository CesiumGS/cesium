---
id: CS-811
title: "2.0 owns its texture and mesh decoders: Basis and Draco built for 2.0, with nothing loaded from 1.x's tree"
kind: work
state: planned
created: 2026-11-21
project: CS-191
needs: [CS-808]
touches: [packages/next/src/io/decoders.ts, packages/next/tools, packages/next/package.json, packages/next/scripts/checkBundle.mjs, packages/next/test]
---

`src/io/decoders.ts:15` imports the Basis transcoder from 1.x's `engine/Source/ThirdParty`, so 2.0's KTX2 textures depend on 1.x's tree. That breaks as soon as packages split (CS-617). Draco loads from a pinned URL (`decoders.ts:7`), but it's still 1.x's build.

The owner, 2026-11-21: "can we write our own decoder instead so it doesn't break anything with our architecture? maybe in rust in wasm? should get this sorted by alpha.1."

Source: the owner's review of 2.0's seams with the chief of staff, 2026-11-21. A read of the code found about 25 direct `fetch` call sites and no shared provider. Why now: alpha.1 is when a host installs the packages alone. Rough size: medium, if built from upstream source; large, if written new. Decider: the executor recommends a path, and the owner decides if it means writing a new decoder or taking a new dependency. Filed: 2026-11-21.

## Done when

- The options are measured and written up as a decision for the owner, with size, start time, decode speed, license and upkeep for each:
  1. Build upstream Basis Universal and Draco (both Apache 2.0) to WebAssembly from pinned source, in this repository's own toolchain.
  2. Use or adapt an existing Rust implementation, if one is mature. If none is, say "can't tell".
  3. Write 2.0's own transcoder in Rust, covering only the formats glTF's `KHR_texture_basisu` and `KHR_draco_mesh_compression` need.
- The chosen path builds reproducibly here, loads through the data-resource provider (CS-808) with its pin checked, and sits in a lazy chunk that `scripts/checkBundle.mjs` enforces.
- Nothing under `packages/next` imports from 1.x's tree. The import-boundary test fails on any `../../../engine` path.
- KTX2 and Draco fixtures decode with the same results as today (parity unchanged).
