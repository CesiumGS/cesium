---
id: CS-808
title: "Outside data comes through a data-resource provider: PROJ grids, the geoid, frames data, sky packs and decoders, from any host"
kind: work
state: planned
created: 2026-11-21
project: CS-191
needs: [CS-809]
touches: [packages/next/src/engineering/proj.ts, packages/next/src/engineering/projNode.ts, packages/next/src/ephemeris/**, packages/next/src/atmosphere/skyPack.ts, packages/next/src/io/moonMap.ts, packages/next/src/io/decoders.ts, packages/next/src/index.ts, packages/next/test, packages/next/api/surface.txt]
---

Today the engine finds reference data by fixed base URLs:

- `loadProj({ base })`, `gridSource({ base })` and `loadFrameData(baseUrl)` are public;
- `proj.ts:152` reads `${base}${name}`, and Node reads `FRAMES_DATA_DIR` instead;
- the sky pack takes a `fetcher`, and the Moon map has `MoonMapSource`.

A host can't supply signed URLs, ion auth, IndexedDB, a local bundle or its own API. The owner wants this data behind one abstract seam, "since that could be served from ion, a new api, from a local file, etc.", and pulled it into alpha.1.

Source: the owner's review of 2.0's seams with the chief of staff, 2026-11-21. A read of the code found about 25 direct `fetch` call sites and no shared provider. Why now: these are public signatures, and alpha.1 is where a host first builds on them. It also settles the engine side of CS-244: ion becomes one provider, and its hosting goes to CS-490. Rough size: medium. Decider: the executor for the contract's details. Removing a public option outright comes back as a question. Filed: 2026-11-21.

## Done when

- A data-resource provider, `read(name, { signal, onProgress }) → bytes`, is public. The engine still checks every pin, so every provider is checked the same way.
- `loadProj`, `gridSource`, `loadFrameData`, the sky pack, the Moon map, the geoid and VDatum, and the decoders' WebAssembly all take a provider. A `base` string stays as shorthand for the default HTTP provider, and Node gets a file provider.
- Its requests go through CS-809's fetch provider.
- Tests run every consumer against an in-memory provider with no network. One test checks that a wrong pin is refused from any provider.
- `npm run surface` is run, `api/surface.txt` is committed, and the handbook's frames and PROJ pages say how to supply data.
