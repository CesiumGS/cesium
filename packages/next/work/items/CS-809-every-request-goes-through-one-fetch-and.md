---
id: CS-809
title: "Every request goes through one fetch and credential provider: renewable auth, retry after a 401, proxies and enterprise headers"
kind: work
state: planned
created: 2026-11-21
project: CS-191
touches: [packages/next/src/io/**, packages/next/src/streaming/**, packages/next/src/globe/**, packages/next/src/tiles/**, packages/next/src/scene/ShaderBindings.ts, packages/next/src/index.ts, packages/next/test, packages/next/api/surface.txt]
---

About 25 call sites call `fetch` directly: tileset JSON (`Tile.ts:744`), terrain (`TerrainSource.ts:319`), imagery, ion (`io/ion.ts:88`), iTwin, full-detail tiles, shader textures and decoders. Auth headers are fixed for an asset's whole lifetime, and nothing retries after a 401. That matters for ion's renewable tokens and STAC's expiring signed URLs.

The owner added two requirements:

- support proxies as 1.x does (1.x's `Resource` and `DefaultProxy`);
- support the header requirements of enterprise environments.

Source: the owner's review of 2.0's seams with the chief of staff, 2026-11-21. A read of the code found about 25 direct `fetch` call sites and no shared provider. Why now: ion as a module (CS-269, CS-497) needs it in alpha.1, and every other seam sits on it. Rough size: medium to large. Decider: the executor. Anything that loosens a security default (credentials mode, CORS, CSP) comes back as a question. Filed: 2026-11-21.

## Done when

- One public fetch provider carries every request the engine makes, and a test fails on any direct `fetch` outside it. That test is a new seam test beside `test/seams.test.ts`.
- **Credentials** are renewable. A provider refreshes them on 401 and retries once, and a token can rotate without reloading the asset.
- **Proxies:** a proxy rewrites URLs, as 1.x's `DefaultProxy` does, or forwards to a host-supplied endpoint.
- **Enterprise environments:**
  - Per-origin header rules, such as a required tenant or gateway header.
  - Host-chosen `credentials` mode (omit, same-origin or include), for cookie- or SSO-fronted servers.
  - Request and response hooks a host can use for its own signing or logging.
  - A note on what a browser can't do (client certificates, custom TLS), and how a proxy covers each.
- Retries and backoff for content follow CS-147's per-tile episodes, and they respect each origin's budget (CS-458).
- No token or header value appears in logs, errors, URLs or test output, and a test checks this.
- `npm run surface` is run, and `api/surface.txt` is committed.
