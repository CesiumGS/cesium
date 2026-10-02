# Support glTF `3DTILES_subtree` files in implicit tilesets

Specification: [3DTILES_subtree](https://github.com/CesiumGS/glTF/tree/3d-tiles-2.0/extensions/2.1/Vendor/3DTILES_subtree)

Teach `preprocess3DTileContent` to recognize `3DTILES_subtree` glTF and glb files. Add `Implicit3DTileContent.fromSubtreeGltf` (spec-conformant glTF JSON) and `Implicit3DTileContent.fromSubtreeGlb` (glb bytes), backed by matching `ImplicitSubtree` methods, and register factory entries so the result is an ordinary `Implicit3DTileContent`.

## Phase 1: Content types and detection

1. In `packages/engine/Source/Scene/Cesium3DTileContentType.js`, add `IMPLICIT_SUBTREE_GLTF: "subtreeGltf"` and `IMPLICIT_SUBTREE_GLB: "subtreeGlb"`, with the same `@experimental` JSDoc as `IMPLICIT_SUBTREE_JSON`. Add `IMPLICIT_SUBTREE_GLB` to `isBinaryFormat`. Add `isSubtree(contentType)`, true for `IMPLICIT_SUBTREE`, `IMPLICIT_SUBTREE_JSON`, `IMPLICIT_SUBTREE_GLTF`, and `IMPLICIT_SUBTREE_GLB`.

2. In `packages/engine/Source/Scene/preprocess3DTileContent.js`, label a glb whose JSON chunk has the `3DTILES_subtree` extension (checked with `hasExtension`) as `IMPLICIT_SUBTREE_GLB`, and a glTF JSON with the `3DTILES_subtree` extension (checked with `hasExtension`) as `IMPLICIT_SUBTREE_GLTF`.

3. In `packages/engine/Source/Scene/Cesium3DTile.js`, make `makeContent` use `Cesium3DTileContentType.isSubtree` to decide that the tile has implicit content.

## Phase 2: ImplicitSubtree

Phase 2 can proceed in parallel with Phase 1.

1. In `packages/engine/Source/Scene/ImplicitSubtree.js`, move everything in `fromSubtreeJson` after `const subtreeJson = chunks.json;` into an async `parseSubtree(subtree, subtreeJson, internalBuffer, implicitTileset, metadataSchema)`. `fromSubtreeJson` passes `implicitTileset.metadataSchema`.

2. Make `parseTileMetadataTable`, `parseContentMetadataTables`, and the `subtreeMetadata` class lookup use the `metadataSchema` argument.

3. Add an async `convertGltfToSubtreeJson(resource, gltf)` returning `{ subtreeJson, metadataSchema }`:
   - Map the `3DTILES_subtree` extension to the 1.1 subtree JSON: the availability fields, `tileProperties` as `tileMetadata`, `contentProperties` as `contentMetadata: [contentProperties]`, the `EXT_structural_metadata` `propertyTables`, and the glTF `buffers` and `bufferViews`.
   - Resolve the schema from `EXT_structural_metadata` (inline `schema` or `schemaUri`), following `processMetadataExtension` in `Cesium3DTileset.js`.

4. Add `ImplicitSubtree.fromSubtreeGltf(resource, gltf, implicitTileset, implicitCoordinates)`. `gltf` is a glTF JSON object whose buffers all have a `uri`. It converts `gltf` and calls `parseSubtree` with no internal buffer. Add the debug checks and JSDoc that `fromSubtreeJson` has.

5. Add `parseGlbChunks(glbView)`, like `parseSubtreeChunks`, returning `{ json, binary }` (`binary` is undefined when the glb has no BIN chunk).

6. Add `ImplicitSubtree.fromSubtreeGlb(resource, glbView, implicitTileset, implicitCoordinates)`, where `glbView` is a `Uint8Array`. It splits the chunks with `parseGlbChunks`, converts the JSON chunk, and calls `parseSubtree` with the binary chunk as the internal buffer. Add the debug checks and JSDoc that `fromSubtreeJson` has.

## Phase 3: Content and factory

Phase 3 depends on Phase 2.

1. In `packages/engine/Source/Scene/Implicit3DTileContent.js`, extract the tail of `fromSubtreeJson` into `createContentFromSubtree(tileset, tile, resource, subtree)`. Add `fromSubtreeGltf(tileset, tile, resource, gltf)` and `fromSubtreeGlb(tileset, tile, resource, arrayBuffer, byteOffset)`, which create the subtree with the matching `ImplicitSubtree` method and return `createContentFromSubtree(...)`. Update the class JSDoc and give the new methods JSDoc like `fromSubtreeJson`.

2. In `packages/engine/Source/Scene/Cesium3DTileContentFactory.js`, add `subtreeGltf` and `subtreeGlb` entries that call the matching `Implicit3DTileContent` methods.

## Phase 4: Tests

1. `Cesium3DTileContentTypeSpec.js`: `isBinaryFormat` is true for `IMPLICIT_SUBTREE_GLB` and false for `IMPLICIT_SUBTREE_GLTF`; `isSubtree` is true for the four subtree types and false for the other types.

2. `preprocess3DTileContentSpec.js`: a subtree glTF JSON returns `IMPLICIT_SUBTREE_GLTF`, a subtree glb returns `IMPLICIT_SUBTREE_GLB`, an ordinary glTF JSON returns `GLTF`, and an ordinary glb with a JSON chunk returns `GLTF_BINARY`.

3. `Specs/ImplicitTilingTester.js`:
   - Add and export `makeGlb(gltf, binaryChunk)`, which packs the glTF JSON and an optional binary chunk into a glb `Uint8Array`.
   - Add `generateSubtreeGltf(subtreeDescription, constantOnly)`, modeled on `generateSubtreeBuffers`, returning `{ gltf, glb, externalBuffer }`. `gltf` is the `3DTILES_subtree` glTF JSON (with `EXT_structural_metadata` and an inline schema when metadata is described), round-tripped through JSON so undefined properties are dropped as in a parsed file. `glb` holds the internal buffers in its binary chunk. Document that `gltf` is conformant only when every entry in the description has `isInternal: false` or `constantOnly` is true.

4. `ImplicitSubtreeSpec.js`:
   - `fromSubtreeGltf` (passing `results.gltf`, external buffers only): throws without `gltf`, constant availability, bitstream availability, and tile and content metadata.
   - `fromSubtreeGlb` (passing `results.glb`): throws without `glbView`, constant availability, bitstream availability from the embedded buffer and from an external buffer, and tile and content metadata.

5. `Implicit3DTileContentSpec.js`: a `fromSubtreeGltf` case and a `fromSubtreeGlb` case that each expand the same quadtree as an existing 1.1 case and assert the same child tiles and child subtree placeholders.

## Phase 5: Verification

1. Run `npx gulp test --workspace @cesium/engine --includeName <name>` for `Cesium3DTileContentType`, `preprocess3DTileContent`, `ImplicitSubtree`, and `Implicit3DTileContent`.

2. Run `npx eslint` and `npx prettier --check` on every edited file.

3. Load the tileset under `Apps/SampleData/Cesium3DTiles/gltf-2.1/AGI_HQ` (it has `.subtree.glb` files) through `Cesium3DTileset.fromGltf` in Sandcastle or `Apps/CesiumViewer`, and confirm tiles beyond the root subtree load.

## Phase 6: Tile and content attributes

Phase 6 depends on Phases 2 and 3. The 1.1 path reads `TILE_BOUNDING_BOX`, `TILE_BOUNDING_SPHERE`, `TILE_GEOMETRIC_ERROR`, `CONTENT_BOUNDING_BOX`, and `CONTENT_BOUNDING_SPHERE` from property table semantics in `deriveChildTile` (`Implicit3DTileContent.js`). Phase 6 reads the same five values from the `tileAttributes` and `contentAttributes` of `3DTILES_subtree`, which store them as DOUBLE accessors.

1. In `ImplicitSubtree.js`, make `convertGltfToSubtreeJson` copy `tileAttributes`, `contentAttributes`, and the glTF `accessors` into `subtreeJson`.

2. In `markActiveBufferViews`, mark the buffer view of every accessor referenced by `tileAttributes` and `contentAttributes` as active.

3. Add `parseAttributes(attributeIndices, accessors, bufferViewsU8)` to `ImplicitSubtree.js`. For each of the five semantics present, it copies `count * MetadataType.getComponentCount(accessor.type)` doubles, starting at `accessor.byteOffset` (default 0) within the accessor's buffer view, into a new `Float64Array` (the copy guarantees 8-byte alignment). It returns a dictionary of semantic to `{ type, values }`. `parseSubtree` stores the results in `subtree._tileAttributes` and `subtree._contentAttributes`.

4. In `ImplicitSubtree.js`, compute the tile availability `availableCount` and call `makeTileJumpBuffer` when `_tileAttributes` is defined, and compute the content availability `availableCount` when `_contentAttributes` is defined. Add `getTileAttributeView(implicitCoordinates)` and `getContentAttributeView(implicitCoordinates, contentIndex)`. Each returns an `ImplicitAttributeView` for an available tile or content (entity ID from `_tileJumpBuffer` or `_contentJumpBuffers`), and `undefined` otherwise.

5. Add `packages/engine/Source/Scene/ImplicitAttributeView.js`, a class constructed with `{ attributes, entityId }` that implements the two methods `BoundingVolumeSemantics` and `getGeometricError` call on a metadata view:
   - `hasPropertyBySemantic(semantic)` is true for the five supported semantics present in `attributes`.
   - `getPropertyBySemantic(semantic)` returns, for `TILE_BOUNDING_BOX` and `CONTENT_BOUNDING_BOX`, the 12-element 1.1 box `[tx, ty, tz, 0.5 * column0, 0.5 * column1, 0.5 * column2]` from the column-major MAT4 (translation at elements 12-14, columns at elements 0-2, 4-6, and 8-10, unit cube edge length 1); for `TILE_BOUNDING_SPHERE` and `CONTENT_BOUNDING_SPHERE`, a `Cartesian4`; and for `TILE_GEOMETRIC_ERROR`, a number.

6. In `deriveChildTile` in `Implicit3DTileContent.js`, get `tileAttributes = subtree.getTileAttributeView(implicitCoordinates)`. Use `tileAttributes` when defined, otherwise `tileMetadata`, as the source for `parseAllBoundingVolumeSemantics("TILE", ...)` and for `getGeometricError`. Do the same for content with `subtree.getContentAttributeView(implicitCoordinates, i)` and `parseAllBoundingVolumeSemantics("CONTENT", ...)`. Parse content bounds when the subtree has content property tables or content attributes. `childTile.metadata` stays `tileMetadata`.

7. Tests:
   - `Specs/ImplicitTilingTester.js`: add an `attributes` entry to the subtree description (`{ isInternal, tile, content }`, where `tile` and `content` map a semantic to an array with one value per available tile or content, in availability order). `generateSubtreeGltf` writes each semantic as a Float64 buffer view and accessor, and emits `tileAttributes`, `contentAttributes`, and `accessors`.
   - New `packages/engine/Specs/Scene/ImplicitAttributeViewSpec.js`: the box conversion from a MAT4 with rotation, scale, and translation, the sphere, the geometric error, and `hasPropertyBySemantic` false for an unsupported semantic.
   - `ImplicitSubtreeSpec.js`: `getTileAttributeView` and `getContentAttributeView` return the written values from `fromSubtreeGltf` (external buffer) and `fromSubtreeGlb` (embedded buffer), return `undefined` for an unavailable tile, and return `undefined` for a subtree without attributes.
   - `Implicit3DTileContentSpec.js`: with a `fromSubtreeGlb` subtree that has tile and content attributes, each transcoded tile has the `boundingVolume` and `geometricError` from its `TILE_BOUNDING_BOX` and `TILE_GEOMETRIC_ERROR`, and its content has the `boundingVolume` from `CONTENT_BOUNDING_BOX`.

8. Re-run Phase 5 steps 1 and 2, adding `ImplicitAttributeView` to the `--includeName` list and the new files to the lint and prettier lists.
