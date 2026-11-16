---
id: CS-156
title: "Request options at 1.x parity: proxies, inherited query parameters and headers, credentials for trusted origins"
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-145]
---

Request options at 1.x parity: proxies (prefix and function), inherited query parameters and headers, credentials for trusted origins (owner, 2026-11-13). Needs CS-145. The app's auth-refresh hook is CS-157, split out because it waits for ion tokens (CS-150).

## Done when

- A proxy prefix routes every content, terrain, imagery, sub-resource and metadata request (tested with the fault harness).
- A function proxy runs on the main thread and reaches worker fetches as resolved URLs and headers.
- Query parameters reach external tilesets and their content.
- Credentials go only to trusted origins.
- No option value appears in any diagnostic.

## Files

- `src/io/requestOptions.ts`
- `fetchBytes.ts`
- `io/worker.ts`
- `tilesetLoad.ts`
- `Tile.ts`
- `TerrainSource.ts`
- `ImageryProvider.ts`
- `ion.ts`
- `Engine.ts`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
