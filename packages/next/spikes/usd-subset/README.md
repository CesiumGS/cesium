# USD subset reader spike ([simready-and-usd.md](../../../../docs/design/simready-and-usd.md))

Spike code for CS-833 (a SimReady scoping study) and CS-843 (which USD runtime CS-559 uses). Nothing here is part of `@cesium/next`, and it adds no dependency: Node 24 runs the TypeScript as is, and `size.mjs` uses the esbuild already in the repository root.

## The decision it informs

Whether USD comes into the engine through a TypeScript subset reader behind the content-source seam (this spike), through OpenUSD built for WebAssembly, or through conversion on a server. The design note compares the three and recommends one. The owner answers CS-802 and CS-843.

## Data

- **SimReady samples:** asset folders from NVIDIA's SimReady Foundation repository (`sample_content/common_assets/…/simready_usd/`), Apache 2.0. They live in the setup store, outside the repository, by default in `~/.cesium-bench/simready/`. The note names the commit and the six assets measured. Never commit them, or anything made from them.
- **The fixture:** `fixture.ts`, four small USDA layers written for the spike, with hand-worked answers.

## Run it

```sh
node packages/next/spikes/usd-subset/run.ts [data folder]   # Node: every sample, 7 runs each; writes out/report.json
node packages/next/spikes/usd-subset/size.mjs                # the reader's bundle size; writes out/size.json
```

In a browser, start a dev server of your own (not 5190) and open `/spikes/usdSubset.html`. Run times the reader in a module worker on the fixture, ten runs. The folder picker composes a local `simready_usd` folder in the tab and lists what it read; nothing is uploaded.

## Settings and costs

- Node: 7 runs per asset, the median. Browser: 10 runs, the median. A quick probe, not a Dyno run; times on a busy machine are upper bounds.
- The reader (readers and composer) is about 26 KB minified, 9.6 KB with gzip. It needs no threads, no `SharedArrayBuffer` and no `wasm-unsafe-eval`.
- It allocates what a file's headers say. It is not safe on hostile files; a shipped reader needs limits.

## Files

| File                                                            | What                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lz4.ts`                                                        | LZ4 block decoding and OpenUSD's `TfFastCompression` framing                                            |
| `intCoding.ts`                                                  | OpenUSD's integer compression (32- and 64-bit)                                                          |
| `crate.ts`                                                      | USDC ("crate") 0.4.0 and later: tokens, strings, fields, field sets, paths, specs and values            |
| `usda.ts`                                                       | USDA: metadata, prims, variant sets, attributes, connections, relationships                             |
| `usdz.ts`                                                       | USDZ: the uncompressed zip's entries                                                                    |
| `layer.ts`                                                      | The layer model both readers write                                                                      |
| `compose.ts`                                                    | Loading every layer a root names, and composing in LIVRPS order, with namespace mapping across arcs     |
| `coverage.ts`                                                   | What a composed stage holds: units and axes, arcs, labels in both schemas, materials, geometry, physics |
| `fixture.ts`                                                    | The fixture and its answers                                                                             |
| `run.ts`                                                        | The Node runner                                                                                         |
| `size.mjs`                                                      | The bundle size                                                                                         |
| `../usdSubset.html`, `../usdSubset.ts`, `../usdSubsetWorker.ts` | The browser page and its worker                                                                         |

## What it refuses or leaves out

Crate versions before 0.4.0; time samples (counted, not read); value clips; relocates; layer offsets on time; variant fallbacks; `!invert!` transform operations; dictionary values. Instanceable prims are composed in place. Arcs to URLs or search paths are reported unresolved. The design note's list is the one to keep current.
