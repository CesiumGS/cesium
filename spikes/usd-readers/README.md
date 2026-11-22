# Three USD readers compared ([usd-readers.md](../../../../docs/design/usd-readers.md))

CS-900's instrument: one Lab harness that measures three USD readers over the same six SimReady samples. Nothing here is part of `@cesium/next`, and it adds no dependency. Its result feeds CS-901, the reader decision.

## What it measures

For each reader:

- **Size:** the files it ships, raw, gzip (level 9) and Brotli (quality 11).
- **Start time:** from `new Worker` on the page to a composed stage in that worker. The sample's layers are fetched before the clock starts and sent with the request; the reader's module is fetched with `no-store`, so every run fetches and compiles it as a first visit would.
- **Coverage** of CS-802 B's features (Robotics-Prop 5.0.0's FET001, FET006, FET009 and FET011, and UsdPhysics): each reader's composed stage becomes plain prim records, `facts.ts` counts the same facts from every reader's records, and each fact is checked against OpenUSD's.
- **What the page must allow:** read from the files themselves (`host.ts`): a shared memory means threads, so cross-origin isolation (COOP and COEP); any WebAssembly means `wasm-unsafe-eval`; `new Function(` or `eval(` in the JavaScript means `unsafe-eval`.

The readers:

| Reader                             | Module the worker loads                                                                      | Built from                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| The subset reader (CS-833's spike) | `subsetEntry.ts`, bundled by `serve.mjs` with esbuild                                        | `../usd-subset/`                                                                     |
| LightUSD 1.0.0                     | its `next` module, `lightusd_next.{js,wasm}`; `lightusdRecords.ts` reads its flattened layer | LightUSD's tagged source, built as its `web/README.md` documents                     |
| OpenUSD 26.11.1 (wasm32, threads)  | `openusd/harness.cpp` linked against it, `openusd_reader.{js,wasm}`                          | OpenUSD's tagged source, `build_usd.py --build-target wasm`, then `openusd/build.sh` |

## Data and builds

Both live in the setup store, outside the repository. Never commit them, or anything made from them.

- **Samples:** `~/.cesium-bench/simready/foundation-1abf3ae2/`, with the source repository's `LICENSE.txt` (Apache 2.0) and a `SOURCE.md` beside them. One root layer per asset, as CS-833 measured (`serve.mjs` lists them).
- **Builds:** `~/.cesium-bench/usd-readers/`, with a `SOURCES.md` that records each source's URL, tag, commit and checksum, its license, and how it was built. The toolchain is emsdk 7.0.0 in `~/.cesium-bench/emsdk/7.0.0`.

## Run it

```sh
node spikes/usd-readers/serve.mjs --port 4102   # your own server: routes, builds, isolation
BENCH_URL=http://127.0.0.1:4102 npx @cesium/dyno measure start lab usdReaders --caller <you>
npx vitest run test/usdReaders.test.ts                        # the instrument's own logic, no data
```

`dyno lab usdReaders --url http://127.0.0.1:4102` runs it at once instead, for a check. The result is a Lab results file in `bench/results/`; its name is the run's id. The page alone, `/bench/usdReaders.html` on that server, has a Run button.

Rebuild the OpenUSD harness after changing `openusd/`: `spikes/usd-readers/openusd/build.sh`.

## Settings and costs

- Five runs per reader and sample, interleaved, so drift on the machine falls on every reader alike; the first run is reported on its own as well as the median.
- Cross-origin isolation is set by `serve.mjs` on its own routes only: the harness page, its worker and the readers' files. The shared Vite config doesn't change.
- OpenUSD starts a pool of four threads (its TBB workers) when its module loads; that is part of its start time.
- The harness runs on the dev server, so the worker's own module is served unbundled. That cost falls on every reader alike.

## Files

| File                                                                  | What                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `facts.ts`                                                            | Prim records, the facts counted from them, the features' checks, and coverage |
| `host.ts`                                                             | Sizes, and what a reader's files ask of the page (Node only)                  |
| `subsetRecords.ts`, `subsetEntry.ts`                                  | The subset reader's records, and its one-module entry                         |
| `lightusdRecords.ts`                                                  | LightUSD's flattened layer, from its JSON export, as records                  |
| `openusd/`                                                            | The OpenUSD harness (C++), its CMake file and build script                    |
| `serve.mjs`                                                           | The dev server: routes, builds, manifest, isolation                           |
| `../../bench/usdReaders.{html,ts}`, `../../bench/usdReadersWorker.ts` | The Lab harness and its worker                                                |
| `../../test/usdReaders.test.ts`                                       | The instrument's own logic, on fixtures                                       |
