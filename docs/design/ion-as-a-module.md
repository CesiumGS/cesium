# Ion as a swappable module (owner, 2026-11-08)

**What this holds:** Cesium ion behind an interface the host can replace (owner, 2026-11-08). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Decided to plan.** Ion stays the easiest path and the Viewer's default, but it's one implementation behind an interface, so other tile servers can be swapped in. Not built. Fits the layers in §13.17, and goes in after the big file split or as part of it.

**Today (grep counts on 2026-11-08).** Tile streaming already takes a URL and headers, so a server of plain 3D Tiles works now. Ion appears in `src/io/ion.ts`, `src/globe/ImageryProvider.ts` (`IonTmsImagery`, `BingImagery.fromIon`), `widgets/Viewer.ts` (29 lines, including the `{ ion: id }` source, default terrain and imagery, and credits) and the Moon map loaders. Core imports `resolveUri` from `ion.ts`, which is generic and should move.

**The missing pieces.**

- **A content source interface in core:** an asset reference goes in; where it lives, how to authenticate, what credit it needs and what kind of content it is come out.
- **Credentials that can be renewed:** headers are fixed for a tileset's lifetime, and nothing was found that retries after a 401, so a long session can lose access when a token expires. Worth fixing for ion too.
- **`@cesium/next/ion`:** the ion implementation, plus `IonTmsImagery`, the Bing lookup and Moon loading. `test/importBoundary.test.ts` stops core importing it.
- **The Viewer:** `new Viewer()` still gets terrain and imagery from ion with no setup, loaded on demand, and an application can pass its own source.
- **`src/io/itwin.ts`:** a second implementation, to test that the interface isn't shaped around ion.

**A default evaluation token (owner, 2026-11-08).** `@cesium/next/ion` ships a default access token, as 1.x's `Ion.js` does, so people can evaluate 2.0 without getting a token first. It's only for evaluation. Rules:

- Show 1.x's on-screen notice (`Ion.getDefaultTokenCredit`) whenever the default token is in use, and let an application's own token replace it.
- 1.x's token is per release and is deleted soon after: 1.147's is labelled for deletion on January 1, 2027. So don't paste a copy. Either read it from `packages/engine/Source/Core/Ion.js` at build time, or have a token issued for 2.0 with its own rotation, and make an expired token fail with a clear message.
- This is the only token allowed in source. Update the `AGENTS.md` rule when it goes in: personal and application tokens still never go into code, logs, URLs, test output, screenshots or builds. The build checks that look for secrets (`keepEnvSecretsOut`, the handbook's `findSecrets`) stay on, and the handbook must not include it.

**Two layers, not one (for other sources).** A content source says where content lives and how to authenticate. 1.x's other providers also differ in format and tiling, which needs a second seam: terrain sources (ArcGIS tiled elevation, Google Earth Enterprise, VR-TheWorld, custom heightmaps, terrain as 3D Tiles) must produce the mesh a tile draws, and imagery sources (ArcGIS, WMS, WMTS, TMS, Mapbox and others, see `packages/engine/Source/Scene/*ImageryProvider.js`) implement `ImageryProvider`. Decide which are worth building from demand; most don't belong in the core. Each is its own optional module, so a page pays only for what it uses.

**Later: ion's public REST API.** Wrappers around ion's API calls, separate from what the renderer needs to fetch tiles. 1.147 added the experimental `IonAssetElementService`, wrapping ion's newly public calls for querying, filtering, aggregating and navigating element metadata (BIM and CAD), which 2.0 should cover here. Related to §13.19. Read it in `packages/engine/Source` when this work starts. Name the module for what it does, such as an ion client. The GIS protocols question in §13.20 builds on the same content source interface. Expect ion's REST API to change substantially: keep its wrappers thin and in this module, keep the renderer depending only on the content source interface, and test the asset endpoint's parsing against recorded responses, so a change shows up in one place.
