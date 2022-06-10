# Change Log

### 1.95 - 2022-07-01

##### Additions :tada:

- Memory statistics for `ModelExperimental` now appear in the `Cesium3DTilesInspector`. This includes binary metadata memory, which is not counted by `Model`. [#10397](https://github.com/CesiumGS/cesium/pull/10397)
- Memory statistics for `ResourceCache` (used by `ModelExperimental`) now appear in the `Cesium3DTilesInspector`. [#10413](https://github.com/CesiumGS/cesium/pull/10413)
- Added support for rendering individual models in 2D / CV using `ModelExperimental`. [#10419](https://github.com/CesiumGS/cesium/pull/10419)
- Added support for rendering instanced tilesets in 2D / CV using `ModelExperimental`. [#10433](https://github.com/CesiumGS/cesium/pull/10433)
- Added `modelUpAxis` and `modelForwardAxis` constructor options to `Cesium3DTileset` [#10439](https://github.com/CesiumGS/cesium/pull/10439)
- Added `heightReference` to `ModelExperimental`. [#10448](https://github.com/CesiumGS/cesium/pull/10448)

##### Fixes :wrench:

- Fixed `FeatureDetection` for Microsoft Edge. [#10429](https://github.com/CesiumGS/cesium/pull/10429)

### 1.94.2 - 2022-06-03

- This is an npm only release to fix the improperly published 1.94.1.

### 1.94.1 - 2022-06-03

##### Additions :tada:

- Added support for rendering individual models in 2D / CV using `ModelExperimental`. [#10419](https://github.com/CesiumGS/cesium/pull/10419)

##### Fixes :wrench:

- Fixed `Cesium3DTileColorBlendMode.REPLACE` for certain tilesets. [#10424](https://github.com/CesiumGS/cesium/pull/10424)
- Fixed a crash when applying a style to a vector tileset with point features. [#10427](https://github.com/CesiumGS/cesium/pull/10427)

### 1.94 - 2022-06-01

##### Breaking Changes :mega:

- Removed individual image-based lighting parameters from `Model` and `Cesium3DTileset`. [#10388](https://github.com/CesiumGS/cesium/pull/10388)
- Models and tilesets rendered with `ModelExperimental` must set `enableDebugWireframe` to true in order for `debugWireframe` to work in WebGL1. [#10344](https://github.com/CesiumGS/cesium/pull/10344)
- Removed `ImagerySplitPosition` and `Scene.imagerySplitPosition`. Use `SplitDirection` and `Scene.splitPosition` instead.[#10418](https://github.com/CesiumGS/cesium/pull/10418)
- Removed restriction on enabling `Scene.orderIndependentTranslucency` on iPad and iOS. [#10417](https://github.com/CesiumGS/cesium/pull/10417)

##### Additions :tada:

- Added `Cesium3DTileStyle.fromUrl` for loading a style from a url. [#10348](https://github.com/CesiumGS/cesium/pull/10348)
- Added `IndexDatatype.fromTypedArray`. [#10350](https://github.com/CesiumGS/cesium/pull/10350)
- Added `ModelAnimationCollection.animateWhilePaused` and `ModelAnimation.animationTime` to allow explicit control over a model's animations. [#9339](https://github.com/CesiumGS/cesium/pull/9339)
- Replaced `options.gltf` with `options.url` in `ModelExperimental.fromGltf`. [#10371](https://github.com/CesiumGS/cesium/pull/10371)
- Added support for 2D / CV mode for non-instanced tilesets rendered with `ModelExperimental`. [#10384](https://github.com/CesiumGS/cesium/pull/10384)
- Added `PolygonGraphics.textureCoordinates`, `PolygonGeometry.textureCoordinates`, `CoplanarPolygonGeometry.textureCoordinates`, which override the default `stRotation`-based texture coordinate calculation behaviour with the provided texture coordinates, specified in the form of a `PolygonHierarchy` of `Cartesian2` points. [#10109](https://github.com/CesiumGS/cesium/pull/10109)

##### Fixes :wrench:

- Fixed the rendering issues related to order-independent translucency on iOS devices. [#10417](https://github.com/CesiumGS/cesium/pull/10417)
- Fixed the inaccurate computation of bounding spheres for models not centered at (0,0,0) in their local space. [#10395](https://github.com/CesiumGS/cesium/pull/10395)
- Fixed the inaccurate computation of bounding spheres for `ModelExperimental`. [#10339](https://github.com/CesiumGS/cesium/pull/10339/)
- Fixed error when destroying a 3D tileset before it has finished loading. [#10363](Fixes https://github.com/CesiumGS/cesium/issues/10363)
- Fixed race condition which can occur when updating `Cesium3DTileStyle` before its `readyPromise` has resolved. [#10345](https://github.com/CesiumGS/cesium/issues/10345)
- Fixed label background rendering. [#10342](https://github.com/CesiumGS/cesium/issues/10342)
- Enabled support for loading web assembly modules in Edge. [#6541](https://github.com/CesiumGS/cesium/pull/6541)
- Fixed crash for zero-area `region` bounding volumes in a 3D Tileset. [#10351](https://github.com/CesiumGS/cesium/pull/10351)
- Fixed `Cesium3DTileset.debugShowUrl` so that it works for implicit tiles too. [#10372](https://github.com/CesiumGS/cesium/issues/10372)
- Fixed crash when loading a tileset without a metadata schema but has external tilesets with tile or content metadata. [#10387](https://github.com/CesiumGS/cesium/pull/10387)
- Fixed winding order for negatively scaled models in `ModelExperimental`. [#10405](https://github.com/CesiumGS/cesium/pull/10405)
- Fixed error when calling `sampleTerrain` over a large area that required lots of tile requests. [#10425](https://github.com/CesiumGS/cesium/pull/10425)

##### Deprecated :hourglass_flowing_sand:

- Support for glTF 1.0 assets has been deprecated and will be removed in CesiumJS 1.95. Please convert any glTF 1.0 assets to glTF 2.0. [#10414](https://github.com/CesiumGS/cesium/pull/10414)
- Support for the glTF extension `KHR_techniques_webgl` has been deprecated and will be removed in CesiumJS 1.95. If custom GLSL shaders are needed, use `CustomShader` instead. [#10414](https://github.com/CesiumGS/cesium/pull/10414)
- `Model.gltf`, `Model.basePath`, `Model.pendingTextureLoads` (properties), and `Model.dequantizeInShader` (constructor option) were deprecate in CesiumJS 1.94 and will be removed in CesiumJS 1.95. [#10415](https://github.com/CesiumGS/cesium/pull/10415)
- `Model.boundingSphere` currently returns results in the model's local coordinate system, but in CesiumJS 1.95 it will be changed to return results in ECEF coordinates. [#10415](https://github.com/CesiumGS/cesium/pull/10415)
- `Cesium3DTileStyle` constructor parameters of `string` or `Resource` type have been deprecated and will be removed in CesiumJS 1.96. If loading a style from a url, use `Cesium3DTileStyle.fromUrl` instead. [#10348](https://github.com/CesiumGS/cesium/pull/10348)
- `Cesium3DTileStyle.readyPromise` and `Cesium3DTileStyle.ready` have been deprecated and will be removed in CesiumJS 1.96. If loading a style from a url, use `Cesium3DTileStyle.fromUrl` instead. [#10348](https://github.com/CesiumGS/cesium/pull/10348)

### 1.93 - 2022-05-02

##### Breaking Changes :mega:

- Temporarily disable `Scene.orderIndependentTranslucency` by default on iPad and iOS due to a WebGL regression, see [#9827](https://github.com/CesiumGS/cesium/issues/9827). The old default will be restored once the issue has been resolved.

##### Additions :tada:

- Improved rendering of ground and sky atmosphere. [#10063](https://github.com/CesiumGS/cesium/pull/10063)
- Added support for morph targets in `ModelExperimental`. [#10271](https://github.com/CesiumGS/cesium/pull/10271)
- Added support for skins in `ModelExperimental`. [#10282](https://github.com/CesiumGS/cesium/pull/10282)
- Added support for animations in `ModelExperimental`. [#10314](https://github.com/CesiumGS/cesium/pull/10314)
- Added `debugWireframe` to `ModelExperimental`. [#10332](https://github.com/CesiumGS/cesium/pull/10332)
- Added `GeoJsonSource.process` to support adding features without removing existing entities, similar to `CzmlDataSource.process`. [#9275](https://github.com/CesiumGS/cesium/issues/9275)
- `KmlDataSource` now exposes the `camera` and `canvas` properties, which are used to provide information about the state of the `Viewer` when making network requests for a [`Link`](https://developers.google.com/kml/documentation/kmlreference#link). Passing these values in the constructor is now optional.
- Prevent text selection in the Timeline widget. [#10325](https://github.com/CesiumGS/cesium/pull/10325)

##### Fixes :wrench:

- Fixed `GoogleEarthEnterpriseImageryProvider.requestImagery`, `GridImageryProvider.requestImagery`, and `TileCoordinateImageryProvider.requestImagery` return types to match interface. [#10265](https://github.com/CesiumGS/cesium/issues/10265)
- Various property and return TypeScript definitions were corrected, and the `Event` class was made generic in order to support strongly typed event callbacks. [#10292](https://github.com/CesiumGS/cesium/pull/10292)
- Fixed debug label rendering in `Cesium3dTilesInspector`. [#10246](https://github.com/CesiumGS/cesium/issues/10246)
- Fixed a crash that occurred in `ModelExperimental` when loading a Draco-compressed model with tangents. [#10294](https://github.com/CesiumGS/cesium/pull/10294)
- Fixed an incorrect model matrix computation for `i3dm` tilesets that are loaded using `ModelExperimental`. [#10302](https://github.com/CesiumGS/cesium/pull/10302)
- Fixed race condition during billboard clamping when the height reference changes. [#10191](https://github.com/CesiumGS/cesium/issues/10191)
- Fixed ability to run `test` and other support tasks from within the release zip file. [#10311](https://github.com/CesiumGS/cesium/pull/10311)

### 1.92 - 2022-04-01

##### Breaking Changes :mega:

- Removed `Cesium.when`. Any `Promise` in the Cesium API has changed to the native `Promise` API. Code bases using cesium will likely need updates after this change. See the [upgrade guide](https://community.cesium.com/t/cesiumjs-is-switching-from-when-js-to-native-promises-which-will-be-a-breaking-change-in-1-92/17213) for instructions on how to update your code base to be compliant with native promises.
- `ArcGisMapServerImageryProvider.readyPromise` will not reject if there is a failure unless the request cannot be retried.
- `SingleTileImageryProvider.readyPromise` will not reject if there is a failure unless the request cannot be retried.
- Removed links to SpecRunner.html and related Jasmine files for running unit tests in browsers.

##### Additions :tada:

- Added experimental support for the [3D Tiles 1.1 draft](https://github.com/CesiumGS/3d-tiles/pull/666). [#10189](https://github.com/CesiumGS/cesium/pull/10189)
- Added support for `EXT_structural_metadata` property attributes in `CustomShader` [#10228](https://github.com/CesiumGS/cesium/pull/10228)
- Added partial support for `EXT_structural_metadata` property textures in `CustomShader` [#10247](https://github.com/CesiumGS/cesium/pull/10247)
- Added `minimumPixelSize`, `scale`, and `maximumScale` to `ModelExperimental`. [#10092](https://github.com/CesiumGS/cesium/pull/10092)
- `Cesium3DTileset` now has a `splitDirection` property, allowing the tileset to only be drawn on the left or right side of the screen. This is useful for visual comparison of tilesets. [#10193](https://github.com/CesiumGS/cesium/pull/10193)
- Added `lightColor` to `ModelExperimental` [#10207](https://github.com/CesiumGS/cesium/pull/10207)
- Added image-based lighting to `ModelExperimental`. [#10234](https://github.com/CesiumGS/cesium/pull/10234)
- Added clipping planes to `ModelExperimental`. [#10250](https://github.com/CesiumGS/cesium/pull/10250)
- Added `Cartesian2.clamp`, `Cartesian3.clamp`, and `Cartesian4.clamp`. [#10197](https://github.com/CesiumGS/cesium/pull/10197)
- Added a 'renderable' property to 'Fog' to disable its visual rendering while preserving tiles culling at a distance. [#10186](https://github.com/CesiumGS/cesium/pull/10186)
- Refactored metadata API so `tileset.metadata` and `content.group.metadata` are more symmetric with `content.metadata` and `tile.metadata`. [#10224](https://github.com/CesiumGS/cesium/pull/10224)

##### Fixes :wrench:

- Fixed `Scene` documentation for `msaaSamples` property. [#10205](https://github.com/CesiumGS/cesium/pull/10205)
- Fixed a bug where `pnts` tiles would crash when `Cesium.ExperimentalFeatures.enableModelExperimental` was true. [#10183](https://github.com/CesiumGS/cesium/pull/10183)
- Fixed an issue with Firefox and dimensionless SVG images. [#9191](https://github.com/CesiumGS/cesium/pull/9191)
- Fixed `ShadowMap` documentation for `options.pointLightRadius` type. [#10195](https://github.com/CesiumGS/cesium/pull/10195)
- Fixed evaluation of `minimumLevel` on metadataFailure for TileMapServiceImageryProvider. [#10198](https://github.com/CesiumGS/cesium/pull/10198)
- Fixed a bug where models without normals would render as solid black. Now, such models will use unlit shading. [#10237](https://github.com/CesiumGS/cesium/pull/10237)

##### Deprecated :hourglass_flowing_sand:

- `ImagerySplitDirection` and `Scene.imagerySplitPosition` have been deprecated and will be removed in CesiumJS 1.94. Use `SplitDirection` and `Scene.splitPosition` instead.
- Tilesets and models should now specify image-based lighting parameters in `ImageBasedLighting` instead of as individual options. The individual parameters are deprecated and will be removed in CesiumJS 1.94. [#10226](https://github.com/CesiumGS/cesium/pull/10226)

### 1.91 - 2022-03-01

##### Breaking Changes :mega:

- In Cesium 1.92, `when.js` will be removed and replaced with native promises. `Cesium.when` is deprecated and will be removed in 1.92. Any `Promise` returned from a function as of 1.92 will switch the native `Promise` API. Code bases using cesium will likely need updates after this change. See the [upgrade guide](https://community.cesium.com/t/cesiumjs-is-switching-from-when-js-to-native-promises-which-will-be-a-breaking-change-in-1-92/17213) for instructions on how to update your code base to be compliant with native promises.
- Fixed an inconsistently handled exception in `camera.getPickRay` that arises when the scene is not rendered. `camera.getPickRay` can now return undefined. [#10139](https://github.com/CesiumGS/cesium/pull/10139)

##### Additions :tada:

- Added MSAA support for WebGL2. Enabled in the `Viewer` constructor with the `msaaSamples` option and can be controlled through `Scene.msaaSamples`.
- glTF contents now use `ModelExperimental` by default. [#10055](https://github.com/CesiumGS/cesium/pull/10055)
- Added the ability to toggle back-face culling in `ModelExperimental`. [#10070](https://github.com/CesiumGS/cesium/pull/10070)
- Added `depthPlaneEllipsoidOffset` to `Viewer` and `Scene` constructors to address rendering artifacts below the WGS84 ellipsoid. [#9200](https://github.com/CesiumGS/cesium/pull/9200)
- Added support for `debugColorTiles` in `ModelExperimental`. [#10071](https://github.com/CesiumGS/cesium/pull/10071)
- Added support for shadows in `ModelExperimental`. [#10077](https://github.com/CesiumGS/cesium/pull/10077)
- Added `packArray` and `unpackArray` for matrix types. [#10118](https://github.com/CesiumGS/cesium/pull/10118)
- Added more affine transformation helper functions to `Matrix2`, `Matrix3`, and `Matrix4`. [#10124](https://github.com/CesiumGS/cesium/pull/10124)
  - Added `setScale`, `setUniformScale`, `setRotation`, `getRotation`, and `multiplyByUniformScale` to `Matrix2`.
  - Added `setScale`, `setUniformScale`, `setRotation`, and `multiplyByUniformScale` to `Matrix3`.
  - Added `setUniformScale`, `setRotation`, `getRotation`, and `fromRotation` to `Matrix4`.
- Added `AxisAlignedBoundingBox.fromCorners`. [#10130](https://github.com/CesiumGS/cesium/pull/10130)
- Added `BoundingSphere.fromTransformation`. [#10130](https://github.com/CesiumGS/cesium/pull/10130)
- Added `OrientedBoundingBox.fromTransformation`, `OrientedBoundingBox.computeCorners`, and `OrientedBoundingBox.computeTransformation`. [#10130](https://github.com/CesiumGS/cesium/pull/10130)
- Added `Rectangle.subsection`. [#10130](https://github.com/CesiumGS/cesium/pull/10130)
- Added option to show tileset credits on screen. [#10144](https://github.com/CesiumGS/cesium/pull/10144)
- glTF copyrights now appear under the credits display. [#10138](https://github.com/CesiumGS/cesium/pull/10138)
- Credits are now sorted based on their number of occurrences. [#10141](https://github.com/CesiumGS/cesium/pull/10141)

##### Fixes :wrench:

- Fixed a bug where updating `ModelExperimental`'s model matrix would not update its bounding sphere. [#10078](https://github.com/CesiumGS/cesium/pull/10078)
- Fixed feature ID texture artifacts on Safari. [#10111](https://github.com/CesiumGS/cesium/pull/10111)
- Fixed a bug where a translucent shader applied to a `ModelExperimental` with opaque features was not being rendered. [#10110](https://github.com/CesiumGS/cesium/pull/10110)

### 1.90 - 2022-02-01

##### Additions :tada:

- Feature IDs for styling and picking in `ModelExperimental` can now be selected via `(tileset|model).featureIdIndex` and `(tileset|model).instanceFeatureIdIndex`. [#10018](https://github.com/CesiumGS/cesium/pull/10018)
- Added support for all types of feature IDs in `CustomShader`. [#10018](https://github.com/CesiumGS/cesium/pull/10018)
- Moved documentation for `CustomShader` into `Documentation/CustomShaderGuide/` to make it more discoverable. [#10054](https://github.com/CesiumGS/cesium/pull/10054)
- Added getters `Cesium3DTileFeature.featureId` and `ModelFeature.featureId` so the feature ID or batch ID can be accessed from a picked feature. [#10022](https://github.com/CesiumGS/cesium/pull/10022)
- Added `I3dmLoader` to transcode .i3dm to `ModelExperimental`. [#9968](https://github.com/CesiumGS/cesium/pull/9968)
- Added `PntsLoader` to transcode .pnts to `ModelExperimental`. [#9978](https://github.com/CesiumGS/cesium/pull/9978)
- Added point cloud attenuation support to `ModelExperimental`. [#9998](https://github.com/CesiumGS/cesium/pull/9998)

##### Fixes :wrench:

- Fixed an error when loading GeoJSON with null `stroke` or `fill` properties but valid opacity values. [#9717](https://github.com/CesiumGS/cesium/pull/9717)
- Fixed `scene.pickTranslucentDepth` for translucent point clouds with eye dome lighting. [#9991](https://github.com/CesiumGS/cesium/pull/9991)
- Added a setter for `tileset.pointCloudShading` that throws if set to `undefined` to clarify that this is disallowed. [#9998](https://github.com/CesiumGS/cesium/pull/9998)
- Fixes handling .b3dm `_BATCHID` accessors in `ModelExperimental` [#10008](https://github.com/CesiumGS/cesium/pull/10008) and [10031](https://github.com/CesiumGS/cesium/pull/10031)
- Fixed path entity being drawn when data is unavailable [#1704](https://github.com/CesiumGS/cesium/pull/1704)
- Fixed setting `tileset.imageBasedLightingFactor` has no effect on i3dm tile content. [#10020](https://github.com/CesiumGS/cesium/pull/10020)
- Zooming out is no longer sluggish when close to `screenSpaceCameraController.minimumDistance`. [#9932](https://github.com/CesiumGS/cesium/pull/9932)
- Fixed Particle System Weather sandcastle demo to work with new ES6 rules. [#10045](https://github.com/CesiumGS/cesium/pull/10045)

### 1.89 - 2022-01-03

##### Breaking Changes :mega:

- Removed `Scene.debugShowGlobeDepth`. [#9965](https://github.com/CesiumGS/cesium/pull/9965)
- Removed `CesiumInspectorViewModel.globeDepth` and `CesiumInspectorViewModel.pickDepth`. [#9965](https://github.com/CesiumGS/cesium/pull/9965)
- `barycentricCoordinates` returns `undefined` when the input triangle is degenerate. [#9175](https://github.com/CesiumGS/cesium/pull/9175)

##### Additions :tada:

- Added a `pointSize` field to custom vertex shaders for more control over shading point clouds. [#9960](https://github.com/CesiumGS/cesium/pull/9960)
- Added `lambertDiffuseMultiplier` property to Globe object to enhance terrain lighting. [#9878](https://github.com/CesiumGS/cesium/pull/9878)
- Added `getFeatureInfoUrl` option to `WebMapServiceImageryProvider` which reads the getFeatureInfo request URL for WMS service if it differs with the getCapabilities URL. [#9563](https://github.com/CesiumGS/cesium/pull/9563)
- Added `tileset.enableModelExperimental` so tilesets with `Model` and `ModelExperimental` can be mixed in the same scene. [#9982](https://github.com/CesiumGS/cesium/pull/9982)

##### Fixes :wrench:

- Fixed handling of vec3 vertex colors in `ModelExperimental`. [#9955](https://github.com/CesiumGS/cesium/pull/9955)
- Fixed handling of Draco quantized vec3 vertex colors in `ModelExperimental`. [#9957](https://github.com/CesiumGS/cesium/pull/9957)
- Fixed handling of vec3 vertex colors in `CustomShaderPipelineStage`. [#9964](https://github.com/CesiumGS/cesium/pull/9964)
- Fixes how `Camera.changed` handles changes in `heading`. [#9970](https://github.com/CesiumGS/cesium/pull/9970)
- Fixed handling of subtree root transforms in `Implicit3DTileContent`. [#9971](https://github.com/CesiumGS/cesium/pull/9971)
- Fixed issue in `ModelExperimental` where indices were not the correct data type after draco decode. [#9974](https://github.com/CesiumGS/cesium/pull/9974)
- Fixed WMS 1.3.0 `GetMap` `bbox` parameter so that it follows the axis ordering as defined in the EPSG database. [#9797](https://github.com/CesiumGS/cesium/pull/9797)
- Fixed `KmlDataSource` so that it can handle relative URLs for additional elements - video, audio, iframe etc. [#9328](https://github.com/CesiumGS/cesium/pull/9328)

### 1.88 - 2021-12-01

##### Fixes :wrench:

- Fixed a bug with .ktx2 textures having an incorrect minification filter. [#9876](https://github.com/CesiumGS/cesium/pull/9876/)
- Fixed incorrect diffuse texture alpha in glTFs with the `KHR_materials_pbrSpecularGlossiness` extension. [#9943](https://github.com/CesiumGS/cesium/pull/9943)

### 1.87.1 - 2021-11-09

##### Additions :tada:

- Added experimental implementations of [3D Tiles Next](https://github.com/CesiumGS/3d-tiles/tree/main/next). The following extensions are supported:
  - [3DTILES_content_gltf](https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_content_gltf) for using glTF models directly as tile contents
  - [3DTILES_metadata](https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata) for adding structured metadata to tilesets, tiles, or groups of tile content
  - [EXT_mesh_features](https://github.com/KhronosGroup/glTF/pull/2082) for adding feature identification and feature metadata to glTF models
  - [3DTILES_implicit_tiling](https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_implicit_tiling) for a compact representation of quadtrees and octrees
  - [3DTILES_bounding_volume_S2](https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_bounding_volume_S2) for [S2](https://s2geometry.io/) bounding volumes
  - [3DTILES_multiple_contents](https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_multiple_contents) for storing multiple contents within a single tile
- Added `ModelExperimental`, a new experimental architecture for loading glTF models. It is disabled by default; set `ExperimentalFeatures.enableModelExperimental = true` to enable it.
- Added `CustomShader` class for styling `Cesium3DTileset` or `ModelExperimental` with custom GLSL shaders
- Added Sandcastle examples for 3D Tiles Next: [Photogrammetry Classification](http://sandcastle.cesium.com/index.html?src=3D%20Tiles%20Next%20Photogrammetry%20Classification.html&label=3D%20Tiles%20Next), [CDB Yemen](http://sandcastle.cesium.com/index.html?src=3D%20Tiles%20Next%20CDB%20Yemen.html&label=3D%20Tiles%20Next), and [S2 Globe](http://sandcastle.cesium.com/index.html?src=3D%20Tiles%20Next%20S2%20Globe.html&label=3D%20Tiles%20Next)

### 1.87 - 2021-11-01

##### Additions :tada:

- Added `ScreenOverlay` support to `KmlDataSource`. [#9864](https://github.com/CesiumGS/cesium/pull/9864)
- Added back some support for Draco attribute quantization as a workaround until a full fix in the next Draco version. [#9904](https://github.com/CesiumGS/cesium/pull/9904)
- Added `CumulusCloud.color` for customizing cloud colors. [#9877](https://github.com/CesiumGS/cesium/pull/9877)

##### Fixes :wrench:

- Point cloud styles that reference a missing property now treat the missing property as `undefined` rather than throwing an error. [#9882](https://github.com/CesiumGS/cesium/pull/9882)
- Fixed Draco attribute quantization in point clouds. [#9908](https://github.com/CesiumGS/cesium/pull/9908)
- Fixed crashes caused by the cloud noise texture exceeding WebGL's maximum supported texture size. [#9885](https://github.com/CesiumGS/cesium/pull/9885)
- Updated third-party zip.js library to 2.3.12 to fix compatibility with Webpack 4. [#9897](https://github.com/cesiumgs/cesium/pull/9897)

### 1.86.1 - 2021-10-15

##### Fixes :wrench:

- Fixed zip.js configurations causing CesiumJS to not work with Node 16. [#9861](https://github.com/CesiumGS/cesium/pull/9861)
- Fixed a bug in `Rectangle.union` with rectangles that span the entire globe. [#9866](https://github.com/CesiumGS/cesium/pull/9866)

### 1.86 - 2021-10-01

##### Breaking Changes :mega:

- Updated to Draco 1.4.1 and temporarily disabled attribute quantization. [#9847](https://github.com/CesiumGS/cesium/issues/9847)

##### Fixes :wrench:

- Fixed incorrect behavior in `CameraFlightPath` when using Columbus View. [#9192](https://github.com/CesiumGS/cesium/pull/9192)

### 1.85 - 2021-09-01

##### Breaking Changes :mega:

- Removed `Scene.terrainExaggeration` and `options.terrainExaggeration` for `CesiumWidget`, `Viewer`, and `Scene`, which were deprecated in CesiumJS 1.83. Use `Globe.terrainExaggeration` instead.

##### Additions :tada:

- Added `CloudCollection` and `CumulusCloud` for adding procedurally generated clouds to a scene. [#9737](https://github.com/CesiumGS/cesium/pull/9737)
- `BingMapsGeocoderService` now takes an optional [Culture Code](https://docs.microsoft.com/en-us/bingmaps/rest-services/common-parameters-and-types/supported-culture-codes) for localizing results. [#9729](https://github.com/CesiumGS/cesium/pull/9729)

##### Fixes :wrench:

- Fixed several crashes related to point cloud eye dome lighting. [#9719](https://github.com/CesiumGS/cesium/pull/9719)

### 1.84 - 2021-08-02

##### Breaking Changes :mega:

- Dropped support for Internet Explorer, which was deprecated in CesiumJS 1.83.

##### Additions :tada:

- Added a `polylinePositions` getter to `Cesium3DTileFeature` that gets the decoded positions of a polyline vector feature. [#9684](https://github.com/CesiumGS/cesium/pull/9684)
- Added `ImageryLayerCollection.pickImageryLayers`, which determines the imagery layers that are intersected by a pick ray. [#9651](https://github.com/CesiumGS/cesium/pull/9651)

##### Fixes :wrench:

- Fixed an issue where styling vector points based on their batch table properties would crash. [#9692](https://github.com/CesiumGS/cesium/pull/9692)
- Fixed an issue in `TileBoundingRegion.distanceToCamera` that caused incorrect results when the camera was on the opposite site of the globe. [#9678](https://github.com/CesiumGS/cesium/pull/9678)
- Fixed an error with removing a CZML datasource when the clock interval has a duration of zero. [#9637](https://github.com/CesiumGS/cesium/pull/9637)
- Fixed the ability to set a material's image to `undefined` and `Material.DefaultImageId`. [#9644](https://github.com/CesiumGS/cesium/pull/9644)
- Fixed render crash when creating a `polylineVolume` with very close points. [#9669](https://github.com/CesiumGS/cesium/pull/9669)
- Fixed a bug in `PolylineGeometry` that incorrectly shifted colors when duplicate positions were removed. [#9676](https://github.com/CesiumGS/cesium/pull/9676)
- Fixed the calculation of `OrientedBoundingBox.distancedSquaredTo` such that they handle `halfAxes` with magnitudes near zero. [#9670](https://github.com/CesiumGS/cesium/pull/9670)
- Fixed a crash that would hang the browser if a `Label` was created with a soft hyphen in its text. [#9682](https://github.com/CesiumGS/cesium/pull/9682)
- Fixed the incorrect calculation of `distanceSquaredTo` in `BoundingSphere`. [#9686](https://github.com/CesiumGS/cesium/pull/9686)

### 1.83 - 2021-07-01

##### Breaking Changes :mega:

- Dropped support for KTX1 and Crunch textures; use the [`ktx2ktx2`](https://github.com/KhronosGroup/KTX-Software) converter tool to update existing KTX1 files.

##### Additions :tada:

- Added support for KTX2 and Basis Universal compressed textures. [#9513](https://github.com/CesiumGS/cesium/issues/9513)
  - Added support for glTF models with the [`KHR_texture_basisu`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_basisu/README.md) extension.
  - Added support for 8-bit, 16-bit float, and 32-bit float KTX2 specular environment maps.
  - Added support for KTX2 images in `Material`.
  - Added new `PixelFormat` and `WebGLConstants` enums from WebGL extensions `WEBGL_compressed_texture_etc`, `WEBGL_compressed_texture_astc`, and `EXT_texture_compression_bptc`.
- Added dynamic terrain exaggeration with `Globe.terrainExaggeration` and `Globe.terrainExaggerationRelativeHeight`. [#9603](https://github.com/CesiumGS/cesium/pull/9603)
- Added `CustomHeightmapTerrainProvider`, a simple `TerrainProvider` that gets height values from a callback function. [#9604](https://github.com/CesiumGS/cesium/pull/9604)
- Added the ability to hide outlines on OSM Buildings and other tilesets and glTF models using the `CESIUM_primitive_outline` extension. [#8959](https://github.com/CesiumGS/cesium/issues/8959)
- Added checks for supported 3D Tiles extensions. [#9552](https://github.com/CesiumGS/cesium/issues/9552)
- Added option to ignore extraneous colorspace information in glTF textures and `ImageBitmap`. [#9624](https://github.com/CesiumGS/cesium/pull/9624)
- Added `options.fadingEnabled` parameter to `ShadowMap` to control whether shadows fade out when the light source is close to the horizon. [#9565](https://github.com/CesiumGS/cesium/pull/9565)
- Added documentation clarifying that the `outlineWidth` property will be ignored on all major browsers on Windows platforms. [#9600](https://github.com/CesiumGS/cesium/pull/9600)
- Added documentation for `KmlTour`, `KmlTourFlyTo`, and `KmlTourWait`. Added documentation and a `kmlTours` getter to `KmlDataSource`. Removed references to `KmlTourSoundCues`. [#8073](https://github.com/CesiumGS/cesium/issues/8073)

##### Fixes :wrench:

- Fixed a regression where older tilesets without a top-level `geometricError` would fail to load. [#9618](https://github.com/CesiumGS/cesium/pull/9618)
- Fixed an issue in `WebMapTileServiceImageryProvider` where using URL subdomains caused query parameters to be dropped from requests. [#9606](https://github.com/CesiumGS/cesium/pull/9606)
- Fixed an issue in `ScreenSpaceCameraController.tilt3DOnTerrain` that caused unexpected camera behavior when tilting terrain diagonally along the screen. [#9562](https://github.com/CesiumGS/cesium/pull/9562)
- Fixed error handling in `GlobeSurfaceTile` to print terrain tile request errors to console. [#9570](https://github.com/CesiumGS/cesium/pull/9570)
- Fixed broken image URL in the KML Sandcastle. [#9579](https://github.com/CesiumGS/cesium/pull/9579)
- Fixed an error where the `positionToEyeEC` and `tangentToEyeMatrix` properties for custom materials were not set in `GlobeFS`. [#9597](https://github.com/CesiumGS/cesium/pull/9597)
- Fixed misleading documentation in `Matrix4.inverse` and `Matrix4.inverseTransformation` that used "affine transformation" instead of "rotation and translation" specifically. [#9608](https://github.com/CesiumGS/cesium/pull/9608)
- Fixed a regression where external images in glTF models were not being loaded with `preferImageBitmap`, which caused them to decode on the main thread and cause frame rate stuttering. [#9627](https://github.com/CesiumGS/cesium/pull/9627)
- Fixed misleading "else" case condition for `color` and `show` in `Cesium3DTileStyle`. A default `color` value is used if no `color` conditions are given. The default value for `show`, `true`, is used if no `show` conditions are given. [#9633](https://github.com/CesiumGS/cesium/pull/9633)
- Fixed a crash that occurred after disabling and re-enabling a post-processing stage. This also prevents the screen from randomly flashing when enabling stages for the first time. [#9649](https://github.com/CesiumGS/cesium/pull/9649)

##### Deprecated :hourglass_flowing_sand:

- `Scene.terrainExaggeration` and `options.terrainExaggeration` for `CesiumWidget`, `Viewer`, and `Scene` have been deprecated and will be removed in CesiumJS 1.85. They will be replaced with `Globe.terrainExaggeration`.
- Support for Internet Explorer has been deprecated and will end in CesiumJS 1.84.

### 1.82.1 - 2021-06-01

- This is an npm only release to fix the improperly published 1.82.0.

### 1.82 - 2021-06-01

##### Additions :tada:

- Added `FeatureDetection.supportsBigInt64Array`, `FeatureDetection.supportsBigUint64Array` and `FeatureDetection.supportsBigInt`.

##### Fixes :wrench:

- Fixed `processTerrain` in `decodeGoogleEarthEnterprisePacket` to handle a newer terrain packet format that includes water surface meshes after terrain meshes. [#9519](https://github.com/CesiumGS/cesium/pull/9519)

### 1.81 - 2021-05-01

##### Fixes :wrench:

- Fixed an issue where `Camera.flyTo` would not work properly with a non-WGS84 Ellipsoid. [#9498](https://github.com/CesiumGS/cesium/pull/9498)
- Fixed an issue where setting the `ViewportQuad` rectangle after creating the viewport had no effect.[#9511](https://github.com/CesiumGS/cesium/pull/9511)
- Fixed an issue where TypeScript was not picking up type defintions for `ArcGISTiledElevationTerrainProvider`. [#9522](https://github.com/CesiumGS/cesium/pull/9522)

##### Deprecated :hourglass_flowing_sand:

- `loadCRN` and `loadKTX` have been deprecated and will be removed in CesiumJS 1.83. They will be replaced with support for KTX2. [#9478](https://github.com/CesiumGS/cesium/pull/9478)

### 1.80 - 2021-04-01

##### Additions :tada:

- Added support for drawing ground primitives on translucent 3D Tiles. [#9399](https://github.com/CesiumGS/cesium/pull/9399)

### 1.79.1 - 2021-03-01

##### Fixes :wrench:

- Fixed a regression in 1.79 that broke terrain exaggeration. [#9397](https://github.com/CesiumGS/cesium/pull/9397)
- Fixed an issue where interpolating certain small rhumblines with surface distance 0.0 would not return the expected result. [#9430](https://github.com/CesiumGS/cesium/pull/9430)

### 1.79 - 2021-03-01

##### Breaking Changes :mega:

- Removed `Cesium3DTileset.url`, which was deprecated in CesiumJS 1.78. Use `Cesium3DTileset.resource.url` to retrieve the url value.
- Removed `EasingFunction.QUADRACTIC_IN`, which was deprecated in CesiumJS 1.77. Use `EasingFunction.QUADRATIC_IN`.
- Removed `EasingFunction.QUADRACTIC_OUT`, which was deprecated in CesiumJS 1.77. Use `EasingFunction.QUADRATIC_OUT`.
- Removed `EasingFunction.QUADRACTIC_IN_OUT`, which was deprecated in CesiumJS 1.77. Use `EasingFunction.QUADRATIC_IN_OUT`.
- Changed `TaskProcessor.maximumActiveTasks` constructor option to be infinity by default. [#9313](https://github.com/CesiumGS/cesium/pull/9313)

##### Fixes :wrench:

- Fixed an issue that prevented use of the full CesiumJS zip release package in a Node.js application.
- Fixed an issue where certain inputs to EllipsoidGeodesic would result in a surfaceDistance of NaN. [#9316](https://github.com/CesiumGS/cesium/pull/9316)
- Fixed `sampleTerrain` and `sampleTerrainMostDetailed` not working for `ArcGISTiledElevationTerrainProvider`. [#9286](https://github.com/CesiumGS/cesium/pull/9286)
- Consistent with the spec, CZML `polylineVolume` now expects its shape positions to specified using the `cartesian2` property. Use of the `cartesian` is also supported for backward-compatibility. [#9384](https://github.com/CesiumGS/cesium/pull/9384)
- Removed an unnecessary matrix copy each time a `Cesium3DTileset` is updated. [#9366](https://github.com/CesiumGS/cesium/pull/9366)

### 1.78 - 2021-02-01

##### Additions :tada:

- Added `BillboardCollection.show`, `EntityCluster.show`, `LabelCollection.show`, `PointPrimitiveCollection.show`, and `PolylineCollection.show` for a convenient way to control show of the entire collection [#9307](https://github.com/CesiumGS/cesium/pull/9307)
- `TaskProcessor` now accepts an absolute URL in addition to a worker name as it's first parameter. This makes it possible to use custom web workers with Cesium's task processing system without copying them to Cesium's Workers directory. [#9338](https://github.com/CesiumGS/cesium/pull/9338)
- Added `Cartesian2.cross` which computes the magnitude of the cross product of two vectors whose Z values are implicitly 0. [#9305](https://github.com/CesiumGS/cesium/pull/9305)
- Added `Math.previousPowerOfTwo`. [#9310](https://github.com/CesiumGS/cesium/pull/9310)

##### Fixes :wrench:

- Fixed an issue with `Math.mod` introducing a small amount of floating point error even when the input did not need to be altered. [#9354](https://github.com/CesiumGS/cesium/pull/9354)

##### Deprecated :hourglass_flowing_sand:

- `Cesium3DTileset.url` has been deprecated and will be removed in Cesium 1.79. Instead, use `Cesium3DTileset.resource.url` to retrieve the url value.

### 1.77 - 2021-01-04

##### Additions :tada:

- Added `ElevationBand` material, which maps colors and gradients to exact elevations. [#9132](https://github.com/CesiumGS/cesium/pull/9132)

##### Fixes :wrench:

- Fixed an issue where changing a model or tileset's `color`, `backFaceCulling`, or `silhouetteSize` would trigger an error. [#9271](https://github.com/CesiumGS/cesium/pull/9271)

##### Deprecated :hourglass_flowing_sand:

- `EasingFunction.QUADRACTIC_IN` was deprecated and will be removed in Cesium 1.79. It has been replaced with `EasingFunction.QUADRATIC_IN`. [#9220](https://github.com/CesiumGS/cesium/issues/9220)
- `EasingFunction.QUADRACTIC_OUT` was deprecated and will be removed in Cesium 1.79. It has been replaced with `EasingFunction.QUADRATIC_OUT`. [#9220](https://github.com/CesiumGS/cesium/issues/9220)
- `EasingFunction.QUADRACTIC_IN_OUT` was deprecated and will be removed in Cesium 1.79. It has been replaced with `EasingFunction.QUADRATIC_IN_OUT`. [#9220](https://github.com/CesiumGS/cesium/issues/9220)

### 1.76 - 2020-12-01

##### Fixes :wrench:

- Fixed an issue where tileset styles would be reapplied every frame when a tileset has a style and `tileset.preloadWhenHidden` is true and `tileset.show` is false. Also fixed a related issue where styles would be reapplied if the style being set is the same as the active style. [#9223](https://github.com/CesiumGS/cesium/pull/9223)
- Fixed JSDoc and TypeScript type definitions for `EllipsoidTangentPlane.fromPoints` which didn't list a return type. [#9227](https://github.com/CesiumGS/cesium/pull/9227)
- Updated DOMPurify from 1.0.8 to 2.2.2. [#9240](https://github.com/CesiumGS/cesium/issues/9240)

### 1.75 - 2020-11-02

##### Fixes :wrench:

- Fixed an issue in the PBR material where models with the `KHR_materials_unlit` extension had the normal attribute disabled. [#9173](https://github.com/CesiumGS/cesium/pull/9173).
- Fixed JSDoc and TypeScript type definitions for `writeTextToCanvas` which listed incorrect return type. [#9196](https://github.com/CesiumGS/cesium/pull/9196)
- Fixed JSDoc and TypeScript type definitions for `Viewer.globe` constructor option to allow disabling the globe on startup. [#9063](https://github.com/CesiumGS/cesium/pull/9063)

### 1.74 - 2020-10-01

##### Additions :tada:

- Added `Matrix3.inverseTranspose` and `Matrix4.inverseTranspose`. [#9135](https://github.com/CesiumGS/cesium/pull/9135)

##### Fixes :wrench:

- Fixed an issue where the camera zooming is stuck when looking up. [#9126](https://github.com/CesiumGS/cesium/pull/9126)
- Fixed an issue where Plane doesn't rotate correctly around the main local axis. [#8268](https://github.com/CesiumGS/cesium/issues/8268)
- Fixed clipping planes with non-uniform scale. [#9135](https://github.com/CesiumGS/cesium/pull/9135)
- Fixed an issue where ground primitives would get clipped at certain camera angles. [#9114](https://github.com/CesiumGS/cesium/issues/9114)
- Fixed a bug that could cause half of the globe to disappear when setting the `terrainProvider. [#9161](https://github.com/CesiumGS/cesium/pull/9161)
- Fixed a crash when loading Cesium OSM buildings with shadows enabled. [#9172](https://github.com/CesiumGS/cesium/pull/9172)

### 1.73 - 2020-09-01

##### Breaking Changes :mega:

- Removed `MapboxApi`, which was deprecated in CesiumJS 1.72. Pass your access token directly to the `MapboxImageryProvider` or `MapboxStyleImageryProvider` constructors.
- Removed `BingMapsApi`, which was deprecated in CesiumJS 1.72. Pass your access key directly to the `BingMapsImageryProvider` or `BingMapsGeocoderService` constructors.

##### Additions :tada:

- Added support for the CSS `line-height` specifier in the `font` property of a `Label`. [#8954](https://github.com/CesiumGS/cesium/pull/8954)
- `Viewer` now has default pick handling for `Cesium3DTileFeature` data and will display its properties in the default Viewer `InfoBox` as well as set `Viewer.selectedEntity` to a transient Entity instance representing the data. [#9121](https://github.com/CesiumGS/cesium/pull/9121).

##### Fixes :wrench:

- Fixed several artifacts on mobile devices caused by using insufficient precision. [#9064](https://github.com/CesiumGS/cesium/pull/9064)
- Fixed handling of `data:` scheme for the Cesium ion logo URL. [#9085](https://github.com/CesiumGS/cesium/pull/9085)
- Fixed an issue where the boundary rectangles in `TileAvailability` are not sorted correctly, causing terrain to sometimes fail to achieve its maximum detail. [#9098](https://github.com/CesiumGS/cesium/pull/9098)
- Fixed an issue where a request for an availability tile of the reference layer is delayed because the throttle option is on. [#9099](https://github.com/CesiumGS/cesium/pull/9099)
- Fixed an issue where Node.js tooling could not resolve package.json. [#9105](https://github.com/CesiumGS/cesium/pull/9105)
- Fixed classification artifacts on some mobile devices. [#9108](https://github.com/CesiumGS/cesium/pull/9108)
- Fixed an issue where Resource silently fails to load if being used multiple times. [#9093](https://github.com/CesiumGS/cesium/issues/9093)

### 1.72 - 2020-08-03

##### Breaking Changes :mega:

- CesiumJS no longer ships with a default Mapbox access token and Mapbox imagery layers have been removed from the `BaseLayerPicker` defaults. If you are using `MapboxImageryProvider` or `MapboxStyleImageryProvider`, use `options.accessToken` when initializing the imagery provider.

##### Additions :tada:

- Added support for glTF multi-texturing via `TEXCOORD_1`. [#9075](https://github.com/CesiumGS/cesium/pull/9075)

##### Deprecated :hourglass_flowing_sand:

- `MapboxApi.defaultAccessToken` was deprecated and will be removed in CesiumJS 1.73. Pass your access token directly to the MapboxImageryProvider or MapboxStyleImageryProvider constructors.
- `BingMapsApi` was deprecated and will be removed in CesiumJS 1.73. Pass your access key directly to the BingMapsImageryProvider or BingMapsGeocoderService constructors.

##### Fixes :wrench:

- Fixed `Color.fromCssColorString` when color string contains spaces. [#9015](https://github.com/CesiumGS/cesium/issues/9015)
- Fixed 3D Tileset replacement refinement when leaf is empty. [#8996](https://github.com/CesiumGS/cesium/pull/8996)
- Fixed a bug in the assessment of terrain tile visibility [#9033](https://github.com/CesiumGS/cesium/issues/9033)
- Fixed vertical polylines with `arcType: ArcType.RHUMB`, including lines drawn via GeoJSON. [#9028](https://github.com/CesiumGS/cesium/pull/9028)
- Fixed wall rendering when underground [#9041](https://github.com/CesiumGS/cesium/pull/9041)
- Fixed issue where a side of the wall was missing if the first position and the last position were equal [#9044](https://github.com/CesiumGS/cesium/pull/9044)
- Fixed `translucencyByDistance` for label outline color [#9003](https://github.com/CesiumGS/cesium/pull/9003)
- Fixed return value for `SampledPositionProperty.removeSample` [#9017](https://github.com/CesiumGS/cesium/pull/9017)
- Fixed issue where wall doesn't have correct texture coordinates when there are duplicate positions input [#9042](https://github.com/CesiumGS/cesium/issues/9042)
- Fixed an issue where clipping planes would not clip at the correct distances on some Android devices, most commonly reproducible on devices with `Mali` GPUs that do not support float textures via WebGL [#9023](https://github.com/CesiumGS/cesium/issues/9023)

### 1.71 - 2020-07-01

##### Breaking Changes :mega:

- Updated `WallGeometry` to respect the order of positions passed in, instead of making the positions respect a counter clockwise winding order. This will only affect the look of walls with an image material. If this changed the way your wall is drawing, reverse the order of the positions. [#8955](https://github.com/CesiumGS/cesium/pull/8955/)

##### Additions :tada:

- Added `backFaceCulling` property to `Cesium3DTileset` and `Model` to support viewing the underside or interior of a tileset or model. [#8981](https://github.com/CesiumGS/cesium/pull/8981)
- Added `Ellipsoid.surfaceArea` for computing the approximate surface area of a rectangle on the surface of an ellipsoid. [#8986](https://github.com/CesiumGS/cesium/pull/8986)
- Added support for PolylineVolume in CZML. [#8841](https://github.com/CesiumGS/cesium/pull/8841)
- Added `Color.toCssHexString` for getting the CSS hex string equivalent for a color. [#8987](https://github.com/CesiumGS/cesium/pull/8987)

##### Fixes :wrench:

- Fixed issue where tileset was not playing glTF animations. [#8962](https://github.com/CesiumGS/cesium/issues/8962)
- Fixed a divide-by-zero bug in `Ellipsoid.geodeticSurfaceNormal` when given the origin as input. `undefined` is returned instead. [#8986](https://github.com/CesiumGS/cesium/pull/8986)
- Fixed error with `WallGeometry` when there were adjacent positions with very close values. [#8952](https://github.com/CesiumGS/cesium/pull/8952)
- Fixed artifact for skinned model when log depth is enabled. [#6447](https://github.com/CesiumGS/cesium/issues/6447)
- Fixed a bug where certain rhumb arc polylines would lead to a crash. [#8787](https://github.com/CesiumGS/cesium/pull/8787)
- Fixed handling of Label's backgroundColor and backgroundPadding option [#8949](https://github.com/CesiumGS/cesium/pull/8949)
- Fixed several bugs when rendering CesiumJS in a WebGL 2 context. [#797](https://github.com/CesiumGS/cesium/issues/797)
- Fixed a bug where switching from perspective to orthographic caused triangles to overlap each other incorrectly. [#8346](https://github.com/CesiumGS/cesium/issues/8346)
- Fixed a bug where switching to orthographic camera on the first frame caused the zoom level to be incorrect. [#8853](https://github.com/CesiumGS/cesium/pull/8853)
- Fixed `scene.pickFromRay` intersection inaccuracies. [#8439](https://github.com/CesiumGS/cesium/issues/8439)
- Fixed a bug where a null or undefined name property passed to the `Entity` constructor would throw an exception.[#8832](https://github.com/CesiumGS/cesium/pull/8832)
- Fixed JSDoc and TypeScript type definitions for `ScreenSpaceEventHandler.getInputAction` which listed incorrect return type. [#9002](https://github.com/CesiumGS/cesium/pull/9002)
- Improved the style of the error panel. [#8739](https://github.com/CesiumGS/cesium/issues/8739)
- Fixed animation widget SVG icons not appearing in iOS 13.5.1. [#8993](https://github.com/CesiumGS/cesium/pull/8993)

### 1.70.1 - 2020-06-10

##### Additions :tada:

- Add a `toString` method to the `Resource` class in case an instance gets logged as a string. [#8722](https://github.com/CesiumGS/cesium/issues/8722)
- Exposed `Transforms.rotationMatrixFromPositionVelocity` method from Cesium's private API. [#8927](https://github.com/CesiumGS/cesium/issues/8927)

##### Fixes :wrench:

- Fixed JSDoc and TypeScript type definitions for all `ImageryProvider` types, which were missing `defaultNightAlpha` and `defaultDayAlpha` properties. [#8908](https://github.com/CesiumGS/cesium/pull/8908)
- Fixed JSDoc and TypeScript for `MaterialProperty`, which were missing the ability to take primitive types in their constructor. [#8904](https://github.com/CesiumGS/cesium/pull/8904)
- Fixed JSDoc and TypeScript type definitions to allow the creation of `GeometryInstance` instances using `XXXGeometry` classes. [#8941](https://github.com/CesiumGS/cesium/pull/8941).
- Fixed JSDoc and TypeScript for `buildModuleUrl`, which was accidentally excluded from the official CesiumJS API. [#8923](https://github.com/CesiumGS/cesium/pull/8923)
- Fixed JSDoc and TypeScript type definitions for `EllipsoidGeodesic` which incorrectly listed `result` as required. [#8904](https://github.com/CesiumGS/cesium/pull/8904)
- Fixed JSDoc and TypeScript type definitions for `EllipsoidTangentPlane.fromPoints`, which takes an array of `Cartesian3`, not a single instance. [#8928](https://github.com/CesiumGS/cesium/pull/8928)
- Fixed JSDoc and TypeScript type definitions for `EntityCollection.getById` and `CompositeEntityCollection.getById`, which can both return undefined. [#8928](https://github.com/CesiumGS/cesium/pull/8928)
- Fixed JSDoc and TypeScript type definitions for `Viewer` options parameters.
- Fixed a memory leak where some 3D Tiles requests were being unintentionally retained after the requests were cancelled. [#8843](https://github.com/CesiumGS/cesium/pull/8843)
- Fixed a bug with handling of PixelFormat's flipY. [#8893](https://github.com/CesiumGS/cesium/pull/8893)

### 1.70.0 - 2020-06-01

##### Major Announcements :loudspeaker:

- All Cesium ion users now have access to Cesium OSM Buildings - a 3D buildings layer covering the entire world built with OpenStreetMap building data, available as 3D Tiles. Read more about it [on our blog](https://cesium.com/blog/2020/06/01/cesium-osm-buildings/).
  - [Explore it on Sandcastle](https://sandcastle.cesium.com/index.html?src=Cesium%20OSM%20Buildings.html).
  - Add it to your CesiumJS app: `viewer.scene.primitives.add(Cesium.createOsmBuildings())`.
  - Contains per-feature data like building name, address, and much more. [Read more about the available properties](https://cesium.com/content/cesium-osm-buildings/).
- CesiumJS now ships with official TypeScript type definitions! [#8878](https://github.com/CesiumGS/cesium/pull/8878)
  - If you import CesiumJS as a module, the new definitions will automatically be used by TypeScript and related tooling.
  - If you import individual CesiumJS source files directly, you'll need to add `"types": ["cesium"]` in your tsconfig.json in order for the definitions to be used.
  - If you’re using your own custom definitions and you’re not yet ready to switch, you can delete `Source/Cesium.d.ts` after install.
  - See our [blog post](https://cesium.com/blog/2020/06/01/cesiumjs-tsd/) for more information and a technical overview of how it all works.
- CesiumJS now supports underground rendering with globe translucency! [#8726](https://github.com/CesiumGS/cesium/pull/8726)
  - Added options for controlling globe translucency through the new [`GlobeTranslucency`](https://cesium.com/learn/cesiumjs/ref-doc/GlobeTranslucency.html) object including front face alpha, back face alpha, and a translucency rectangle.
  - Added `Globe.undergroundColor` and `Globe.undergroundColorAlphaByDistance` for controlling how the back side of the globe is rendered when the camera is underground or the globe is translucent. [#8867](https://github.com/CesiumGS/cesium/pull/8867)
  - Improved camera controls when the camera is underground. [#8811](https://github.com/CesiumGS/cesium/pull/8811)
  - Sandcastle examples: [Globe Translucency](https://sandcastle.cesium.com/?src=Globe%20Translucency.html), [Globe Interior](https://sandcastle.cesium.com/?src=Globe%20Interior.html), and [Underground Color](https://sandcastle.cesium.com/?src=Underground%20Color.html&label=All)

##### Additions :tada:

- Our API reference documentation has received dozens of fixes and improvements, largely due to the TypeScript effort.
- Added `Cesium3DTileset.extensions` to get the extensions property from the tileset JSON. [#8829](https://github.com/CesiumGS/cesium/pull/8829)
- Added `Camera.completeFlight`, which causes the current camera flight to immediately jump to the final destination and call its complete callback. [#8788](https://github.com/CesiumGS/cesium/pull/8788)
- Added `nightAlpha` and `dayAlpha` properties to `ImageryLayer` to control alpha separately for the night and day sides of the globe. [#8868](https://github.com/CesiumGS/cesium/pull/8868)
- Added `SkyAtmosphere.perFragmentAtmosphere` to switch between per-vertex and per-fragment atmosphere shading. [#8866](https://github.com/CesiumGS/cesium/pull/8866)
- Added a new sandcastle example to show how to add fog using a `PostProcessStage` [#8798](https://github.com/CesiumGS/cesium/pull/8798)
- Added `frustumSplits` option to `DebugCameraPrimitive`. [8849](https://github.com/CesiumGS/cesium/pull/8849)
- Supported `#rgba` and `#rrggbbaa` formats in `Color.fromCssColorString`. [8873](https://github.com/CesiumGS/cesium/pull/8873)

##### Fixes :wrench:

- Fixed a bug that could cause rendering of a glTF model to become corrupt when switching from a Uint16 to a Uint32 index buffer to accomodate new vertices added for edge outlining. [#8820](https://github.com/CesiumGS/cesium/pull/8820)
- Fixed a bug where a removed billboard could prevent changing of the `TerrainProvider`. [#8766](https://github.com/CesiumGS/cesium/pull/8766)
- Fixed an issue with 3D Tiles point cloud styling where `${feature.propertyName}` and `${feature["propertyName"]}` syntax would cause a crash. Also fixed an issue where property names with non-alphanumeric characters would crash. [#8785](https://github.com/CesiumGS/cesium/pull/8785)
- Fixed a bug where `DebugCameraPrimitive` was ignoring the near and far planes of the `Camera`. [#8848](https://github.com/CesiumGS/cesium/issues/8848)
- Fixed sky atmosphere artifacts below the horizon. [#8866](https://github.com/CesiumGS/cesium/pull/8866)
- Fixed ground primitives in orthographic mode. [#5110](https://github.com/CesiumGS/cesium/issues/5110)
- Fixed the depth plane in orthographic mode. This improves the quality of polylines and other primitives that are rendered near the horizon. [8858](https://github.com/CesiumGS/cesium/pull/8858)

### 1.69.0 - 2020-05-01

##### Breaking Changes :mega:

- The property `Scene.sunColor` has been removed. Use `scene.light.color` and `scene.light.intensity` instead. [#8774](https://github.com/CesiumGS/cesium/pull/8774)
- Removed `isArray`. Use the native `Array.isArray` function instead. [#8779](https://github.com/CesiumGS/cesium/pull/8779)

##### Additions :tada:

- Added `RequestScheduler` to the public API; this allows users to have more control over the requests made by CesiumJS. [#8384](https://github.com/CesiumGS/cesium/issues/8384)
- Added support for high-quality edges on solid geometry in glTF models. [#8776](https://github.com/CesiumGS/cesium/pull/8776)
- Added `Scene.cameraUnderground` for checking whether the camera is underneath the globe. [#8765](https://github.com/CesiumGS/cesium/pull/8765)

##### Fixes :wrench:

- Fixed several problems with polylines when the logarithmic depth buffer is enabled, which is the default on most systems. [#8706](https://github.com/CesiumGS/cesium/pull/8706)
- Fixed a bug with very long view ranges requiring multiple frustums even with the logarithmic depth buffer enabled. Previously, such scenes could resolve depth incorrectly. [#8727](https://github.com/CesiumGS/cesium/pull/8727)
- Fixed an issue with glTF skinning support where an optional property `skeleton` was considered required by Cesium. [#8175](https://github.com/CesiumGS/cesium/issues/8175)
- Fixed an issue with clamping of non-looped glTF animations. Subscribers to animation `update` events should expect one additional event firing as an animation stops. [#7387](https://github.com/CesiumGS/cesium/issues/7387)
- Geometry instance floats now work for high precision floats on newer iOS devices. [#8805](https://github.com/CesiumGS/cesium/pull/8805)
- Fixed a bug where the elevation contour material's alpha was not being applied. [#8749](https://github.com/CesiumGS/cesium/pull/8749)
- Fix potential memory leak when destroying `CesiumWidget` instances. [#8591](https://github.com/CesiumGS/cesium/pull/8591)
- Fixed displaying the Cesium ion icon when running in an Android, iOS or UWP WebView. [#8758](https://github.com/CesiumGS/cesium/pull/8758)

### 1.68.0 - 2020-04-01

##### Additions :tada:

- Added basic underground rendering support. When the camera is underground the globe will be rendered as a solid surface and underground entities will not be culled. [#8572](https://github.com/AnalyticalGraphicsInc/cesium/pull/8572)
- The `CesiumUnminified` build now includes sourcemaps. [#8572](https://github.com/CesiumGS/cesium/pull/8659)
- Added glTF `STEP` animation interpolation. [#8786](https://github.com/CesiumGS/cesium/pull/8786)
- Added the ability to edit CesiumJS shaders on-the-fly using the [SpectorJS](https://spector.babylonjs.com/) Shader Editor. [#8608](https://github.com/CesiumGS/cesium/pull/8608)

##### Fixes :wrench:

- Cesium can now be used in Node.JS 12 and later, with or without `--experimental-modules`. It can still be used in earlier versions as well. [#8572](https://github.com/CesiumGS/cesium/pull/8659)
- Interacting with the Cesium canvas will now blur the previously focused element. This prevents unintended modification of input elements when interacting with the globe. [#8662](https://github.com/CesiumGS/cesium/pull/8662)
- `TileMapServiceImageryProvider` will now force `minimumLevel` to 0 if the `tilemapresource.xml` metadata request fails and the `rectangle` is too large for the given detail level [#8448](https://github.com/AnalyticalGraphicsInc/cesium/pull/8448)
- Fixed ground atmosphere rendering when using a smaller ellipsoid. [#8683](https://github.com/CesiumGS/cesium/issues/8683)
- Fixed globe incorrectly occluding objects when using a smaller ellipsoid. [#7124](https://github.com/CesiumGS/cesium/issues/7124)
- Fixed a regression introduced in 1.67 which caused overlapping colored ground geometry to have visual artifacts. [#8694](https://github.com/CesiumGS/cesium/pull/8694)
- Fixed a clipping problem when viewing a polyline up close with the logarithmic depth buffer enabled, which is the default on most systems. [#8703](https://github.com/CesiumGS/cesium/pull/8703)

### 1.67.0 - 2020-03-02

##### Breaking Changes :mega:

- `Cesium3DTileset.skipLevelOfDetail` is now `false` by default. [#8631](https://github.com/CesiumGS/cesium/pull/8631)
- glTF models are now rendered using the `LEQUALS` depth test function instead of `LESS`. This means that when geometry overlaps, the _later_ geometry will be visible above the earlier, where previously the opposite was true. We believe this is a more sensible default, and makes it easier to render e.g. outlined buildings with glTF. [#8646](https://github.com/CesiumGS/cesium/pull/8646)

##### Additions :tada:

- Massively improved performance of clamped Entity ground geometry with dynamic colors. [#8630](https://github.com/CesiumGS/cesium/pull/8630)
- Added `Entity.tileset` for loading a 3D Tiles tileset via the Entity API using the new `Cesium3DTilesetGraphics` class. [#8580](https://github.com/CesiumGS/cesium/pull/8580)
- Added `tileset.uri`, `tileset.show`, and `tileset.maximumScreenSpaceError` properties to CZML processing for loading 3D Tiles. [#8580](https://github.com/CesiumGS/cesium/pull/8580)
- Added `Color.lerp` for linearly interpolating between two RGB colors. [#8607](https://github.com/CesiumGS/cesium/pull/8607)
- `CesiumTerrainProvider` now supports terrain tiles using a `WebMercatorTilingScheme` by specifying `"projection": "EPSG:3857"` in `layer.json`. It also now supports numbering tiles from the North instead of the South by specifying `"scheme": "slippyMap"` in `layer.json`. [#8563](https://github.com/CesiumGS/cesium/pull/8563)
- Added basic support for `isNaN`, `isFinite`, `null`, and `undefined` in the 3D Tiles styling GLSL backend for point clouds. [#8621](https://github.com/CesiumGS/cesium/pull/8621)
- Added `sizeInMeters` to `ParticleSystem`. [#7746](https://github.com/CesiumGS/cesium/pull/7746)

##### Fixes :wrench:

- Fixed a bug that caused large, nearby geometry to be clipped when using a logarithmic depth buffer, which is the default on most systems. [#8600](https://github.com/CesiumGS/cesium/pull/8600)
- Fixed a bug where tiles would not load if the camera was tracking a moving tileset. [#8598](https://github.com/CesiumGS/cesium/pull/8598)
- Fixed a bug where applying a new 3D Tiles style during a flight would not update all existing tiles. [#8622](https://github.com/CesiumGS/cesium/pull/8622)
- Fixed a bug where Cartesian vectors could not be packed to typed arrays [#8568](https://github.com/CesiumGS/cesium/pull/8568)
- Updated knockout from 3.5.0 to 3.5.1. [#8424](https://github.com/CesiumGS/cesium/pull/8424)
- Cesium's local development server now works in Node 12 & 13 [#8648](https://github.com/CesiumGS/cesium/pull/8648)

##### Deprecated :hourglass_flowing_sand:

- The `isArray` function has been deprecated and will be removed in Cesium 1.69. Use the native `Array.isArray` function instead. [#8526](https://github.com/CesiumGS/cesium/pull/8526)

### 1.66.0 - 2020-02-03

##### Deprecated :hourglass_flowing_sand:

- The property `Scene.sunColor` has been deprecated and will be removed in Cesium 1.69. Use `scene.light.color` and `scene.light.intensity` instead. [#8493](https://github.com/CesiumGS/cesium/pull/8493)

##### Additions :tada:

- `useBrowserRecommendedResolution` flag in `Viewer` and `CesiumWidget` now defaults to `true`. This ensures Cesium rendering is fast and smooth by default across all devices. Set it to `false` to always render at native device resolution instead at the cost of performance on under-powered devices. [#8548](https://github.com/CesiumGS/cesium/pull/8548)
- Cesium now creates a WebGL context with a `powerPreference` value of `high-performance`. Some browsers use this setting to enable a second, more powerful, GPU. You can set it back to `default`, or opt-in to `low-power` mode, by passing the context option when creating a `Viewer` or `CesiumWidget` instance:

```js
var viewer = new Viewer("cesiumContainer", {
  contextOptions: {
    webgl: {
      powerPreference: "default",
    },
  },
});
```

- Added more customization to Cesium's lighting system. [#8493](https://github.com/CesiumGS/cesium/pull/8493)
  - Added `Light`, `DirectionalLight`, and `SunLight` classes for creating custom light sources.
  - Added `Scene.light` for setting the scene's light source, which defaults to a `SunLight`.
  - Added `Globe.dynamicAtmosphereLighting` for enabling lighting effects on atmosphere and fog, such as day/night transitions. It is true by default but may be set to false if the atmosphere should stay unchanged regardless of the scene's light direction.
  - Added `Globe.dynamicAtmosphereLightingFromSun` for using the sun direction instead of the scene's light direction when `Globe.dynamicAtmosphereLighting` is enabled. See the moonlight example in the [Lighting Sandcastle example](https://cesiumjs.org/Cesium/Apps/Sandcastle/?src=Lighting.html).
  - Primitives and the globe are now shaded with the scene light's color.
- Updated SampleData models to glTF 2.0. [#7802](https://github.com/CesiumGS/cesium/issues/7802)
- Added `Globe.showSkirts` to support the ability to hide terrain skirts when viewing terrain from below the surface. [#8489](https://github.com/CesiumGS/cesium/pull/8489)
- Added `minificationFilter` and `magnificationFilter` options to `Material` to control texture filtering. [#8473](https://github.com/CesiumGS/cesium/pull/8473)
- Updated [earcut](https://github.com/mapbox/earcut) to 2.2.1. [#8528](https://github.com/CesiumGS/cesium/pull/8528)
- Added a font cache to improve label performance. [#8537](https://github.com/CesiumGS/cesium/pull/8537)

##### Fixes :wrench:

- Fixed a bug where the camera could go underground during mouse navigation. [#8504](https://github.com/CesiumGS/cesium/pull/8504)
- Fixed a bug where rapidly updating a `PolylineCollection` could result in an `instanceIndex` is out of range error. [#8546](https://github.com/CesiumGS/cesium/pull/8546)
- Fixed issue where `RequestScheduler` double-counted image requests made via `createImageBitmap`. [#8162](https://github.com/CesiumGS/cesium/issues/8162)
- Reduced Cesium bundle size by avoiding unnecessarily importing `Cesium3DTileset` in `Picking.js`. [#8532](https://github.com/CesiumGS/cesium/pull/8532)
- Fixed a bug where files with backslashes were not loaded in KMZ files. [#8533](https://github.com/CesiumGS/cesium/pull/8533)
- Fixed WebGL warning message about `EXT_float_blend` being implicitly enabled. [#8534](https://github.com/CesiumGS/cesium/pull/8534)
- Fixed a bug where toggling point cloud classification visibility would result in a grey screen on Linux / Nvidia. [#8538](https://github.com/CesiumGS/cesium/pull/8538)
- Fixed a bug where a point in a `PointPrimitiveCollection` was rendered in the middle of the screen instead of being clipped. [#8542](https://github.com/CesiumGS/cesium/pull/8542)
- Fixed a crash when deleting and re-creating polylines from CZML. `ReferenceProperty` now returns undefined when the target entity or property does not exist, instead of throwing. [#8544](https://github.com/CesiumGS/cesium/pull/8544)
- Fixed terrain tile picking in the Cesium Inspector. [#8567](https://github.com/CesiumGS/cesium/pull/8567)
- Fixed a crash that could occur when an entity was deleted while the corresponding `Primitive` was being created asynchronously. [#8569](https://github.com/CesiumGS/cesium/pull/8569)
- Fixed a crash when calling `camera.lookAt` with the origin (0, 0, 0) as the target. This could happen when looking at a tileset with the origin as its center. [#8571](https://github.com/CesiumGS/cesium/pull/8571)
- Fixed a bug where `camera.viewBoundingSphere` was modifying the `offset` parameter. [#8438](https://github.com/CesiumGS/cesium/pull/8438)
- Fixed a crash when creating a plane with both position and normal on the Z-axis. [#8576](https://github.com/CesiumGS/cesium/pull/8576)
- Fixed `BoundingSphere.projectTo2D` when the bounding sphere’s center is at the origin. [#8482](https://github.com/CesiumGS/cesium/pull/8482)

### 1.65.0 - 2020-01-06

##### Breaking Changes :mega:

- `OrthographicFrustum.getPixelDimensions`, `OrthographicOffCenterFrustum.getPixelDimensions`, `PerspectiveFrustum.getPixelDimensions`, and `PerspectiveOffCenterFrustum.getPixelDimensions` now require a `pixelRatio` argument before the `result` argument. The previous function definition has been deprecated since 1.63. [#8320](https://github.com/CesiumGS/cesium/pull/8320)
- The function `Matrix4.getRotation` has been renamed to `Matrix4.getMatrix3`. `Matrix4.getRotation` has been deprecated since 1.62. [#8183](https://github.com/CesiumGS/cesium/pull/8183)
- `createTileMapServiceImageryProvider` and `createOpenStreetMapImageryProvider` have been removed. Instead, pass the same options to `new TileMapServiceImageryProvider` and `new OpenStreetMapImageryProvider` respectively. The old functions have been deprecated since 1.62. [#8174](https://github.com/CesiumGS/cesium/pull/8174)

##### Additions :tada:

- Added `Globe.backFaceCulling` to support viewing terrain from below the surface. [#8470](https://github.com/CesiumGS/cesium/pull/8470)

##### Fixes :wrench:

- Fixed Geocoder auto-complete suggestions when hosted inside Web Components. [#8425](https://github.com/CesiumGS/cesium/pull/8425)
- Fixed terrain tile culling problems when under ellipsoid. [#8397](https://github.com/CesiumGS/cesium/pull/8397)
- Fixed primitive culling when below the ellipsoid but above terrain. [#8398](https://github.com/CesiumGS/cesium/pull/8398)
- Improved the translucency calculation for the Water material type. [#8455](https://github.com/CesiumGS/cesium/pull/8455)
- Fixed bounding volume calculation for `GroundPrimitive`. [#4883](https://github.com/CesiumGS/cesium/issues/4483)
- Fixed `OrientedBoundingBox.fromRectangle` for rectangles with width greater than 180 degrees. [#8475](https://github.com/CesiumGS/cesium/pull/8475)
- Fixed globe picking so that it returns the closest intersecting triangle instead of the first intersecting triangle. [#8390](https://github.com/CesiumGS/cesium/pull/8390)
- Fixed horizon culling issues with large root tiles. [#8487](https://github.com/CesiumGS/cesium/pull/8487)
- Fixed a lighting bug affecting Macs with Intel integrated graphics where glTF 2.0 PBR models with double sided materials would have flipped normals. [#8494](https://github.com/CesiumGS/cesium/pull/8494)

### 1.64.0 - 2019-12-02

##### Fixes :wrench:

- Fixed an issue in image based lighting where an invalid environment map would silently fail. [#8303](https://github.com/CesiumGS/cesium/pull/8303)
- Various small internal improvements

### 1.63.1 - 2019-11-06

##### Fixes :wrench:

- Fixed regression in 1.63 where ground atmosphere and labels rendered incorrectly on displays with `window.devicePixelRatio` greater than 1.0. [#8351](https://github.com/CesiumGS/cesium/pull/8351)
- Fixed regression in 1.63 where some primitives would show through the globe when log depth is disabled. [#8368](https://github.com/CesiumGS/cesium/pull/8368)

### 1.63 - 2019-11-01

##### Major Announcements :loudspeaker:

- Cesium has migrated to ES6 modules. This may or may not be a breaking change for your application depending on how you use Cesium. See our [blog post](https://cesium.com/blog/2019/10/31/cesiumjs-es6/) for the full details.
- We’ve consolidated all of our website content from cesiumjs.org and cesium.com into one home on cesium.com. Here’s where you can now find:
  - [Sandcastle](https://sandcastle.cesium.com) - `https://sandcastle.cesium.com`
  - [API Docs](https://cesium.com/learn/cesiumjs/ref-doc/) - `https://cesium.com/learn/cesiumjs/ref-doc/`
  - [Downloads](https://cesium.com/downloads/) - `https://cesium.com/downloads/`
  - Hosted releases can be found at `https://cesium.com/downloads/cesiumjs/releases/<CesiumJS Version Number>/Build/Cesium/Cesium.js`
  - See our [blog post](https://cesium.com/blog/2019/10/15/cesiumjs-migration/) for more information.

##### Additions :tada:

- Decreased Web Workers bundle size by a factor of 10, from 8384KB (2624KB gzipped) to 863KB (225KB gzipped). This makes Cesium load faster, especially on low-end devices and slower network connections.
- Added full UTF-8 support to labels, greatly improving support for non-latin alphabets and emoji. [#7280](https://github.com/CesiumGS/cesium/pull/7280)
- Added `"type": "module"` to package.json to take advantage of native ES6 module support in newer versions of Node.js. This also enables module-based front-end development for tooling that relies on Node.js module resolution.
- The combined `Build/Cesium/Cesium.js` and `Build/CesiumUnminified/Cesium.js` have been upgraded from IIFE to UMD modules that support IIFE, AMD, and commonjs.
- Added `pixelRatio` parameter to `OrthographicFrustum.getPixelDimensions`, `OrthographicOffCenterFrustum.getPixelDimensions`, `PerspectiveFrustum.getPixelDimensions`, and `PerspectiveOffCenterFrustum.getPixelDimensions`. Pass in `scene.pixelRatio` for dimensions in CSS pixel units or `1.0` for dimensions in native device pixel units. [#8237](https://github.com/CesiumGS/cesium/pull/8237)

##### Fixes :wrench:

- Fixed css pixel usage for polylines, point clouds, models, primitives, and post-processing. [#8113](https://github.com/CesiumGS/cesium/issues/8113)
- Fixed a bug where `scene.sampleHeightMostDetailed` and `scene.clampToHeightMostDetailed` would not resolve in request render mode. [#8281](https://github.com/CesiumGS/cesium/issues/8281)
- Fixed seam artifacts when log depth is disabled, `scene.globe.depthTestAgainstTerrain` is false, and primitives are under the globe. [#8205](https://github.com/CesiumGS/cesium/pull/8205)
- Fix dynamic ellipsoids using `innerRadii`, `minimumClock`, `maximumClock`, `minimumCone` or `maximumCone`. [#8277](https://github.com/CesiumGS/cesium/pull/8277)
- Fixed rendering billboard collections containing more than 65536 billboards. [#8325](https://github.com/CesiumGS/cesium/pull/8325)

##### Deprecated :hourglass_flowing_sand:

- `OrthographicFrustum.getPixelDimensions`, `OrthographicOffCenterFrustum.getPixelDimensions`, `PerspectiveFrustum.getPixelDimensions`, and `PerspectiveOffCenterFrustum.getPixelDimensions` now take a `pixelRatio` argument before the `result` argument. The previous function definition will no longer work in 1.65. [#8237](https://github.com/CesiumGS/cesium/pull/8237)

### 1.62 - 2019-10-01

##### Deprecated :hourglass_flowing_sand:

- `createTileMapServiceImageryProvider` and `createOpenStreetMapImageryProvider` have been deprecated and will be removed in Cesium 1.65. Instead, pass the same options to `new TileMapServiceImageryProvider` and `new OpenStreetMapImageryProvider` respectively.
- The function `Matrix4.getRotation` has been deprecated and renamed to `Matrix4.getMatrix3`. `Matrix4.getRotation` will be removed in version 1.65.

##### Additions :tada:

- Added ability to create partial ellipsoids using both the Entity API and CZML. New ellipsoid geometry properties: `innerRadii`, `minimumClock`, `maximumClock`, `minimumCone`, and `maximumCone`. This affects both `EllipsoidGeometry` and `EllipsoidOutlineGeometry`. See the updated [Sandcastle example](https://cesiumjs.org/Cesium/Apps/Sandcastle/?src=Partial%20Ellipsoids.html&label=Geometries). [#5995](https://github.com/CesiumGS/cesium/pull/5995)
- Added `useBrowserRecommendedResolution` flag to `Viewer` and `CesiumWidget`. When true, Cesium renders at CSS pixel resolution instead of native device resolution. This replaces the workaround in the 1.61 change list. [8215](https://github.com/CesiumGS/cesium/issues/8215)
- Added `TileMapResourceImageryProvider` and `OpenStreetMapImageryProvider` classes to improve API consistency: [#4812](https://github.com/CesiumGS/cesium/issues/4812)
- Added `credit` parameter to `CzmlDataSource`, `GeoJsonDataSource`, `KmlDataSource` and `Model`. [#8173](https://github.com/CesiumGS/cesium/pull/8173)
- Added `Matrix3.getRotation` to get the rotational component of a matrix with scaling removed. [#8182](https://github.com/CesiumGS/cesium/pull/8182)

##### Fixes :wrench:

- Fixed labels not showing for individual entities in data sources when clustering is enabled. [#6087](https://github.com/CesiumGS/cesium/issues/6087)
- Fixed an issue where polygons, corridors, rectangles, and ellipses on terrain would not render on some mobile devices. [#6739](https://github.com/CesiumGS/cesium/issues/6739)
- Fixed a bug where GlobeSurfaceTile would not render the tile until all layers completed loading causing globe to appear to hang. [#7974](https://github.com/CesiumGS/cesium/issues/7974)
- Spread out KMl loading across multiple frames to prevent freezing. [#8195](https://github.com/CesiumGS/cesium/pull/8195)
- Fixed a bug where extruded polygons would sometimes be missing segments. [#8035](https://github.com/CesiumGS/cesium/pull/8035)
- Made pixel sizes consistent for polylines and point clouds when rendering at different pixel ratios. [#8113](https://github.com/CesiumGS/cesium/issues/8113)
- `Camera.flyTo` flies to the correct location in 2D when the destination crosses the international date line [#7909](https://github.com/CesiumGS/cesium/pull/7909)
- Fixed 3D tiles style coloring when multiple tilesets are in the scene [#8051](https://github.com/CesiumGS/cesium/pull/8051)
- 3D Tiles geometric error now correctly scales with transform. [#8182](https://github.com/CesiumGS/cesium/pull/8182)
- Fixed per-feature post processing from sometimes selecting the wrong feature. [#7929](https://github.com/CesiumGS/cesium/pull/7929)
- Fixed a bug where dynamic polylines did not use the given arcType. [#8191](https://github.com/CesiumGS/cesium/issues/8191)
- Fixed atmosphere brightness when High Dynamic Range is disabled. [#8149](https://github.com/CesiumGS/cesium/issues/8149)
- Fixed brightness levels for procedural Image Based Lighting. [#7803](https://github.com/CesiumGS/cesium/issues/7803)
- Fixed alpha equation for `BlendingState.ALPHA_BLEND` and `BlendingState.ADDITIVE_BLEND`. [#8202](https://github.com/CesiumGS/cesium/pull/8202)
- Improved display of tile coordinates for `TileCoordinatesImageryProvider` [#8131](https://github.com/CesiumGS/cesium/pull/8131)
- Reduced size of approximateTerrainHeights.json [#7959](https://github.com/CesiumGS/cesium/pull/7959)
- Fixed undefined `quadDetails` error from zooming into the map really close. [#8011](https://github.com/CesiumGS/cesium/pull/8011)
- Fixed a crash for 3D Tiles that have zero volume. [#7945](https://github.com/CesiumGS/cesium/pull/7945)
- Fixed relative-to-center check, `depthFailAppearance` resource freeing for `Primitive` [#8044](https://github.com/CesiumGS/cesium/pull/8044)

### 1.61 - 2019-09-03

##### Additions :tada:

- Added optional `index` parameter to `PrimitiveCollection.add`. [#8041](https://github.com/CesiumGS/cesium/pull/8041)
- Cesium now renders at native device resolution by default instead of CSS pixel resolution, to go back to the old behavior, set `viewer.resolutionScale = 1.0 / window.devicePixelRatio`. [#8082](https://github.com/CesiumGS/cesium/issues/8082)
- Added `getByName` method to `DataSourceCollection` allowing to retrieve `DataSource`s by their name property from the collection

##### Fixes :wrench:

- Disable FXAA by default. To re-enable, set `scene.postProcessStages.fxaa.enabled = true` [#7875](https://github.com/CesiumGS/cesium/issues/7875)
- Fixed a crash when a glTF model used `KHR_texture_transform` without a sampler defined. [#7916](https://github.com/CesiumGS/cesium/issues/7916)
- Fixed post-processing selection filtering to work for bloom. [#7984](https://github.com/CesiumGS/cesium/issues/7984)
- Disabled HDR by default to improve visual quality in most standard use cases. Set `viewer.scene.highDynamicRange = true` to re-enable. [#7966](https://github.com/CesiumGS/cesium/issues/7966)
- Fixed a bug that causes hidden point primitives to still appear on some operating systems. [#8043](https://github.com/CesiumGS/cesium/issues/8043)
- Fix negative altitude altitude handling in `GoogleEarthEnterpriseTerrainProvider`. [#8109](https://github.com/CesiumGS/cesium/pull/8109)
- Fixed issue where KTX or CRN files would not be properly identified. [#7979](https://github.com/CesiumGS/cesium/issues/7979)
- Fixed multiple globe materials making the globe darker. [#7726](https://github.com/CesiumGS/cesium/issues/7726)

### 1.60 - 2019-08-01

##### Additions :tada:

- Reworked label rendering to use signed distance fields (SDF) for crisper text. [#7730](https://github.com/CesiumGS/cesium/pull/7730)
- Added a [new Sandcastle example](https://cesiumjs.org/Cesium/Build/Apps/Sandcastle/?src=Labels%20SDF.html) to showcase the new SDF labels.
- Added support for polygon holes to CZML. [#7991](https://github.com/CesiumGS/cesium/pull/7991)
- Added `totalScale` property to `Label` which is the total scale of the label taking into account the label's scale and the relative size of the desired font compared to the generated glyph size.

##### Fixes :wrench:

- Fixed crash when using ArcGIS terrain with clipping planes. [#7998](https://github.com/CesiumGS/cesium/pull/7998)
- `PolygonGraphics.hierarchy` now converts constant array values to a `PolygonHierarchy` when set, so code that accesses the value of the property can rely on it always being a `PolygonHierarchy`.
- Fixed a bug with lengthwise texture coordinates in the first segment of ground polylines, as observed in some WebGL implementations such as Chrome on Linux. [#8017](https://github.com/CesiumGS/cesium/issues/8017)

### 1.59 - 2019-07-01

##### Additions :tada:

- Adds `ArcGISTiledElevationTerrainProvider` to support LERC encoded terrain from ArcGIS ImageServer. [#7940](https://github.com/CesiumGS/cesium/pull/7940)
- Added CZML support for `heightReference` to `box`, `cylinder`, and `ellipsoid`, and added CZML support for `classificationType` to `corridor`, `ellipse`, `polygon`, `polyline`, and `rectangle`. [#7899](https://github.com/CesiumGS/cesium/pull/7899)
- Adds `exportKML` function to export `Entity` instances with Point, Billboard, Model, Label, Polyline and Polygon graphics. [#7921](https://github.com/CesiumGS/cesium/pull/7921)
- Added support for new Mapbox Style API. [#7698](https://github.com/CesiumGS/cesium/pull/7698)
- Added support for the [AGI_articulations](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/AGI_articulations) vendor extension of glTF 2.0 to the Entity API and CZML. [#7907](https://github.com/CesiumGS/cesium/pull/7907)

##### Fixes :wrench:

- Fixed a bug that caused missing segments for ground polylines with coplanar points over large distances and problems with polylines containing duplicate points. [#7885](https://github.com/CesiumGS/cesium//pull/7885)
- Fixed a bug where billboards were not pickable when zoomed out completely in 2D View. [#7908](https://github.com/CesiumGS/cesium/pull/7908)
- Fixed a bug where image requests that returned HTTP code 204 would prevent any future request from succeeding on browsers that supported ImageBitmap. [#7914](https://github.com/CesiumGS/cesium/pull/7914/)
- Fixed polyline colors when `scene.highDynamicRange` is enabled. [#7924](https://github.com/CesiumGS/cesium/pull/7924)
- Fixed a bug in the inspector where the min/max height values of a picked tile were undefined. [#7904](https://github.com/CesiumGS/cesium/pull/7904)
- Fixed `Math.factorial` to return the correct values. (https://github.com/CesiumGS/cesium/pull/7969)
- Fixed a bug that caused 3D models to appear darker on Android devices. [#7944](https://github.com/CesiumGS/cesium/pull/7944)

### 1.58.1 - 2018-06-03

_This is an npm-only release to fix a publishing issue_.

### 1.58 - 2019-06-03

##### Additions :tada:

- Added support for new `BingMapsStyle` values `ROAD_ON_DEMAND` and `AERIAL_WITH_LABELS_ON_DEMAND`. The older versions of these, `ROAD` and `AERIAL_WITH_LABELS`, have been deprecated by Bing. [#7808](https://github.com/CesiumGS/cesium/pull/7808)
- Added syntax to delete data from existing properties via CZML. [#7818](https://github.com/CesiumGS/cesium/pull/7818)
- Added `checkerboard` material to CZML. [#7845](https://github.com/CesiumGS/cesium/pull/7845)
- `BingMapsImageryProvider` now uses `DiscardEmptyTileImagePolicy` by default to detect missing tiles as zero-length responses instead of inspecting pixel values. [#7810](https://github.com/CesiumGS/cesium/pull/7810)
- Added support for the [AGI_articulations](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/AGI_articulations) vendor extension of glTF 2.0 to the Model primitive graphics API. [#7835](https://github.com/CesiumGS/cesium/pull/7835)
- Reduce the number of Bing transactions and ion Bing sessions used when destroying and recreating the same imagery layer to 1. [#7848](https://github.com/CesiumGS/cesium/pull/7848)

##### Fixes :wrench:

- Fixed an edge case where Cesium would provide ion access token credentials to non-ion servers if the actual asset entrypoint was being hosted by ion. [#7839](https://github.com/CesiumGS/cesium/pull/7839)
- Fixed a bug that caused Cesium to request non-existent tiles for terrain tilesets lacking tile availability, i.e. a `layer.json` file.
- Fixed memory leak when removing entities that had a `HeightReference` of `CLAMP_TO_GROUND` or `RELATIVE_TO_GROUND`. This includes when removing a `DataSource`.
- Fixed 3D Tiles credits not being shown in the data attribution box. [#7877](https://github.com/CesiumGS/cesium/pull/7877)

### 1.57 - 2019-05-01

##### Additions :tada:

- Improved 3D Tiles streaming performance, resulting in ~67% camera tour load time reduction, ~44% camera tour load count reduction. And for general camera movement, ~20% load time reduction with ~27% tile load count reduction. Tile load priority changed to focus on loading tiles in the center of the screen first. Added the following tileset optimizations, which unless stated otherwise are enabled by default. [#7774](https://github.com/CesiumGS/cesium/pull/7774)
  - Added `Cesium3DTileset.cullRequestsWhileMoving` option to ignore requests for tiles that will likely be out-of-view due to the camera's movement when they come back from the server.
  - Added `Cesium3DTileset.cullRequestsWhileMovingMultiplier` option to act as a multiplier when used in culling requests while moving. Larger is more aggressive culling, smaller less aggressive culling.
  - Added `Cesium3DTileset.preloadFlightDestinations` option to preload tiles at the camera's flight destination while the camera is in flight.
  - Added `Cesium3DTileset.preferLeaves` option to prefer loading of leaves. Good for additive refinement point clouds. Set to `false` by default.
  - Added `Cesium3DTileset.progressiveResolutionHeightFraction` option to load tiles at a smaller resolution first. This can help get a quick layer of tiles down while full resolution tiles continue to load.
  - Added `Cesium3DTileset.foveatedScreenSpaceError` option to prioritize loading tiles in the center of the screen.
  - Added `Cesium3DTileset.foveatedConeSize` option to control the cone size that determines which tiles are deferred for loading. Tiles outside the cone are potentially deferred.
  - Added `Cesium3DTileset.foveatedMinimumScreenSpaceErrorRelaxation` option to control the starting screen space error relaxation for tiles outside the foveated cone.
  - Added `Cesium3DTileset.foveatedInterpolationCallback` option to control how screen space error threshold is interpolated for tiles outside the foveated cone.
  - Added `Cesium3DTileset.foveatedTimeDelay` option to control how long in seconds to wait after the camera stops moving before deferred tiles start loading in.
- Added new parameter to `PolylineGlowMaterial` called `taperPower`, that works similar to the existing `glowPower` parameter, to taper the back of the line away. [#7626](https://github.com/CesiumGS/cesium/pull/7626)
- Added `Cesium3DTileset.preloadWhenHidden` tileset option to preload tiles when `tileset.show` is false. Loads tiles as if the tileset is visible but does not render them. [#7774](https://github.com/CesiumGS/cesium/pull/7774)
- Added support for the `KHR_texture_transform` glTF extension. [#7549](https://github.com/CesiumGS/cesium/pull/7549)
- Added functions to remove samples from `SampledProperty` and `SampledPositionProperty`. [#7723](https://github.com/CesiumGS/cesium/pull/7723)
- Added support for color-to-alpha with a threshold on imagery layers. [#7727](https://github.com/CesiumGS/cesium/pull/7727)
- Add CZML processing for `heightReference` and `extrudedHeightReference` for geoemtry types that support it.
- `CesiumMath.toSNorm` documentation changed to reflect the function's implementation. [#7774](https://github.com/CesiumGS/cesium/pull/7774)
- Added `CesiumMath.normalize` to convert a scalar value in an arbitrary range to a scalar in the range [0.0, 1.0]. [#7774](https://github.com/CesiumGS/cesium/pull/7774)

##### Fixes :wrench:

- Fixed an error when loading the same glTF model in two separate viewers. [#7688](https://github.com/CesiumGS/cesium/issues/7688)
- Fixed an error where `clampToHeightMostDetailed` or `sampleHeightMostDetailed` would crash if entities were created when the promise resolved. [#7690](https://github.com/CesiumGS/cesium/pull/7690)
- Fixed an issue with compositing merged entity availability. [#7717](https://github.com/CesiumGS/cesium/issues/7717)
- Fixed an error where many imagery layers within a single tile would cause parts of the tile to render as black on some platforms. [#7649](https://github.com/CesiumGS/cesium/issues/7649)
- Fixed a bug that could cause terrain with a single, global root tile (e.g. that uses `WebMercatorTilingScheme`) to be culled unexpectedly in some views. [#7702](https://github.com/CesiumGS/cesium/issues/7702)
- Fixed a problem where instanced 3D models were incorrectly lit when using physically based materials. [#7775](https://github.com/CesiumGS/cesium/issues/7775)
- Fixed a bug where glTF models with certain blend modes were rendered incorrectly in browsers that support ImageBitmap. [#7795](https://github.com/CesiumGS/cesium/issues/7795)

### 1.56.1 - 2019-04-02

##### Additions :tada:

- `Resource.fetchImage` now takes a `preferImageBitmap` option to use `createImageBitmap` when supported to move image decode off the main thread. This option defaults to `false`.

##### Breaking Changes :mega:

- The following breaking changes are relative to 1.56. The `Resource.fetchImage` behavior is now identical to 1.55 and earlier.
  - Changed `Resource.fetchImage` back to return an `Image` by default, instead of an `ImageBitmap` when supported. Note that an `ImageBitmap` cannot be flipped during texture upload. Instead, set `flipY : true` during fetch to flip it.
  - Changed the default `flipY` option in `Resource.fetchImage` to false. This only has an effect when ImageBitmap is used.

### 1.56 - 2019-04-01

##### Breaking Changes :mega:

- `Resource.fetchImage` now returns an `ImageBitmap` instead of `Image` when supported. This allows for decoding images while fetching using `createImageBitmap` to greatly speed up texture upload and decrease frame drops when loading models with large textures. [#7579](https://github.com/CesiumGS/cesium/pull/7579)
- `Cesium3DTileStyle.style` now has an empty `Object` as its default value, instead of `undefined`. [#7567](https://github.com/CesiumGS/cesium/issues/7567)
- `Scene.clampToHeight` now takes an optional `width` argument before the `result` argument. [#7693](https://github.com/CesiumGS/cesium/pull/7693)
- In the `Resource` class, `addQueryParameters` and `addTemplateValues` have been removed. Please use `setQueryParameters` and `setTemplateValues` instead. [#7695](https://github.com/CesiumGS/cesium/issues/7695)

##### Deprecated :hourglass_flowing_sand:

- `Resource.fetchImage` now takes an options object. Use `resource.fetchImage({ preferBlob: true })` instead of `resource.fetchImage(true)`. The previous function definition will no longer work in 1.57. [#7579](https://github.com/CesiumGS/cesium/pull/7579)

##### Additions :tada:

- Added support for touch and hold gesture. The touch and hold delay can be customized by updating `ScreenSpaceEventHandler.touchHoldDelayMilliseconds`. [#7286](https://github.com/CesiumGS/cesium/pull/7286)
- `Resource.fetchImage` now has a `flipY` option to vertically flip an image during fetch & decode. It is only valid when `ImageBitmapOptions` is supported by the browser. [#7579](https://github.com/CesiumGS/cesium/pull/7579)
- Added `backFaceCulling` and `normalShading` options to `PointCloudShading`. Both options are only applicable for point clouds containing normals. [#7399](https://github.com/CesiumGS/cesium/pull/7399)
- `Cesium3DTileStyle.style` reacts to updates and represents the current state of the style. [#7567](https://github.com/CesiumGS/cesium/issues/7567)

##### Fixes :wrench:

- Fixed the value for `BlendFunction.ONE_MINUS_CONSTANT_COLOR`. [#7624](https://github.com/CesiumGS/cesium/pull/7624)
- Fixed `HeadingPitchRoll.pitch` being `NaN` when using `.fromQuaternion` due to a rounding error for pitches close to +/- 90°. [#7654](https://github.com/CesiumGS/cesium/pull/7654)
- Fixed a type of crash caused by the camera being rotated through terrain. [#6783](https://github.com/CesiumGS/cesium/issues/6783)
- Fixed an error in `Resource` when used with template replacements using numeric keys. [#7668](https://github.com/CesiumGS/cesium/pull/7668)
- Fixed an error in `Cesium3DTilePointFeature` where `anchorLineColor` used the same color instance instead of cloning the color [#7686](https://github.com/CesiumGS/cesium/pull/7686)

### 1.55 - 2019-03-01

##### Breaking Changes :mega:

- `czm_materialInput.slope` is now an angle in radians between 0 and pi/2 (flat to vertical), rather than a projected length 1 to 0 (flat to vertical).

##### Additions :tada:

- Updated terrain and imagery rendering, resulting in terrain/imagery loading ~33% faster and using ~33% less data [#7061](https://github.com/CesiumGS/cesium/pull/7061)
- `czm_materialInput.aspect` was added as an angle in radians between 0 and 2pi (east, north, west to south).
- Added CZML `arcType` support for `polyline` and `polygon`, which supersedes `followSurface`. `followSurface` is still supported for compatibility with existing documents. [#7582](https://github.com/CesiumGS/cesium/pull/7582)

##### Fixes :wrench:

- Fixed an issue where models would cause a crash on load if some primitives were Draco encoded and others were not. [#7383](https://github.com/CesiumGS/cesium/issues/7383)
- Fixed an issue where RTL labels not reversing correctly non alphabetic characters [#7501](https://github.com/CesiumGS/cesium/pull/7501)
- Fixed Node.js support for the `Resource` class and any functionality using it internally.
- Fixed an issue where some ground polygons crossing the Prime Meridian would have incorrect bounding rectangles. [#7533](https://github.com/CesiumGS/cesium/pull/7533)
- Fixed an issue where polygons on terrain using rhumb lines where being rendered incorrectly. [#7538](https://github.com/CesiumGS/cesium/pulls/7538)
- Fixed an issue with `EllipsoidRhumbLines.findIntersectionWithLongitude` when longitude was IDL. [#7551](https://github.com/CesiumGS/cesium/issues/7551)
- Fixed model silhouette colors when rendering with high dynamic range. [#7563](https://github.com/CesiumGS/cesium/pull/7563)
- Fixed an issue with ground polylines on globes that use ellipsoids other than WGS84. [#7552](https://github.com/CesiumGS/cesium/issues/7552)
- Fixed an issue where Draco compressed models with RGB per-vertex color would not load in Cesium. [#7576](https://github.com/CesiumGS/cesium/issues/7576)
- Fixed an issue where the outline geometry for extruded Polygons didn't calculate the correct indices. [#7599](https://github.com/CesiumGS/cesium/issues/7599)

### 1.54 - 2019-02-01

##### Highlights :sparkler:

- Added support for polylines and textured entities on 3D Tiles. [#7437](https://github.com/CesiumGS/cesium/pull/7437) and [#7434](https://github.com/CesiumGS/cesium/pull/7434)
- Added support for loading models and 3D tilesets with WebP images using the [`EXT_texture_webp`](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Vendor/EXT_texture_webp/README.md) glTF extension. [#7486](https://github.com/CesiumGS/cesium/pull/7486)
- Added support for rhumb lines to polygon and polyline geometries. [#7492](https://github.com/CesiumGS/cesium/pull/7492)

##### Breaking Changes :mega:

- Billboards with `HeightReference.CLAMP_TO_GROUND` are now clamped to both terrain and 3D Tiles. [#7434](https://github.com/CesiumGS/cesium/pull/7434)
- The default `classificationType` for `GroundPrimitive`, `CorridorGraphics`, `EllipseGraphics`, `PolygonGraphics` and `RectangleGraphics` is now `ClassificationType.BOTH`. [#7434](https://github.com/CesiumGS/cesium/pull/7434)
- The properties `ModelAnimation.speedup` and `ModelAnimationCollection.speedup` have been removed. Use `ModelAnimation.multiplier` and `ModelAnimationCollection.multiplier` respectively instead. [#7494](https://github.com/CesiumGS/cesium/issues/7394)

##### Deprecated :hourglass_flowing_sand:

- `Scene.clampToHeight` now takes an optional `width` argument before the `result` argument. The previous function definition will no longer work in 1.56. [#7287](https://github.com/CesiumGS/cesium/pull/7287)
- `PolylineGeometry.followSurface` has been superceded by `PolylineGeometry.arcType`. The previous definition will no longer work in 1.57. Replace `followSurface: false` with `arcType: Cesium.ArcType.NONE` and `followSurface: true` with `arcType: Cesium.ArcType.GEODESIC`. [#7492](https://github.com/CesiumGS/cesium/pull/7492)
- `SimplePolylineGeometry.followSurface` has been superceded by `SimplePolylineGeometry.arcType`. The previous definition will no longer work in 1.57. Replace `followSurface: false` with `arcType: Cesium.ArcType.NONE` and `followSurface: true` with `arcType: Cesium.ArcType.GEODESIC`. [#7492](https://github.com/CesiumGS/cesium/pull/7492)

##### Additions :tada:

- Added support for textured ground entities (entities with unspecified `height`) and `GroundPrimitives` on 3D Tiles. [#7434](https://github.com/CesiumGS/cesium/pull/7434)
- Added support for polylines on 3D Tiles. [#7437](https://github.com/CesiumGS/cesium/pull/7437)
- Added `classificationType` property to `PolylineGraphics` and `GroundPolylinePrimitive` which specifies whether a polyline clamped to ground should be clamped to terrain, 3D Tiles, or both. [#7437](https://github.com/CesiumGS/cesium/pull/7437)
- Added the ability to specify the width of the intersection volume for `Scene.sampleHeight`, `Scene.clampToHeight`, `Scene.sampleHeightMostDetailed`, and `Scene.clampToHeightMostDetailed`. [#7287](https://github.com/CesiumGS/cesium/pull/7287)
- Added a [new Sandcastle example](https://cesiumjs.org/Cesium/Build/Apps/Sandcastle/?src=Time%20Dynamic%20Wheels.html) on using `nodeTransformations` to rotate a model's wheels based on its velocity. [#7361](https://github.com/CesiumGS/cesium/pull/7361)
- Added a [new Sandcastle example](https://cesiumjs.org/Cesium/Build/Apps/Sandcastle/?src=Polylines%20on%203D%20Tiles.html) for drawing polylines on 3D Tiles [#7522](https://github.com/CesiumGS/cesium/pull/7522)
- Added `EllipsoidRhumbLine` class as a rhumb line counterpart to `EllipsoidGeodesic`. [#7484](https://github.com/CesiumGS/cesium/pull/7484)
- Added rhumb line support to `PolygonGeometry`, `PolygonOutlineGeometry`, `PolylineGeometry`, `GroundPolylineGeometry`, and `SimplePolylineGeometry`. [#7492](https://github.com/CesiumGS/cesium/pull/7492)
- When using Cesium in Node.js, we now use the combined and minified version for improved performance unless `NODE_ENV` is specifically set to `development`.
- Improved the performance of `QuantizedMeshTerrainData.interpolateHeight`. [#7508](https://github.com/CesiumGS/cesium/pull/7508)
- Added support for glTF models with WebP textures using the `EXT_texture_webp` extension. [#7486](https://github.com/CesiumGS/cesium/pull/7486)

##### Fixes :wrench:

- Fixed 3D Tiles performance regression. [#7482](https://github.com/CesiumGS/cesium/pull/7482)
- Fixed an issue where classification primitives with the `CESIUM_3D_TILE` classification type would render on terrain. [#7422](https://github.com/CesiumGS/cesium/pull/7422)
- Fixed an issue where 3D Tiles would show through the globe. [#7422](https://github.com/CesiumGS/cesium/pull/7422)
- Fixed crash when entity geometry show value is an interval that only covered part of the entity availability range [#7458](https://github.com/CesiumGS/cesium/pull/7458)
- Fix rectangle positions at the north and south poles. [#7451](https://github.com/CesiumGS/cesium/pull/7451)
- Fixed image size issue when using multiple particle systems. [#7412](https://github.com/CesiumGS/cesium/pull/7412)
- Fixed Sandcastle's "Open in New Window" button not displaying imagery due to blob URI limitations. [#7250](https://github.com/CesiumGS/cesium/pull/7250)
- Fixed an issue where setting `scene.globe.cartographicLimitRectangle` to `undefined` would cause a crash. [#7477](https://github.com/CesiumGS/cesium/issues/7477)
- Fixed `PrimitiveCollection.removeAll` to no longer `contain` removed primitives. [#7491](https://github.com/CesiumGS/cesium/pull/7491)
- Fixed `GeoJsonDataSource` to use polygons and polylines that use rhumb lines. [#7492](https://github.com/CesiumGS/cesium/pull/7492)
- Fixed an issue where some ground polygons would be cut off along circles of latitude. [#7507](https://github.com/CesiumGS/cesium/issues/7507)
- Fixed an issue that would cause IE 11 to crash when enabling image-based lighting. [#7485](https://github.com/CesiumGS/cesium/issues/7485)

### 1.53 - 2019-01-02

##### Additions :tada:

- Added image-based lighting for PBR models and 3D Tiles. [#7172](https://github.com/CesiumGS/cesium/pull/7172)
  - `Scene.specularEnvironmentMaps` is a url to a KTX file that contains the specular environment map and convoluted mipmaps for image-based lighting of all PBR models in the scene.
  - `Scene.sphericalHarmonicCoefficients` is an array of 9 `Cartesian3` spherical harmonics coefficients for the diffuse irradiance of all PBR models in the scene.
  - The `specularEnvironmentMaps` and `sphericalHarmonicCoefficients` properties of `Model` and `Cesium3DTileset` can be used to override the values from the scene for specific models and tilesets.
  - The `luminanceAtZenith` property of `Model` and `Cesium3DTileset` adjusts the luminance of the procedural image-based lighting.
- Double click away from an entity to un-track it [#7285](https://github.com/CesiumGS/cesium/pull/7285)

##### Fixes :wrench:

- Fixed 3D Tiles visibility checking when running multiple passes within the same frame. [#7289](https://github.com/CesiumGS/cesium/pull/7289)
- Fixed contrast on imagery layers. [#7382](https://github.com/CesiumGS/cesium/issues/7382)
- Fixed rendering transparent background color when `highDynamicRange` is enabled. [#7427](https://github.com/CesiumGS/cesium/issues/7427)
- Fixed translucent geometry when `highDynamicRange` is toggled. [#7451](https://github.com/CesiumGS/cesium/pull/7451)

### 1.52 - 2018-12-03

##### Breaking Changes :mega:

- `TerrainProviders` that implement `availability` must now also implement the `loadTileDataAvailability` method.

##### Deprecated :hourglass_flowing_sand:

- The property `ModelAnimation.speedup` has been deprecated and renamed to `ModelAnimation.multiplier`. `speedup` will be removed in version 1.54. [#7393](https://github.com/CesiumGS/cesium/pull/7393)

##### Additions :tada:

- Added functions to get the most detailed height of 3D Tiles on-screen or off-screen. [#7115](https://github.com/CesiumGS/cesium/pull/7115)
  - Added `Scene.sampleHeightMostDetailed`, an asynchronous version of `Scene.sampleHeight` that uses the maximum level of detail for 3D Tiles.
  - Added `Scene.clampToHeightMostDetailed`, an asynchronous version of `Scene.clampToHeight` that uses the maximum level of detail for 3D Tiles.
- Added support for high dynamic range rendering. It is enabled by default when supported, but can be disabled with `Scene.highDynamicRange`. [#7017](https://github.com/CesiumGS/cesium/pull/7017)
- Added `Scene.invertClassificationSupported` for checking if invert classification is supported.
- Added `computeLineSegmentLineSegmentIntersection` to `Intersections2D`. [#7228](https://github.com/CesiumGS/Cesium/pull/7228)
- Added ability to load availability progressively from a quantized mesh extension instead of upfront. This will speed up load time and reduce memory usage. [#7196](https://github.com/CesiumGS/cesium/pull/7196)
- Added the ability to apply styles to 3D Tilesets that don't contain features. [#7255](https://github.com/CesiumGS/Cesium/pull/7255)

##### Fixes :wrench:

- Fixed issue causing polyline to look wavy depending on the position of the camera [#7209](https://github.com/CesiumGS/cesium/pull/7209)
- Fixed translucency issues for dynamic geometry entities. [#7364](https://github.com/CesiumGS/cesium/issues/7364)

### 1.51 - 2018-11-01

##### Additions :tada:

- Added WMS-T (time) support in WebMapServiceImageryProvider [#2581](https://github.com/CesiumGS/cesium/issues/2581)
- Added `cutoutRectangle` to `ImageryLayer`, which allows cutting out rectangular areas in imagery layers to reveal underlying imagery. [#7056](https://github.com/CesiumGS/cesium/pull/7056)
- Added `atmosphereHueShift`, `atmosphereSaturationShift`, and `atmosphereBrightnessShift` properties to `Globe` which shift the color of the ground atmosphere to match the hue, saturation, and brightness shifts of the sky atmosphere. [#4195](https://github.com/CesiumGS/cesium/issues/4195)
- Shrink minified and gzipped Cesium.js by 27 KB (~3.7%) by delay loading seldom-used third-party dependencies. [#7140](https://github.com/CesiumGS/cesium/pull/7140)
- Added `lightColor` property to `Cesium3DTileset`, `Model`, and `ModelGraphics` to change the intensity of the light used when shading model. [#7025](https://github.com/CesiumGS/cesium/pull/7025)
- Added `imageBasedLightingFactor` property to `Cesium3DTileset`, `Model`, and `ModelGraphics` to scale the diffuse and specular image-based lighting contributions to the final color. [#7025](https://github.com/CesiumGS/cesium/pull/7025)
- Added per-feature selection to the 3D Tiles BIM Sandcastle example. [#7181](https://github.com/CesiumGS/cesium/pull/7181)
- Added `Transforms.fixedFrameToHeadingPitchRoll`, a helper function for extracting a `HeadingPitchRoll` from a fixed frame transform. [#7164](https://github.com/CesiumGS/cesium/pull/7164)
- Added `Ray.clone`. [#7174](https://github.com/CesiumGS/cesium/pull/7174)

##### Fixes :wrench:

- Fixed issue removing geometry entities with different materials. [#7163](https://github.com/CesiumGS/cesium/pull/7163)
- Fixed texture coordinate calculation for polygon entities with `perPositionHeight`. [#7188](https://github.com/CesiumGS/cesium/pull/7188)
- Fixed crash when updating polyline attributes twice in one frame. [#7155](https://github.com/CesiumGS/cesium/pull/7155)
- Fixed entity visibility issue related to setting an entity show property and altering or adding entity geometry. [#7156](https://github.com/CesiumGS/cesium/pull/7156)
- Fixed an issue where dynamic Entities on terrain would cause a crash in platforms that do not support depth textures such as Internet Explorer. [#7103](https://github.com/CesiumGS/cesium/issues/7103)
- Fixed an issue that would cause a crash when removing a post process stage. [#7210](https://github.com/CesiumGS/cesium/issues/7210)
- Fixed an issue where `pickPosition` would return incorrect results when called after `sampleHeight` or `clampToHeight`. [#7113](https://github.com/CesiumGS/cesium/pull/7113)
- Fixed an issue where `sampleHeight` and `clampToHeight` would crash if picking a primitive that doesn't write depth. [#7120](https://github.com/CesiumGS/cesium/issues/7120)
- Fixed a crash when using `BingMapsGeocoderService`. [#7143](https://github.com/CesiumGS/cesium/issues/7143)
- Fixed accuracy of rotation matrix generated by `VelocityOrientationProperty`. [#6641](https://github.com/CesiumGS/cesium/pull/6641)
- Fixed clipping plane crash when adding a plane to an empty collection. [#7168](https://github.com/CesiumGS/cesium/pull/7168)
- Fixed clipping planes on tilesets not taking into account the tileset model matrix. [#7182](https://github.com/CesiumGS/cesium/pull/7182)
- Fixed incorrect rendering of models using the `KHR_materials_common` lights extension. [#7206](https://github.com/CesiumGS/cesium/pull/7206)

### 1.50 - 2018-10-01

##### Breaking Changes :mega:

- Clipping planes on tilesets now use the root tile's transform, or the root tile's bounding sphere if a transform is not defined. [#7034](https://github.com/CesiumGS/cesium/pull/7034)
  - This is to make clipping planes' coordinates always relative to the object they're attached to. So if you were positioning the clipping planes as in the example below, this is no longer necessary:
  ```javascript
  clippingPlanes.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    tileset.boundingSphere.center
  );
  ```
  - This also fixes several issues with clipping planes not using the correct transform for tilesets with children.

##### Additions :tada:

- Initial support for clamping to 3D Tiles. [#6934](https://github.com/CesiumGS/cesium/pull/6934)
  - Added `Scene.sampleHeight` to get the height of geometry in the scene. May be used to clamp objects to the globe, 3D Tiles, or primitives in the scene.
  - Added `Scene.clampToHeight` to clamp a cartesian position to the scene geometry.
  - Requires depth texture support (`WEBGL_depth_texture` or `WEBKIT_WEBGL_depth_texture`). Added `Scene.sampleHeightSupported` and `Scene.clampToHeightSupported` functions for checking if height sampling is supported.
- Added `Cesium3DTileset.initialTilesLoaded` to indicate that all tiles in the initial view are loaded. [#6934](https://github.com/CesiumGS/cesium/pull/6934)
- Added support for glTF extension [KHR_materials_pbrSpecularGlossiness](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness) [#7006](https://github.com/CesiumGS/cesium/pull/7006).
- Added support for glTF extension [KHR_materials_unlit](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit) [#6977](https://github.com/CesiumGS/cesium/pull/6977).
- Added support for glTF extensions [KHR_techniques_webgl](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_techniques_webgl) and [KHR_blend](https://github.com/KhronosGroup/glTF/pull/1302). [#6805](https://github.com/CesiumGS/cesium/pull/6805)
- Update [gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline/) to 2.0. [#6805](https://github.com/CesiumGS/cesium/pull/6805)
- Added `cartographicLimitRectangle` to `Globe`. Use this to limit terrain and imagery to a specific `Rectangle` area. [#6987](https://github.com/CesiumGS/cesium/pull/6987)
- Added `OpenCageGeocoderService`, which provides geocoding via [OpenCage](https://opencagedata.com/). [#7015](https://github.com/CesiumGS/cesium/pull/7015)
- Added ground atmosphere lighting in 3D. This can be toggled with `Globe.showGroundAtmosphere`. [6877](https://github.com/CesiumGS/cesium/pull/6877)
  - Added `Globe.nightFadeOutDistance` and `Globe.nightFadeInDistance` to configure when ground atmosphere night lighting fades in and out. [6877](https://github.com/CesiumGS/cesium/pull/6877)
- Added `onStop` event to `Clock` that fires each time stopTime is reached. [#7066](https://github.com/CesiumGS/cesium/pull/7066)

##### Fixes :wrench:

- Fixed picking for overlapping translucent primitives. [#7039](https://github.com/CesiumGS/cesium/pull/7039)
- Fixed an issue in the 3D Tiles traversal where tilesets would render with mixed level of detail if an external tileset was visible but its root tile was not. [#7099](https://github.com/CesiumGS/cesium/pull/7099)
- Fixed an issue in the 3D Tiles traversal where external tilesets would not always traverse to their root tile. [#7035](https://github.com/CesiumGS/cesium/pull/7035)
- Fixed an issue in the 3D Tiles traversal where empty tiles would be selected instead of their nearest loaded ancestors. [#7011](https://github.com/CesiumGS/cesium/pull/7011)
- Fixed an issue where scaling near zero with an model animation could cause rendering to stop. [#6954](https://github.com/CesiumGS/cesium/pull/6954)
- Fixed bug where credits weren't displaying correctly if more than one viewer was initialized [#6965](expect(https://github.com/CesiumGS/cesium/issues/6965)
- Fixed entity show issues. [#7048](https://github.com/CesiumGS/cesium/issues/7048)
- Fixed a bug where polylines on terrain covering very large portions of the globe would cull incorrectly in 3d-only scenes. [#7043](https://github.com/CesiumGS/cesium/issues/7043)
- Fixed bug causing crash on entity geometry material change. [#7047](https://github.com/CesiumGS/cesium/pull/7047)
- Fixed MIME type behavior for `Resource` requests in recent versions of Edge [#7085](https://github.com/CesiumGS/cesium/issues/7085).

### 1.49 - 2018-09-04

##### Breaking Changes :mega:

- Removed `ClippingPlaneCollection.clone`. [#6872](https://github.com/CesiumGS/cesium/pull/6872)
- Changed `Globe.pick` to return a position in ECEF coordinates regardless of the current scene mode. This will only effect you if you were working around a bug to make `Globe.pick` work in 2D and Columbus View. Use `Globe.pickWorldCoordinates` to get the position in world coordinates that correlate to the current scene mode. [#6859](https://github.com/CesiumGS/cesium/pull/6859)
- Removed the unused `frameState` parameter in `evaluate` and `evaluateColor` functions in `Expression`, `StyleExpression`, `ConditionsExpression` and all other places that call the functions. [#6890](https://github.com/CesiumGS/cesium/pull/6890)
- Removed `PostProcessStageLibrary.createLensFlarStage`. Use `PostProcessStageLibrary.createLensFlareStage` instead. [#6972](https://github.com/CesiumGS/cesium/pull/6972)
- Removed `Scene.fxaa`. Use `Scene.postProcessStages.fxaa.enabled` instead. [#6980](https://github.com/CesiumGS/cesium/pull/6980)

##### Additions :tada:

- Added `heightReference` to `BoxGraphics`, `CylinderGraphics` and `EllipsoidGraphics`, which can be used to clamp these entity types to terrain. [#6932](https://github.com/CesiumGS/cesium/pull/6932)
- Added `GeocoderViewModel.destinationFound` for specifying a function that is called upon a successful geocode. The default behavior is to fly to the destination found by the geocoder. [#6915](https://github.com/CesiumGS/cesium/pull/6915)
- Added `ClippingPlaneCollection.planeAdded` and `ClippingPlaneCollection.planeRemoved` events. `planeAdded` is raised when a new plane is added to the collection and `planeRemoved` is raised when a plane is removed. [#6875](https://github.com/CesiumGS/cesium/pull/6875)
- Added `Matrix4.setScale` for setting the scale on an affine transformation matrix [#6888](https://github.com/CesiumGS/cesium/pull/6888)
- Added optional `width` and `height` to `Scene.drillPick` for specifying a search area. [#6922](https://github.com/CesiumGS/cesium/pull/6922)
- Added `Cesium3DTileset.root` for getting the root tile of a tileset. [#6944](https://github.com/CesiumGS/cesium/pull/6944)
- Added `Cesium3DTileset.extras` and `Cesium3DTile.extras` for getting application specific metadata from 3D Tiles. [#6974](https://github.com/CesiumGS/cesium/pull/6974)

##### Fixes :wrench:

- Several performance improvements and fixes to the 3D Tiles traversal code. [#6390](https://github.com/CesiumGS/cesium/pull/6390)
  - Improved load performance when `skipLevelOfDetail` is false.
  - Fixed a bug that caused some skipped tiles to load when `skipLevelOfDetail` is true.
  - Fixed pick statistics in the 3D Tiles Inspector.
  - Fixed drawing of debug labels for external tilesets.
  - Fixed drawing of debug outlines for empty tiles.
- The Geocoder widget now takes terrain altitude into account when calculating its final destination. [#6876](https://github.com/CesiumGS/cesium/pull/6876)
- The Viewer widget now takes terrain altitude into account when zooming or flying to imagery layers. [#6895](https://github.com/CesiumGS/cesium/pull/6895)
- Fixed Firefox camera control issues with mouse and touch events. [#6372](https://github.com/CesiumGS/cesium/issues/6372)
- Fixed `getPickRay` in 2D. [#2480](https://github.com/CesiumGS/cesium/issues/2480)
- Fixed `Globe.pick` for 2D and Columbus View. [#6859](https://github.com/CesiumGS/cesium/pull/6859)
- Fixed imagery layer feature picking in 2D and Columbus view. [#6859](https://github.com/CesiumGS/cesium/pull/6859)
- Fixed intermittent ground clamping issues for all entity types that use a height reference. [#6930](https://github.com/CesiumGS/cesium/pull/6930)
- Fixed bug that caused a new `ClippingPlaneCollection` to be created every frame when used with a model entity. [#6872](https://github.com/CesiumGS/cesium/pull/6872)
- Improved `Plane` entities so they are better aligned with the globe surface. [#6887](https://github.com/CesiumGS/cesium/pull/6887)
- Fixed crash when rendering translucent objects when all shadow maps in the scene set `fromLightSource` to false. [#6883](https://github.com/CesiumGS/cesium/pull/6883)
- Fixed night shading in 2D and Columbus view. [#4122](https://github.com/CesiumGS/cesium/issues/4122)
- Fixed model loading failure when a glTF 2.0 primitive does not have a material. [6906](https://github.com/CesiumGS/cesium/pull/6906)
- Fixed a crash when setting show to `false` on a polyline clamped to the ground. [#6912](https://github.com/CesiumGS/cesium/issues/6912)
- Fixed a bug where `Cesium3DTileset` wasn't using the correct `tilesetVersion`. [#6933](https://github.com/CesiumGS/cesium/pull/6933)
- Fixed crash that happened when calling `scene.pick` after setting a new terrain provider. [#6918](https://github.com/CesiumGS/cesium/pull/6918)
- Fixed an issue that caused the browser to hang when using `drillPick` on a polyline clamped to the ground. [6907](https://github.com/CesiumGS/cesium/issues/6907)
- Fixed an issue where color wasn't updated properly for polylines clamped to ground. [#6927](https://github.com/CesiumGS/cesium/pull/6927)
- Fixed an excessive memory use bug that occurred when a data URI was used to specify a glTF model. [#6928](https://github.com/CesiumGS/cesium/issues/6928)
- Fixed an issue where switching from 2D to 3D could cause a crash. [#6929](https://github.com/CesiumGS/cesium/issues/6929)
- Fixed an issue where point primitives behind the camera would appear in view. [#6904](https://github.com/CesiumGS/cesium/issues/6904)
- The `createGroundPolylineGeometry` web worker no longer depends on `GroundPolylinePrimitive`, making the worker smaller and potentially avoiding a hanging build in some webpack configurations. [#6946](https://github.com/CesiumGS/cesium/pull/6946)
- Fixed an issue that cause terrain entities (entities with unspecified `height`) and `GroundPrimitives` to fail when crossing the international date line. [#6951](https://github.com/CesiumGS/cesium/issues/6951)
- Fixed normal calculation for `CylinderGeometry` when the top radius is not equal to the bottom radius [#6863](https://github.com/CesiumGS/cesium/pull/6863)

### 1.48 - 2018-08-01

##### Additions :tada:

- Added support for loading Draco compressed Point Cloud tiles for 2-3x better compression. [#6559](https://github.com/CesiumGS/cesium/pull/6559)
- Added `TimeDynamicPointCloud` for playback of time-dynamic point cloud data, where each frame is a 3D Tiles Point Cloud tile. [#6721](https://github.com/CesiumGS/cesium/pull/6721)
- Added `CoplanarPolygonGeometry` and `CoplanarPolygonGeometryOutline` for drawing polygons composed of coplanar positions that are not necessarily on the ellipsoid surface. [#6769](https://github.com/CesiumGS/cesium/pull/6769)
- Improved support for polygon entities using `perPositionHeight`, including supporting vertical polygons. This also improves KML compatibility. [#6791](https://github.com/CesiumGS/cesium/pull/6791)
- Added `Cartesian3.midpoint` to compute the midpoint between two `Cartesian3` positions [#6836](https://github.com/CesiumGS/cesium/pull/6836)
- Added `equalsEpsilon` methods to `OrthographicFrustum`, `PerspectiveFrustum`, `OrthographicOffCenterFrustum` and `PerspectiveOffCenterFrustum`.

##### Deprecated :hourglass_flowing_sand:

- Support for 3D Tiles `content.url` is deprecated to reflect updates to the [3D Tiles spec](https://github.com/CesiumGS/3d-tiles/pull/301). Use `content.uri instead`. Support for `content.url` will remain for backwards compatibility. [#6744](https://github.com/CesiumGS/cesium/pull/6744)
- Support for the 3D Tiles pre-version 1.0 Batch Table Hierarchy is deprecated to reflect updates to the [3D Tiles spec](https://github.com/CesiumGS/3d-tiles/pull/301). Use the [`3DTILES_batch_table_hierarchy`](https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy) extension instead. Support for the deprecated batch table hierarchy will remain for backwards compatibility. [#6780](https://github.com/CesiumGS/cesium/pull/6780)
- `PostProcessStageLibrary.createLensFlarStage` is deprecated due to misspelling and will be removed in Cesium 1.49. Use `PostProcessStageLibrary.createLensFlareStage` instead.

##### Fixes :wrench:

- Fixed a bug where 3D Tilesets using the `region` bounding volume don't get transformed when the tileset's `modelMatrix` changes. [#6755](https://github.com/CesiumGS/cesium/pull/6755)
- Fixed a bug that caused eye dome lighting for point clouds to fail in Safari on macOS and Edge on Windows by removing the dependency on floating point color textures. [#6792](https://github.com/CesiumGS/cesium/issues/6792)
- Fixed a bug that caused polylines on terrain to render incorrectly in 2D and Columbus View with a `WebMercatorProjection`. [#6809](https://github.com/CesiumGS/cesium/issues/6809)
- Fixed bug causing billboards and labels to appear the wrong size when switching scene modes [#6745](https://github.com/CesiumGS/cesium/issues/6745)
- Fixed `PolygonGeometry` when using `VertexFormat.POSITION_ONLY`, `perPositionHeight` and `extrudedHeight` [#6790](expect(https://github.com/CesiumGS/cesium/pull/6790)
- Fixed an issue where tiles were missing in VR mode. [#6612](https://github.com/CesiumGS/cesium/issues/6612)
- Fixed issues related to updating entity show and geometry color [#6835](https://github.com/CesiumGS/cesium/pull/6835)
- Fixed `PolygonGeometry` and `EllipseGeometry` tangent and bitangent attributes when a texture rotation is used [#6788](https://github.com/CesiumGS/cesium/pull/6788)
- Fixed bug where entities with a height reference weren't being updated correctly when the terrain provider was changed. [#6820](https://github.com/CesiumGS/cesium/pull/6820)
- Fixed an issue where glTF 2.0 models sometimes wouldn't be centered in the view after putting the camera on them. [#6784](https://github.com/CesiumGS/cesium/issues/6784)
- Fixed the geocoder when `Viewer` is passed the option `geocoder: true` [#6833](https://github.com/CesiumGS/cesium/pull/6833)
- Improved performance for billboards and labels clamped to terrain [#6781](https://github.com/CesiumGS/cesium/pull/6781) [#6844](https://github.com/CesiumGS/cesium/pull/6844)
- Fixed a bug that caused billboard positions to be set incorrectly when using a `CallbackProperty`. [#6815](https://github.com/CesiumGS/cesium/pull/6815)
- Improved support for generating a TypeScript typings file using `tsd-jsdoc` [#6767](https://github.com/CesiumGS/cesium/pull/6767)
- Updated viewBoundingSphere to use correct zoomOptions [#6848](https://github.com/CesiumGS/cesium/issues/6848)
- Fixed a bug that caused the scene to continuously render after resizing the viewer when `requestRenderMode` was enabled. [#6812](https://github.com/CesiumGS/cesium/issues/6812)

### 1.47 - 2018-07-02

##### Highlights :sparkler:

- Added support for polylines on terrain [#6689](https://github.com/CesiumGS/cesium/pull/6689) [#6615](https://github.com/CesiumGS/cesium/pull/6615)
- Added `heightReference` and `extrudedHeightReference` properties to `CorridorGraphics`, `EllipseGraphics`, `PolygonGraphics` and `RectangleGraphics`. [#6717](https://github.com/CesiumGS/cesium/pull/6717)
- `PostProcessStage` has a `selected` property which is an array of primitives used for selectively applying a post-process stage. [#6476](https://github.com/CesiumGS/cesium/pull/6476)

##### Breaking Changes :mega:

- glTF 2.0 models corrected to face +Z forwards per specification. Internally Cesium uses +X as forward, so a new +Z to +X rotation was added for 2.0 models only. To fix models that are oriented incorrectly after this change:
  - If the model faces +X forwards update the glTF to face +Z forwards. This can be done by loading the glTF in a model editor and applying a 90 degree clockwise rotation about the up-axis. Alternatively, add a new root node to the glTF node hierarchy whose `matrix` is `[0,0,1,0,0,1,0,0,-1,0,0,0,0,0,0,1]`.
  - Apply a -90 degree rotation to the model's heading. This can be done by setting the model's `orientation` using the Entity API or from within CZML. See [#6738](https://github.com/CesiumGS/cesium/pull/6738) for more details.
- Dropped support for directory URLs when loading tilesets to match the updated [3D Tiles spec](https://github.com/CesiumGS/3d-tiles/issues/272). [#6502](https://github.com/CesiumGS/cesium/issues/6502)
- KML and GeoJSON now use `PolylineGraphics` instead of `CorridorGraphics` for polylines on terrain. [#6706](https://github.com/CesiumGS/cesium/pull/6706)

##### Additions :tada:

- Added support for polylines on terrain [#6689](https://github.com/CesiumGS/cesium/pull/6689) [#6615](https://github.com/CesiumGS/cesium/pull/6615)
  - Use the `clampToGround` option for `PolylineGraphics` (polyline entities).
  - Requires depth texture support (`WEBGL_depth_texture` or `WEBKIT_WEBGL_depth_texture`), otherwise `clampToGround` will be ignored. Use `Entity.supportsPolylinesOnTerrain` to check for support.
  - Added `GroundPolylinePrimitive` and `GroundPolylineGeometry`.
- `PostProcessStage` has a `selected` property which is an array of primitives used for selectively applying a post-process stage. [#6476](https://github.com/CesiumGS/cesium/pull/6476)
  - The `PostProcessStageLibrary.createBlackAndWhiteStage` and `PostProcessStageLibrary.createSilhouetteStage` have per-feature support.
- Added CZML support for `zIndex` with `corridor`, `ellipse`, `polygon`, `polyline` and `rectangle`. [#6708](https://github.com/CesiumGS/cesium/pull/6708)
- Added CZML `clampToGround` option for `polyline`. [#6706](https://github.com/CesiumGS/cesium/pull/6706)
- Added support for `RTC_CENTER` property in batched 3D model tilesets to conform to the updated [3D Tiles spec](https://github.com/CesiumGS/3d-tiles/issues/263). [#6488](https://github.com/CesiumGS/cesium/issues/6488)
- Added `heightReference` and `extrudedHeightReference` properties to `CorridorGraphics`, `EllipseGraphics`, `PolygonGraphics` and `RectangleGraphics`. [#6717](https://github.com/CesiumGS/cesium/pull/6717)
  - This can be used in conjunction with the `height` and/or `extrudedHeight` properties to clamp the geometry to terrain or set the height relative to terrain.
  - Note, this will not make the geometry conform to terrain. Extruded geoemtry that is clamped to the ground will have a flat top will sinks into the terrain at the base.

##### Fixes :wrench:

- Fixed a bug that caused Cesium to be unable to load local resources in Electron. [#6726](https://github.com/CesiumGS/cesium/pull/6726)
- Fixed a bug causing crashes with custom vertex attributes on `Geometry` crossing the IDL. Attributes will be barycentrically interpolated. [#6644](https://github.com/CesiumGS/cesium/pull/6644)
- Fixed a bug causing Point Cloud tiles with unsigned int batch-ids to not load. [#6666](https://github.com/CesiumGS/cesium/pull/6666)
- Fixed a bug with Draco encoded i3dm tiles, and loading two Draco models with the same url. [#6668](https://github.com/CesiumGS/cesium/issues/6668)
- Fixed a bug caused by creating a polygon with positions at the same longitude/latitude position but different heights [#6731](https://github.com/CesiumGS/cesium/pull/6731)
- Fixed terrain clipping when the camera was close to flat terrain and was using logarithmic depth. [#6701](https://github.com/CesiumGS/cesium/pull/6701)
- Fixed KML bug that constantly requested the same image if it failed to load. [#6710](https://github.com/CesiumGS/cesium/pull/6710)
- Improved billboard and label rendering so they no longer sink into terrain when clamped to ground. [#6621](https://github.com/CesiumGS/cesium/pull/6621)
- Fixed an issue where KMLs containing a `colorMode` of `random` could return the exact same color on successive calls to `Color.fromRandom()`.
- `Iso8601.MAXIMUM_VALUE` now formats to a string which can be parsed by `fromIso8601`.
- Fixed material support when using an image that is already loaded [#6729](https://github.com/CesiumGS/cesium/pull/6729)

### 1.46.1 - 2018-06-01

- This is an npm only release to fix the improperly published 1.46.0. There were no code changes.

### 1.46 - 2018-06-01

##### Highlights :sparkler:

- Added support for materials on terrain entities (entities with unspecified `height`) and `GroundPrimitives`. [#6393](https://github.com/CesiumGS/cesium/pull/6393)
- Added a post-processing framework. [#5615](https://github.com/CesiumGS/cesium/pull/5615)
- Added `zIndex` for ground geometry, including corridor, ellipse, polygon and rectangle entities. [#6362](https://github.com/CesiumGS/cesium/pull/6362)

##### Breaking Changes :mega:

- `ParticleSystem` no longer uses `forces`. [#6510](https://github.com/CesiumGS/cesium/pull/6510)
- `Particle` no longer uses `size`, `rate`, `lifeTime`, `life`, `minimumLife`, `maximumLife`, `minimumWidth`, `minimumHeight`, `maximumWidth`, and `maximumHeight`. [#6510](https://github.com/CesiumGS/cesium/pull/6510)
- Removed `Scene.copyGlobeDepth`. Globe depth will now be copied by default when supported. [#6393](https://github.com/CesiumGS/cesium/pull/6393)
- The default `classificationType` for `GroundPrimitive`, `CorridorGraphics`, `EllipseGraphics`, `PolygonGraphics` and `RectangleGraphics` is now `ClassificationType.TERRAIN`. If you wish the geometry to color both terrain and 3D tiles, pass in the option `classificationType: Cesium.ClassificationType.BOTH`.
- Removed support for the `options` argument for `Credit` [#6373](https://github.com/CesiumGS/cesium/issues/6373). Pass in an html string instead.
- glTF 2.0 models corrected to face +Z forwards per specification. Internally Cesium uses +X as forward, so a new +Z to +X rotation was added for 2.0 models only. [#6632](https://github.com/CesiumGS/cesium/pull/6632)

##### Deprecated :hourglass_flowing_sand:

- The `Scene.fxaa` property has been deprecated and will be removed in Cesium 1.47. Use `Scene.postProcessStages.fxaa.enabled`.

##### Additions :tada:

- Added support for materials on terrain entities (entities with unspecified `height`) and `GroundPrimitives`. [#6393](https://github.com/CesiumGS/cesium/pull/6393)
  - Only available for `ClassificationType.TERRAIN` at this time. Adding a material to a terrain `Entity` will cause it to behave as if it is `ClassificationType.TERRAIN`.
  - Requires depth texture support (`WEBGL_depth_texture` or `WEBKIT_WEBGL_depth_texture`), so materials on terrain entities and `GroundPrimitives` are not supported in Internet Explorer.
  - Best suited for notational patterns and not intended for precisely mapping textures to terrain - for that use case, use `SingleTileImageryProvider`.
- Added `GroundPrimitive.supportsMaterials` and `Entity.supportsMaterialsforEntitiesOnTerrain`, both of which can be used to check if materials on terrain entities and `GroundPrimitives` is supported. [#6393](https://github.com/CesiumGS/cesium/pull/6393)
- Added a post-processing framework. [#5615](https://github.com/CesiumGS/cesium/pull/5615)
  - Added `Scene.postProcessStages` which is a collection of post-process stages to be run in order.
    - Has a built-in `ambientOcclusion` property which will apply screen space ambient occlusion to the scene and run before all stages.
    - Has a built-in `bloom` property which applies a bloom filter to the scene before all other stages but after the ambient occlusion stage.
    - Has a built-in `fxaa` property which applies Fast Approximate Anti-aliasing (FXAA) to the scene after all other stages.
  - Added `PostProcessStageLibrary` which contains several built-in stages that can be added to the collection.
  - Added `PostProcessStageComposite` for multi-stage post-processes like depth of field.
  - Added a new Sandcastle label `Post Processing` to showcase the different built-in post-process stages.
- Added `zIndex` for ground geometry, including corridor, ellipse, polygon and rectangle entities. [#6362](https://github.com/CesiumGS/cesium/pull/6362)
- Added `Rectangle.equalsEpsilon` for comparing the equality of two rectangles [#6533](https://github.com/CesiumGS/cesium/pull/6533)

##### Fixes :wrench:

- Fixed a bug causing custom TilingScheme classes to not be able to use a GeographicProjection. [#6524](https://github.com/CesiumGS/cesium/pull/6524)
- Fixed incorrect 3D Tiles statistics when a tile fails during processing. [#6558](https://github.com/CesiumGS/cesium/pull/6558)
- Fixed race condition causing intermittent crash when changing geometry show value [#3061](https://github.com/CesiumGS/cesium/issues/3061)
- `ProviderViewModel`s with no category are displayed in an untitled group in `BaseLayerPicker` instead of being labeled as `'Other'` [#6574](https://github.com/CesiumGS/cesium/pull/6574)
- Fixed a bug causing intermittent crashes with clipping planes due to uninitialized textures. [#6576](https://github.com/CesiumGS/cesium/pull/6576)
- Added a workaround for clipping planes causing a picking shader compilation failure for gltf models and 3D Tilesets in Internet Explorer [#6575](https://github.com/CesiumGS/cesium/issues/6575)
- Allowed Bing Maps servers with a subpath (instead of being at the root) to work correctly. [#6597](https://github.com/CesiumGS/cesium/pull/6597)
- Added support for loading of Draco compressed glTF assets in IE11 [#6404](https://github.com/CesiumGS/cesium/issues/6404)
- Fixed polygon outline when using `perPositionHeight` and `extrudedHeight`. [#6595](https://github.com/CesiumGS/cesium/issues/6595)
- Fixed broken links in documentation of `createTileMapServiceImageryProvider`. [#5818](https://github.com/CesiumGS/cesium/issues/5818)
- Transitioning from 2 touches to 1 touch no longer triggers a new pan gesture. [#6479](https://github.com/CesiumGS/cesium/pull/6479)

### 1.45 - 2018-05-01

##### Major Announcements :loudspeaker:

- We've launched Cesium ion! Read all about it in our [blog post](https://cesium.com/blog/2018/05/01/get-your-cesium-ion-community-account/).
- Cesium now uses ion services by default for base imagery, terrain, and geocoding. A demo key is provided, but to use them in your own apps you must [sign up](https://cesium.com/ion/signup) for a free ion Commmunity account.

##### Breaking Changes :mega:

- `ClippingPlaneCollection` now uses `ClippingPlane` objects instead of `Plane` objects. [#6498](https://github.com/CesiumGS/cesium/pull/6498)
- Cesium no longer ships with a demo Bing Maps API key.
- `BingMapsImageryProvider` is no longer the default base imagery layer. (Bing imagery itself is still the default, however it is provided through Cesium ion)
- `BingMapsGeocoderService` is no longer the default geocoding service.
- If you wish to continue to use your own Bing API key for imagery and geocoding, you can go back to the old default behavior by constructing the Viewer as follows:
  ```javascript
  Cesium.BingMapsApi.defaultKey = "yourBingKey";
  var viewer = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: new Cesium.BingMapsImageryProvider({
      url: "https://dev.virtualearth.net",
    }),
    geocoder: [
      new Cesium.CartographicGeocoderService(),
      new Cesium.BingMapsGeocoderService(),
    ],
  });
  ```

##### Deprecated :hourglass_flowing_sand:

- `Particle.size`, `ParticleSystem.rate`, `ParticleSystem.lifeTime`, `ParticleSystem.life`, `ParticleSystem.minimumLife`, and `ParticleSystem.maximumLife` have been renamed to `Particle.imageSize`, `ParticleSystem.emissionRate`, `ParticleSystem.lifetime`, `ParticleSystem.particleLife`, `ParticleSystem.minimumParticleLife`, and `ParticleSystem.maximumParticleLife`. Use of the `size`, `rate`, `lifeTime`, `life`, `minimumLife`, and `maximumLife` parameters is deprecated and will be removed in Cesium 1.46.
- `ParticleSystem.forces` array has been switched out for singular function `ParticleSystems.updateCallback`. Use of the `forces` parameter is deprecated and will be removed in Cesium 1.46.
- Any width and height variables in `ParticleSystem` will no longer be individual components. `ParticleSystem.minimumWidth` and `ParticleSystem.minimumHeight` will now be `ParticleSystem.minimumImageSize`, `ParticleSystem.maximumWidth` and `ParticleSystem.maximumHeight` will now be `ParticleSystem.maximumImageSize`, and `ParticleSystem.width` and `ParticleSystem.height` will now be `ParticleSystem.imageSize`. Use of the `minimumWidth`, `minimumHeight`, `maximumWidth`, `maximumHeight`, `width`, and `height` parameters is deprecated and will be removed in Cesium 1.46.

##### Additions :tada:

- Added option `logarithmicDepthBuffer` to `Scene`. With this option there is typically a single frustum using logarithmic depth rendered. This increases performance by issuing less draw calls to the GPU and helps to avoid artifacts on the connection of two frustums. [#5851](https://github.com/CesiumGS/cesium/pull/5851)
- When a log depth buffer is supported, the frustum near and far planes default to `0.1` and `1e10` respectively.
- Added `IonGeocoderService` and made it the default geocoding service for the `Geocoder` widget.
- Added `createWorldImagery` which provides Bing Maps imagery via a Cesium ion account.
- Added `PeliasGeocoderService`, which provides geocoding via a [Pelias](https://pelias.io) server.
- Added the ability for `BaseLayerPicker` to group layers by category. `ProviderViewModel.category` was also added to support this feature.
- Added `Math.log2` to compute the base 2 logarithm of a number.
- Added `GeocodeType` enum and use it as an optional parameter to all `GeocoderService` instances to differentiate between autocomplete and search requests.
- Added `initWebAssemblyModule` function to `TaskProcessor` to load a Web Assembly module in a web worker. [#6420](https://github.com/CesiumGS/cesium/pull/6420)
- Added `supportsWebAssembly` function to `FeatureDetection` to check if a browser supports loading Web Assembly modules. [#6420](https://github.com/CesiumGS/cesium/pull/6420)
- Improved `MapboxImageryProvider` performance by 300% via `tiles.mapbox.com` subdomain switching. [#6426](https://github.com/CesiumGS/cesium/issues/6426)
- Added ability to invoke `sampleTerrain` from node.js to enable offline terrain sampling
- Added more ParticleSystem Sandcastle examples for rocket and comet tails and weather. [#6375](https://github.com/CesiumGS/cesium/pull/6375)
- Added color and scale attributes to the `ParticleSystem` class constructor. When defined the variables override startColor and endColor and startScale and endScale. [#6429](https://github.com/CesiumGS/cesium/pull/6429)

##### Fixes :wrench:

- Fixed bugs in `TimeIntervalCollection.removeInterval`. [#6418](https://github.com/CesiumGS/cesium/pull/6418).
- Fixed glTF support to handle meshes with and without tangent vectors, and with/without morph targets, sharing one material. [#6421](https://github.com/CesiumGS/cesium/pull/6421)
- Fixed glTF support to handle skinned meshes when no skin is supplied. [#6061](https://github.com/CesiumGS/cesium/issues/6061)
- Updated glTF 2.0 PBR shader to have brighter lighting. [#6430](https://github.com/CesiumGS/cesium/pull/6430)
- Allow loadWithXhr to work with string URLs in a web worker.
- Updated to Draco 1.3.0 and implemented faster loading of Draco compressed glTF assets in browsers that support Web Assembly. [#6420](https://github.com/CesiumGS/cesium/pull/6420)
- `GroundPrimitive`s and `ClassificationPrimitive`s will become ready when `show` is `false`. [#6428](https://github.com/CesiumGS/cesium/pull/6428)
- Fix Firefox WebGL console warnings. [#5912](https://github.com/CesiumGS/cesium/issues/5912)
- Fix parsing Cesium.js in older browsers that do not support all TypedArray types. [#6396](https://github.com/CesiumGS/cesium/pull/6396)
- Fixed a bug causing crashes when setting colors on un-pickable models. [\$6442](https://github.com/CesiumGS/cesium/issues/6442)
- Fix flicker when adding, removing, or modifying entities. [#3945](https://github.com/CesiumGS/cesium/issues/3945)
- Fixed crash bug in PolylineCollection when a polyline was updated and removed at the same time. [#6455](https://github.com/CesiumGS/cesium/pull/6455)
- Fixed crash when animating a glTF model with a single keyframe. [#6422](https://github.com/CesiumGS/cesium/pull/6422)
- Fixed Imagery Layers Texture Filters Sandcastle example. [#6472](https://github.com/CesiumGS/cesium/pull/6472).
- Fixed a bug causing Cesium 3D Tilesets to not clip properly when tiles were unloaded and reloaded. [#6484](https://github.com/CesiumGS/cesium/issues/6484)
- Fixed `TimeInterval` so now it throws if `fromIso8601` is given an ISO 8601 string with improper formatting. [#6164](https://github.com/CesiumGS/cesium/issues/6164)
- Improved rendering of glTF models that don't contain normals with a temporary unlit shader workaround. [#6501](https://github.com/CesiumGS/cesium/pull/6501)
- Fixed rendering of glTF models with emissive-only materials. [#6501](https://github.com/CesiumGS/cesium/pull/6501)
- Fixed a bug in shader modification for glTF 1.0 quantized attributes and Draco quantized attributes. [#6523](https://github.com/CesiumGS/cesium/pull/6523)

### 1.44 - 2018-04-02

##### Highlights :sparkler:

- Added a new Sandcastle label, `New in X.X` which will include all new Sandcastle demos added for the current release. [#6384](https://github.com/CesiumGS/cesium/issues/6384)
- Added support for glTF models with [Draco geometry compression](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md). [#5120](https://github.com/CesiumGS/cesium/issues/5120)
- Added support for ordering in `DataSourceCollection`. [#6316](https://github.com/CesiumGS/cesium/pull/6316)

##### Breaking Changes :mega:

- `GeometryVisualizer` now requires `primitive` and `groundPrimitive` parameters. [#6316](https://github.com/CesiumGS/cesium/pull/6316)
- For all classes/functions that take a `Resource` instance, all additional parameters that are part of the `Resource` class have been removed. This generally includes `proxy`, `headers` and `query` parameters. [#6368](https://github.com/CesiumGS/cesium/pull/6368)
- All low level load functions including `loadArrayBuffer`, `loadBlob`, `loadImage`, `loadJson`, `loadJsonp`, `loadText`, `loadXML` and `loadWithXhr` have been removed. Please use the equivalent `fetch` functions on the `Resource` class. [#6368](https://github.com/CesiumGS/cesium/pull/6368)

##### Deprecated :hourglass_flowing_sand:

- `ClippingPlaneCollection` is now supported in Internet Explorer, so `ClippingPlaneCollection.isSupported` has been deprecated and will be removed in Cesium 1.45.
- `ClippingPlaneCollection` should now be used with `ClippingPlane` objects instead of `Plane`. Use of `Plane` objects has been deprecated and will be removed in Cesium 1.45.
- `Credit` now takes an `html` and `showOnScreen` parameters instead of an `options` object. Use of the `options` parameter is deprecated and will be removed in Cesium 1.46.
- `Credit.text`, `Credit.imageUrl` and `Credit.link` properties have all been deprecated and will be removed in Cesium 1.46. Use `Credit.html` to retrieve the credit content.
- `Credit.hasImage` and `Credit.hasLink` functions have been deprecated and will be removed in Cesium 1.46.

##### Additions :tada:

- Added a new Sandcastle label, `New in X.X` which will include all new Sandcastle demos added for the current release. [#6384](https://github.com/CesiumGS/cesium/issues/6384)
- Added support for glTF models with [Draco geometry compression](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md). [#5120](https://github.com/CesiumGS/cesium/issues/5120)
  - Added `dequantizeInShader` option parameter to `Model` and `Model.fromGltf` to specify if Draco compressed glTF assets should be dequantized on the GPU.
- Added support for ordering in `DataSourceCollection`. [#6316](https://github.com/CesiumGS/cesium/pull/6316)
  - All ground geometry from one `DataSource` will render in front of all ground geometry from another `DataSource` in the same collection with a lower index.
  - Use `DataSourceCollection.raise`, `DataSourceCollection.lower`, `DataSourceCollection.raiseToTop` and `DataSourceCollection.lowerToBottom` functions to change the ordering of a `DataSource` in the collection.
- `ClippingPlaneCollection` updates [#6201](https://github.com/CesiumGS/cesium/pull/6201):
  - Removed the 6-clipping-plane limit.
  - Added support for Internet Explorer.
  - Added a `ClippingPlane` object to be used with `ClippingPlaneCollection`.
  - Added 3D Tiles use-case to the Terrain Clipping Planes Sandcastle.
- `Credit` has been modified to take an HTML string as the credit content. [#6331](https://github.com/CesiumGS/cesium/pull/6331)
- Sharing Sandcastle examples now works by storing the full example directly in the URL instead of creating GitHub gists, because anonymous gist creation was removed by GitHub. Loading existing gists will still work. [#6342](https://github.com/CesiumGS/cesium/pull/6342)
- Updated `WebMapServiceImageryProvider` so it can take an srs or crs string to pass to the resource query parameters based on the WMS version. [#6223](https://github.com/CesiumGS/cesium/issues/6223)
- Added additional query parameter options to the CesiumViewer demo application [#6328](https://github.com/CesiumGS/cesium/pull/6328):
  - `sourceType` specifies the type of data source if the URL doesn't have a known file extension.
  - `flyTo=false` optionally disables the automatic `flyTo` after loading the data source.
- Added a multi-part CZML example to Sandcastle. [#6320](https://github.com/CesiumGS/cesium/pull/6320)
- Improved processing order of 3D tiles. [#6364](https://github.com/CesiumGS/cesium/pull/6364)

##### Fixes :wrench:

- Fixed Cesium ion browser caching. [#6353](https://github.com/CesiumGS/cesium/pull/6353).
- Fixed formula for Weighted Blended Order-Independent Transparency. [#6340](https://github.com/CesiumGS/cesium/pull/6340)
- Fixed support of glTF-supplied tangent vectors. [#6302](https://github.com/CesiumGS/cesium/pull/6302)
- Fixed model loading failure when containing unused materials. [6315](https://github.com/CesiumGS/cesium/pull/6315)
- Fixed default value of `alphaCutoff` in glTF models. [#6346](https://github.com/CesiumGS/cesium/pull/6346)
- Fixed double-sided flag for glTF materials with `BLEND` enabled. [#6371](https://github.com/CesiumGS/cesium/pull/6371)
- Fixed animation for glTF models with missing animation targets. [#6351](https://github.com/CesiumGS/cesium/pull/6351)
- Fixed improper zoom during model load failure. [#6305](https://github.com/CesiumGS/cesium/pull/6305)
- Fixed rendering vector tiles when using `invertClassification`. [#6349](https://github.com/CesiumGS/cesium/pull/6349)
- Fixed occlusion when `globe.show` is `false`. [#6374](https://github.com/CesiumGS/cesium/pull/6374)
- Fixed crash for entities with static geometry and time-dynamic attributes. [#6377](https://github.com/CesiumGS/cesium/pull/6377)
- Fixed geometry tile rendering in IE. [#6406](https://github.com/CesiumGS/cesium/pull/6406)

### 1.43 - 2018-03-01

##### Major Announcements :loudspeaker:

- Say hello to [Cesium ion](https://cesium.com/blog/2018/03/01/hello-cesium-ion/)
- Cesium, the JavaScript library, is now officially renamed to CesiumJS (no code changes required)
- The STK World Terrain tileset is deprecated and will be available until September 1, 2018. Check out the new high-resolution [Cesium World Terrain](https://cesium.com/blog/2018/03/01/introducing-cesium-world-terrain/)

##### Breaking Changes :mega:

- Removed `GeometryUpdater.perInstanceColorAppearanceType` and `GeometryUpdater.materialAppearanceType`. [#6239](https://github.com/CesiumGS/cesium/pull/6239)
- `GeometryVisualizer` no longer uses a `type` parameter. [#6239](https://github.com/CesiumGS/cesium/pull/6239)
- `GeometryVisualizer` no longer displays polylines. Use `PolylineVisualizer` instead. [#6239](https://github.com/CesiumGS/cesium/pull/6239)
- The experimental `CesiumIon` object has been completely refactored and renamed to `Ion`.

##### Deprecated :hourglass_flowing_sand:

- The STK World Terrain, ArcticDEM, and PAMAP Terrain tilesets hosted on `assets.agi.com` are deprecated and will be available until September 1, 2018. To continue using them, access them via [Cesium ion](https://cesium.com/blog/2018/03/01/hello-cesium-ion/)
- In the `Resource` class, `addQueryParameters` and `addTemplateValues` have been deprecated and will be removed in Cesium 1.45. Please use `setQueryParameters` and `setTemplateValues` instead.

##### Additions :tada:

- Added new `Ion`, `IonResource`, and `IonImageryProvider` objects for loading data hosted on [Cesium ion](https://cesium.com/blog/2018/03/01/hello-cesium-ion/).
- Added `createWorldTerrain` helper function for easily constructing the new Cesium World Terrain.
- Added support for a promise to a resource for `CesiumTerrainProvider`, `createTileMapServiceImageryProvider` and `Cesium3DTileset` [#6204](https://github.com/CesiumGS/cesium/pull/6204)
- Added `Cesium.Math.cbrt`. [#6222](https://github.com/CesiumGS/cesium/pull/6222)
- Added `PolylineVisualizer` for displaying polyline entities [#6239](https://github.com/CesiumGS/cesium/pull/6239)
- `Resource` class [#6205](https://github.com/CesiumGS/cesium/issues/6205)
  - Added `put`, `patch`, `delete`, `options` and `head` methods, so it can be used for all XHR requests.
  - Added `preserveQueryParameters` parameter to `getDerivedResource`, to allow us to append query parameters instead of always replacing them.
  - Added `setQueryParameters` and `appendQueryParameters` to allow for better handling of query strings.
- Enable terrain in the `CesiumViewer` demo application [#6198](https://github.com/CesiumGS/cesium/pull/6198)
- Added `Globe.tilesLoaded` getter property to determine if all terrain and imagery is loaded. [#6194](https://github.com/CesiumGS/cesium/pull/6194)
- Added `classificationType` property to entities which specifies whether an entity on the ground, like a polygon or rectangle, should be clamped to terrain, 3D Tiles, or both. [#6195](https://github.com/CesiumGS/cesium/issues/6195)

##### Fixes :wrench:

- Fixed bug where KmlDataSource did not use Ellipsoid to convert coordinates. Use `options.ellipsoid` to pass the ellipsoid to KmlDataSource constructors / loaders. [#6176](https://github.com/CesiumGS/cesium/pull/6176)
- Fixed bug where 3D Tiles Point Clouds would fail in Internet Explorer. [#6220](https://github.com/CesiumGS/cesium/pull/6220)
- Fixed issue where `CESIUM_BASE_URL` wouldn't work without a trailing `/`. [#6225](https://github.com/CesiumGS/cesium/issues/6225)
- Fixed coloring for polyline entities with a dynamic color for the depth fail material [#6245](https://github.com/CesiumGS/cesium/pull/6245)
- Fixed bug with zooming to dynamic geometry. [#6269](https://github.com/CesiumGS/cesium/issues/6269)
- Fixed bug where `AxisAlignedBoundingBox` did not copy over center value when cloning an undefined result. [#6183](https://github.com/CesiumGS/cesium/pull/6183)
- Fixed a bug where imagery stops loading when changing terrain in request render mode. [#6193](https://github.com/CesiumGS/cesium/issues/6193)
- Fixed `Resource.fetch` when called with no arguments [#6206](https://github.com/CesiumGS/cesium/issues/6206)
- Fixed `Resource.clone` to clone the `Request` object, so resource can be used in parallel. [#6208](https://github.com/CesiumGS/cesium/issues/6208)
- Fixed `Material` so it can now take a `Resource` object as an image. [#6199](https://github.com/CesiumGS/cesium/issues/6199)
- Fixed an issue causing the Bing Maps key to be sent unnecessarily with every tile request. [#6250](https://github.com/CesiumGS/cesium/pull/6250)
- Fixed documentation issue for the `Cesium.Math` class. [#6233](https://github.com/CesiumGS/cesium/issues/6233)
- Fixed rendering 3D Tiles as classification volumes. [#6295](https://github.com/CesiumGS/cesium/pull/6295)

### 1.42.1 - 2018-02-01

\_This is an npm-only release to fix an issue with using Cesium in Node.js.\_\_

- Fixed a bug where Cesium would fail to load under Node.js. [#6177](https://github.com/CesiumGS/cesium/pull/6177)

### 1.42 - 2018-02-01

##### Highlights :sparkler:

- Added experimental support for [3D Tiles Vector and Geometry data](https://github.com/CesiumGS/3d-tiles/tree/vctr/TileFormats/VectorData). ([#4665](https://github.com/CesiumGS/cesium/pull/4665))
- Added optional mode to reduce CPU usage. See [Improving Performance with Explicit Rendering](https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/). ([#6115](https://github.com/CesiumGS/cesium/pull/6115))
- Added experimental `CesiumIon` utility class for working with the Cesium ion beta API. [#6136](https://github.com/CesiumGS/cesium/pull/6136)
- Major refactor of URL handling. All classes that take a url parameter, can now take a Resource or a String. This includes all imagery providers, all terrain providers, `Cesium3DTileset`, `KMLDataSource`, `CZMLDataSource`, `GeoJsonDataSource`, `Model`, and `Billboard`.

##### Breaking Changes :mega:

- The clock does not animate by default. Set the `shouldAnimate` option to `true` when creating the Viewer to enable animation.

##### Deprecated :hourglass_flowing_sand:

- For all classes/functions that can now take a `Resource` instance, all additional parameters that are part of the `Resource` class have been deprecated and will be removed in Cesium 1.44. This generally includes `proxy`, `headers` and `query` parameters.
- All low level load functions including `loadArrayBuffer`, `loadBlob`, `loadImage`, `loadJson`, `loadJsonp`, `loadText`, `loadXML` and `loadWithXhr` have been deprecated and will be removed in Cesium 1.44. Please use the equivalent `fetch` functions on the `Resource` class.

##### Additions :tada:

- Added experimental support for [3D Tiles Vector and Geometry data](https://github.com/CesiumGS/3d-tiles/tree/vctr/TileFormats/VectorData) ([#4665](https://github.com/CesiumGS/cesium/pull/4665)). The new and modified Cesium APIs are:
  - `Cesium3DTileStyle` has expanded to include styling point features. See the [styling specification](https://github.com/CesiumGS/3d-tiles/tree/vector-tiles/Styling#vector-data) for details.
  - `Cesium3DTileFeature` can modify `color` and `show` properties for polygon, polyline, and geometry features.
  - `Cesium3DTilePointFeature` can modify the styling options for a point feature.
- Added optional mode to reduce CPU usage. [#6115](https://github.com/CesiumGS/cesium/pull/6115)
  - `Scene.requestRenderMode` enables a mode which will only request new render frames on changes to the scene, or when the simulation time change exceeds `scene.maximumRenderTimeChange`.
  - `Scene.requestRender` will explicitly request a new render frame when in request render mode.
  - Added `Scene.preUpdate` and `Scene.postUpdate` events that are raised before and after the scene updates respectively. The scene is always updated before executing a potential render. Continue to listen to `Scene.preRender` and `Scene.postRender` events for when the scene renders a frame.
  - Added `CreditDisplay.update`, which updates the credit display before a new frame is rendered.
  - Added `Globe.imageryLayersUpdatedEvent`, which is raised when an imagery layer is added, shown, hidden, moved, or removed on the globe.
- Added `Cesium3DTileset.classificationType` to specify if a tileset classifies terrain, another 3D Tiles tileset, or both. This only applies to vector, geometry and batched 3D model tilesets. The limitations on the glTF contained in the b3dm tile are:
  - `POSITION` and `_BATCHID` semantics are required.
  - All indices with the same batch id must occupy contiguous sections of the index buffer.
  - All shaders and techniques are ignored. The generated shader simply multiplies the position by the model-view-projection matrix.
  - The only supported extensions are `CESIUM_RTC` and `WEB3D_quantized_attributes`.
  - Only one node is supported.
  - Only one mesh per node is supported.
  - Only one primitive per mesh is supported.
- Added geometric-error-based point cloud attenuation and eye dome lighting for point clouds using replacement refinement. [#6069](https://github.com/CesiumGS/cesium/pull/6069)
- Updated `Viewer.zoomTo` and `Viewer.flyTo` to take a `Cesium3DTileset` as a target. [#6104](https://github.com/CesiumGS/cesium/pull/6104)
- Added `shouldAnimate` option to the `Viewer` constructor to indicate if the clock should begin animating on startup. [#6154](https://github.com/CesiumGS/cesium/pull/6154)
- Added `Cesium3DTileset.ellipsoid` determining the size and shape of the globe. This can be set at construction and defaults to a WGS84 ellipsoid.
- Added `Plane.projectPointOntoPlane` for projecting a `Cartesian3` position onto a `Plane`. [#6092](https://github.com/CesiumGS/cesium/pull/6092)
- Added `Cartesian3.projectVector` for projecting one vector to another. [#6093](https://github.com/CesiumGS/cesium/pull/6093)
- Added `Cesium3DTileset.tileFailed` event that will be raised when a tile fails to load. The object passed to the event listener will have a url and message property. If there are no event listeners, error messages will be logged to the console. [#6088](https://github.com/CesiumGS/cesium/pull/6088)
- Added `AttributeCompression.zigZagDeltaDecode` which will decode delta and ZigZag encoded buffers in place.
- Added `pack` and `unpack` functions to `OrientedBoundingBox` for packing to and unpacking from a flat buffer.
- Added support for vertex shader uniforms when `tileset.colorBlendMode` is `MIX` or `REPLACE`. [#5874](https://github.com/CesiumGS/cesium/pull/5874)
- Added `ClippingPlaneCollection.isSupported` function for checking if rendering with clipping planes is supported.[#6084](https://github.com/CesiumGS/cesium/pull/6084)
- Added `Cartographic.toCartesian` to convert from `Cartographic` to `Cartesian3`. [#6163](https://github.com/CesiumGS/cesium/pull/6163)
- Added `BoundingSphere.volume` for computing the volume of a `BoundingSphere`. [#6069](https://github.com/CesiumGS/cesium/pull/6069)
- Added new file for the Cesium [Code of Conduct](https://github.com/CesiumGS/cesium/blob/main/CODE_OF_CONDUCT.md). [#6129](https://github.com/CesiumGS/cesium/pull/6129)

##### Fixes :wrench:

- Fixed a bug that could cause tiles to be missing from the globe surface, especially when starting with the camera zoomed close to the surface. [#4969](https://github.com/CesiumGS/cesium/pull/4969)
- Fixed applying a translucent style to a point cloud tileset. [#6113](https://github.com/CesiumGS/cesium/pull/6113)
- Fixed Sandcastle error in IE 11. [#6169](https://github.com/CesiumGS/cesium/pull/6169)
- Fixed a glTF animation bug that caused certain animations to jitter. [#5740](https://github.com/CesiumGS/cesium/pull/5740)
- Fixed a bug when creating billboard and model entities without a globe. [#6109](https://github.com/CesiumGS/cesium/pull/6109)
- Improved CZML Custom Properties Sandcastle example. [#6086](https://github.com/CesiumGS/cesium/pull/6086)
- Improved Particle System Sandcastle example for better visual. [#6132](https://github.com/CesiumGS/cesium/pull/6132)
- Fixed behavior of `Camera.move*` and `Camera.look*` functions in 2D mode. [#5884](https://github.com/CesiumGS/cesium/issues/5884)
- Fixed `Camera.moveStart` and `Camera.moveEnd` events not being raised when camera is close to the ground. [#4753](https://github.com/CesiumGS/cesium/issues/4753)
- Fixed `OrientedBoundingBox` documentation. [#6147](https://github.com/CesiumGS/cesium/pull/6147)
- Updated documentation links to reflect new locations on `https://cesiumjs.org` and `https://cesium.com`.

### 1.41 - 2018-01-02

- Breaking changes
  - Removed the `text`, `imageUrl`, and `link` parameters from `Credit`, which were deprecated in Cesium 1.40. Use `options.text`, `options.imageUrl`, and `options.link` instead.
- Added support for clipping planes. [#5913](https://github.com/CesiumGS/cesium/pull/5913), [#5996](https://github.com/CesiumGS/cesium/pull/5996)
  - Added `clippingPlanes` property to `ModelGraphics`, `Model`, `Cesium3DTileset`, and `Globe`, which specifies a `ClippingPlaneCollection` to selectively disable rendering.
  - Added `PlaneGeometry`, `PlaneOutlineGeometry`, `PlaneGeometryUpdater`, `PlaneOutlineGeometryUpdater`, `PlaneGraphics`, and `Entity.plane` to visualize planes.
  - Added `Plane.transformPlane` to apply a transformation to a plane.
- Fixed point cloud exception in IE. [#6051](https://github.com/CesiumGS/cesium/pull/6051)
- Fixed globe materials when `Globe.enableLighting` was `false`. [#6042](https://github.com/CesiumGS/cesium/issues/6042)
- Fixed shader compilation failure on pick when globe materials were enabled. [#6039](https://github.com/CesiumGS/cesium/issues/6039)
- Fixed exception when `invertClassification` was enabled, the invert color had an alpha less than `1.0`, and the window was resized. [#6046](https://github.com/CesiumGS/cesium/issues/6046)

### 1.40 - 2017-12-01

- Deprecated
  - The `text`, `imageUrl` and `link` parameters from `Credit` have been deprecated and will be removed in Cesium 1.41. Use `options.text`, `options.imageUrl` and `options.link` instead.
- Added `Globe.material` to apply materials to the globe/terrain for shading such as height- or slope-based color ramps. See the new [Sandcastle example](https://cesiumjs.org/Cesium/Apps/Sandcastle/?src=Globe%20Materials.html&label=Showcases). [#5919](https://github.com/CesiumGS/cesium/pull/5919/files)
- Added CZML support for `polyline.depthFailMaterial`, `label.scaleByDistance`, `distanceDisplayCondition`, and `disableDepthTestDistance`. [#5986](https://github.com/CesiumGS/cesium/pull/5986)
- Fixed a bug where drill picking a polygon clamped to ground would cause the browser to hang. [#5971](https://github.com/CesiumGS/cesium/issues/5971)
- Fixed bug in KML LookAt bug where degrees and radians were mixing in a subtraction. [#5992](https://github.com/CesiumGS/cesium/issues/5992)
- Fixed handling of KMZ files with missing `xsi` namespace declarations. [#6003](https://github.com/CesiumGS/cesium/pull/6003)
- Added function that removes duplicate namespace declarations while loading a KML or a KMZ. [#5972](https://github.com/CesiumGS/cesium/pull/5972)
- Fixed a language detection issue. [#6016](https://github.com/CesiumGS/cesium/pull/6016)
- Fixed a bug where glTF models with animations of different lengths would cause an error. [#5694](https://github.com/CesiumGS/cesium/issues/5694)
- Added a `clampAnimations` parameter to `Model` and `Entity.model`. Setting this to `false` allows different length animations to loop asynchronously over the duration of the longest animation.
- Fixed `Invalid asm.js: Invalid member of stdlib` console error by recompiling crunch.js with latest emscripten toolchain. [#5847](https://github.com/CesiumGS/cesium/issues/5847)
- Added `file:` scheme compatibility to `joinUrls`. [#5989](https://github.com/CesiumGS/cesium/pull/5989)
- Added a Reverse Geocoder [Sandcastle example](https://cesiumjs.org/Cesium/Apps/Sandcastle/?src=Reverse%20Geocoder.html&label=Showcases). [#5976](https://github.com/CesiumGS/cesium/pull/5976)
- Added ability to support touch event in Imagery Layers Split Sandcastle example. [#5948](https://github.com/CesiumGS/cesium/pull/5948)
- Added a new `@experimental` tag to the documentation. A small subset of the Cesium API tagged as such are subject to breaking changes without deprecation. See the [Coding Guide](https://github.com/CesiumGS/cesium/tree/main/Documentation/Contributors/CodingGuide#deprecation-and-breaking-changes) for further explanation. [#6010](https://github.com/CesiumGS/cesium/pull/6010)
- Moved terrain and imagery credits to a lightbox that pops up when you click a link in the onscreen credits [#3013](https://github.com/CesiumGS/cesium/issues/3013)

### 1.39 - 2017-11-01

- Cesium now officially supports webpack. See our [Integrating Cesium and webpack blog post](https://cesium.com/blog/2017/10/18/cesium-and-webpack/) for more details.
- Added support for right-to-left language detection in labels, currently Hebrew and Arabic are supported. To enable it, set `Cesium.Label.enableRightToLeftDetection = true` at the start of your application. [#5771](https://github.com/CesiumGS/cesium/pull/5771)
- Fixed handling of KML files with missing `xsi` namespace declarations. [#5860](https://github.com/CesiumGS/cesium/pull/5860)
- Fixed a bug that caused KML ground overlays to appear distorted when rotation was applied. [#5914](https://github.com/CesiumGS/cesium/issues/5914)
- Fixed a bug where KML placemarks with no specified icon would be displayed with default icon. [#5819](https://github.com/CesiumGS/cesium/issues/5819)
- Changed KML loading to ignore NetworkLink failures and continue to load the rest of the document. [#5871](https://github.com/CesiumGS/cesium/pull/5871)
- Added the ability to load Cesium's assets from the local file system if security permissions allow it. [#5830](https://github.com/CesiumGS/cesium/issues/5830)
- Added two new properties to `ImageryLayer` that allow for adjusting the texture sampler used for up and down-sampling of imagery tiles, namely `minificationFilter` and `magnificationFilter` with possible values `LINEAR` (the default) and `NEAREST` defined in `TextureMinificationFilter` and `TextureMagnificationFilter`. [#5846](https://github.com/CesiumGS/cesium/issues/5846)
- Fixed flickering artifacts with 3D Tiles tilesets with thin walls. [#5940](https://github.com/CesiumGS/cesium/pull/5940)
- Fixed bright fog when terrain lighting is enabled and added `Fog.minimumBrightness` to affect how bright the fog will be when in complete darkness. [#5934](https://github.com/CesiumGS/cesium/pull/5934)
- Fixed using arrow keys in geocoder widget to select search suggestions. [#5943](https://github.com/CesiumGS/cesium/issues/5943)
- Added support for the layer.json `parentUrl` property in `CesiumTerrainProvider` to allow for compositing of tilesets. [#5864](https://github.com/CesiumGS/cesium/pull/5864)
- Added `invertClassification` and `invertClassificationColor` to `Scene`. When `invertClassification` is `true`, any 3D Tiles geometry that is not classified by a `ClassificationPrimitive` or `GroundPrimitive` will have its color multiplied by `invertClassificationColor`. [#5836](https://github.com/CesiumGS/cesium/pull/5836)
- Added `customTags` property to the UrlTemplateImageryProvider to allow custom keywords in the template URL. [#5696](https://github.com/CesiumGS/cesium/pull/5696)
- Added `eyeSeparation` and `focalLength` properties to `Scene` to configure VR settings. [#5917](https://github.com/CesiumGS/cesium/pull/5917)
- Improved CZML Reference Properties example [#5754](https://github.com/CesiumGS/cesium/pull/5754)

### 1.38 - 2017-10-02

- Breaking changes
  - `Scene/CullingVolume` has been removed. Use `Core/CullingVolume`.
  - `Scene/OrthographicFrustum` has been removed. Use `Core/OrthographicFrustum`.
  - `Scene/OrthographicOffCenterFrustum` has been removed. Use `Core/OrthographicOffCenterFrustum`.
  - `Scene/PerspectiveFrustum` has been removed. Use `Core/PerspectiveFrustum`.
  - `Scene/PerspectiveOffCenterFrustum` has been removed. Use `Core/PerspectiveOffCenterFrustum`.
- Added support in CZML for expressing `orientation` as the velocity vector of an entity, using `velocityReference` syntax. [#5807](https://github.com/CesiumGS/cesium/pull/5807)
- Fixed CZML processing of `velocityReference` within an interval. [#5738](https://github.com/CesiumGS/cesium/issues/5738)
- Added ability to add an animation to `ModelAnimationCollection` by its index. [#5815](https://github.com/CesiumGS/cesium/pull/5815)
- Fixed a bug in `ModelAnimationCollection` that caused adding an animation by its name to throw an error. [#5815](https://github.com/CesiumGS/cesium/pull/5815)
- Fixed issue in Internet Explorer and Edge with loading unicode strings in typed arrays that impacted 3D Tiles Batch Table values.
- Zoom now maintains camera heading, pitch, and roll. [#4639](https://github.com/CesiumGS/cesium/pull/5603)
- Fixed a bug in `PolylineCollection` preventing the display of more than 16K points in a single collection. [#5538](https://github.com/CesiumGS/cesium/pull/5782)
- Fixed a 3D Tiles point cloud bug causing a stray point to appear at the center of the screen on certain hardware. [#5599](https://github.com/CesiumGS/cesium/issues/5599)
- Fixed removing multiple event listeners within event callbacks. [#5827](https://github.com/CesiumGS/cesium/issues/5827)
- Running `buildApps` now creates a built version of Sandcastle which uses the built version of Cesium for better performance.
- Fixed a tileset traversal bug when the `skipLevelOfDetail` optimization is off. [#5869](https://github.com/CesiumGS/cesium/issues/5869)

### 1.37 - 2017-09-01

- Breaking changes
  - Passing `options.clock` when creating a new `Viewer` instance is removed, pass `options.clockViewModel` instead.
  - Removed `GoogleEarthImageryProvider`, use `GoogleEarthEnterpriseMapsProvider` instead.
  - Removed the `throttleRequest` parameter from `TerrainProvider.requestTileGeometry` and inherited terrain providers. It is replaced with an optional `Request` object. Set the request's `throttle` property to `true` to throttle requests.
  - Removed the ability to provide a Promise for the `options.url` parameter of `loadWithXhr` and for the `url` parameter of `loadArrayBuffer`, `loadBlob`, `loadImageViaBlob`, `loadText`, `loadJson`, `loadXML`, `loadImage`, `loadCRN`, `loadKTX`, and `loadCubeMap`. Instead `url` must be a string.
- Added `classificationType` to `ClassificationPrimitive` and `GroundPrimitive` to choose whether terrain, 3D Tiles, or both are classified. [#5770](https://github.com/CesiumGS/cesium/pull/5770)
- Fixed depth picking on 3D Tiles. [#5676](https://github.com/CesiumGS/cesium/issues/5676)
- Fixed glTF model translucency bug. [#5731](https://github.com/CesiumGS/cesium/issues/5731)
- Fixed `replaceState` bug that was causing the `CesiumViewer` demo application to crash in Safari and iOS. [#5691](https://github.com/CesiumGS/cesium/issues/5691)
- Fixed a 3D Tiles traversal bug for tilesets using additive refinement. [#5766](https://github.com/CesiumGS/cesium/issues/5766)
- Fixed a 3D Tiles traversal bug where out-of-view children were being loaded unnecessarily. [#5477](https://github.com/CesiumGS/cesium/issues/5477)
- Fixed `Entity` id type to be `String` in `EntityCollection` and `CompositeEntityCollection` [#5791](https://github.com/CesiumGS/cesium/pull/5791)
- Fixed issue where `Model` and `BillboardCollection` would throw an error if the globe is undefined. [#5638](https://github.com/CesiumGS/cesium/issues/5638)
- Fixed issue where the `Model` glTF cache loses reference to the model's buffer data. [#5720](https://github.com/CesiumGS/cesium/issues/5720)
- Fixed some issues with `disableDepthTestDistance`. [#5501](https://github.com/CesiumGS/cesium/issues/5501) [#5331](https://github.com/CesiumGS/cesium/issues/5331) [#5621](https://github.com/CesiumGS/cesium/issues/5621)
- Added several new Bing Maps styles: `CANVAS_DARK`, `CANVAS_LIGHT`, and `CANVAS_GRAY`. [#5737](https://github.com/CesiumGS/cesium/pull/5737)
- Added small improvements to the atmosphere. [#5741](https://github.com/CesiumGS/cesium/pull/5741)
- Fixed a bug that caused imagery splitting to work incorrectly when CSS pixels were not equivalent to WebGL drawing buffer pixels, such as on high DPI displays in Microsoft Edge and Internet Explorer. [#5743](https://github.com/CesiumGS/cesium/pull/5743)
- Added `Cesium3DTileset.loadJson` to support overriding the default tileset loading behavior. [#5685](https://github.com/CesiumGS/cesium/pull/5685)
- Fixed loading of binary glTFs containing CRN or KTX textures. [#5753](https://github.com/CesiumGS/cesium/pull/5753)
- Fixed specular computation for certain models using the `KHR_materials_common` extension. [#5773](https://github.com/CesiumGS/cesium/pull/5773)
- Fixed a picking bug in the `3D Tiles Interactivity` Sandcastle demo. [#5703](https://github.com/CesiumGS/cesium/issues/5703)
- Updated knockout from 3.4.0 to 3.4.2 [#5703](https://github.com/CesiumGS/cesium/pull/5829)

### 1.36 - 2017-08-01

- Breaking changes
  - The function `Quaternion.fromHeadingPitchRoll(heading, pitch, roll, result)` was removed. Use `Quaternion.fromHeadingPitchRoll(hpr, result)` instead where `hpr` is a `HeadingPitchRoll`.
  - The function `Transforms.headingPitchRollToFixedFrame(origin, headingPitchRoll, ellipsoid, result)` was removed. Use `Transforms.headingPitchRollToFixedFrame(origin, headingPitchRoll, ellipsoid, fixedFrameTransform, result)` instead where `fixedFrameTransform` is a a 4x4 transformation matrix (see `Transforms.localFrameToFixedFrameGenerator`).
  - The function `Transforms.headingPitchRollQuaternion(origin, headingPitchRoll, ellipsoid, result)` was removed. Use `Transforms.headingPitchRollQuaternion(origin, headingPitchRoll, ellipsoid, fixedFrameTransform, result)` instead where `fixedFrameTransform` is a a 4x4 transformation matrix (see `Transforms.localFrameToFixedFrameGenerator`).
  - The `color`, `show`, and `pointSize` properties of `Cesium3DTileStyle` are no longer initialized with default values.
- Deprecated
  - `Scene/CullingVolume` is deprecated and will be removed in 1.38. Use `Core/CullingVolume`.
  - `Scene/OrthographicFrustum` is deprecated and will be removed in 1.38. Use `Core/OrthographicFrustum`.
  - `Scene/OrthographicOffCenterFrustum` is deprecated and will be removed in 1.38. Use `Core/OrthographicOffCenterFrustum`.
  - `Scene/PerspectiveFrustum` is deprecated and will be removed in 1.38. Use `Core/PerspectiveFrustum`.
  - `Scene/PerspectiveOffCenterFrustum` is deprecated and will be removed in 1.38. Use `Core/PerspectiveOffCenterFrustum`.
- Added glTF 2.0 support, including physically-based material rendering, morph targets, and appropriate updating of glTF 1.0 models to 2.0. [#5641](https://github.com/CesiumGS/cesium/pull/5641)
- Added `ClassificationPrimitive` which defines a volume and draws the intersection of the volume and terrain or 3D Tiles. [#5625](https://github.com/CesiumGS/cesium/pull/5625)
- Added `tileLoad` event to `Cesium3DTileset`. [#5628](https://github.com/CesiumGS/cesium/pull/5628)
- Fixed issue where scene would blink when labels were added. [#5537](https://github.com/CesiumGS/cesium/issues/5537)
- Fixed label positioning when height reference changes [#5609](https://github.com/CesiumGS/cesium/issues/5609)
- Fixed label positioning when using `HeightReference.CLAMP_TO_GROUND` and no position [#5648](https://github.com/CesiumGS/cesium/pull/5648)
- Fix for dynamic polylines with polyline dash material [#5681](https://github.com/CesiumGS/cesium/pull/5681)
- Added ability to provide a `width` and `height` to `scene.pick`. [#5602](https://github.com/CesiumGS/cesium/pull/5602)
- Fixed `Viewer.flyTo` not respecting zoom limits, and resetting minimumZoomDistance if the camera zoomed past the minimumZoomDistance. [5573](https://github.com/CesiumGS/cesium/issues/5573)
- Added ability to show tile urls in the 3D Tiles Inspector. [#5592](https://github.com/CesiumGS/cesium/pull/5592)
- Fixed a bug when reading CRN compressed textures with multiple mip levels. [#5618](https://github.com/CesiumGS/cesium/pull/5618)
- Fixed issue where composite 3D Tiles that contained instanced 3D Tiles with an external model reference would fail to download the model.
- Added behavior to `Cesium3DTilesInspector` that selects the first tileset hovered over if no tilest is specified. [#5139](https://github.com/CesiumGS/cesium/issues/5139)
- Added `Entity.computeModelMatrix` which returns the model matrix representing the entity's transformation. [#5584](https://github.com/CesiumGS/cesium/pull/5584)
- Added ability to set a style's `color`, `show`, or `pointSize` with a string or object literal. `show` may also take a boolean and `pointSize` may take a number. [#5412](https://github.com/CesiumGS/cesium/pull/5412)
- Added setter for `KmlDataSource.name` to specify a name for the datasource [#5660](https://github.com/CesiumGS/cesium/pull/5660).
- Added setter for `GeoJsonDataSource.name` to specify a name for the datasource [#5653](https://github.com/CesiumGS/cesium/issues/5653)
- Fixed crash when using the `Cesium3DTilesInspectorViewModel` and removing a tileset [#5607](https://github.com/CesiumGS/cesium/issues/5607)
- Fixed polygon outline in Polygon Sandcastle demo [#5642](https://github.com/CesiumGS/cesium/issues/5642)
- Updated `Billboard`, `Label` and `PointPrimitive` constructors to clone `NearFarScale` parameters [#5654](https://github.com/CesiumGS/cesium/pull/5654)
- Added `FrustumGeometry` and `FrustumOutlineGeometry`. [#5649](https://github.com/CesiumGS/cesium/pull/5649)
- Added an `options` parameter to the constructors of `PerspectiveFrustum`, `PerspectiveOffCenterFrustum`, `OrthographicFrustum`, and `OrthographicOffCenterFrustum` to set properties. [#5649](https://github.com/CesiumGS/cesium/pull/5649)

### 1.35.2 - 2017-07-11

- This is an npm-only release to fix an issue with using Cesium in Node.js.
- Fixed a bug where Cesium would fail to load under Node.js and some webpack configurations. [#5593](https://github.com/CesiumGS/cesium/issues/5593)
- Fixed a bug where a Model's compressed textures were not being displayed. [#5596](https://github.com/CesiumGS/cesium/pull/5596)
- Fixed documentation for `OrthographicFrustum`. [#5586](https://github.com/CesiumGS/cesium/issues/5586)

### 1.35.1 - 2017-07-05

- This is an npm-only release to fix a deployment issue with 1.35. No code changes.

### 1.35 - 2017-07-05

- Breaking changes
  - `JulianDate.fromIso8601` will default to midnight UTC if no time is provided to match the Javascript [`Date` specification](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date). You must specify a local time of midnight to achieve the old behavior.
- Deprecated
  - `GoogleEarthImageryProvider` has been deprecated and will be removed in Cesium 1.37, use `GoogleEarthEnterpriseMapsProvider` instead.
  - The `throttleRequest` parameter for `TerrainProvider.requestTileGeometry`, `CesiumTerrainProvider.requestTileGeometry`, `VRTheWorldTerrainProvider.requestTileGeometry`, and `EllipsoidTerrainProvider.requestTileGeometry` is deprecated and will be replaced with an optional `Request` object. The `throttleRequests` parameter will be removed in 1.37. Instead set the request's `throttle` property to `true` to throttle requests.
  - The ability to provide a Promise for the `options.url` parameter of `loadWithXhr` and for the `url` parameter of `loadArrayBuffer`, `loadBlob`, `loadImageViaBlob`, `loadText`, `loadJson`, `loadXML`, `loadImage`, `loadCRN`, `loadKTX`, and `loadCubeMap` is deprecated. This will be removed in 1.37, instead `url` must be a string.
- Added support for [3D Tiles](https://github.com/CesiumGS/3d-tiles/blob/main/README.md) for streaming massive heterogeneous 3D geospatial datasets ([#5308](https://github.com/CesiumGS/cesium/pull/5308)). See the new [Sandcastle examples](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=3D%20Tiles%20Photogrammetry&label=3D%20Tiles). The new Cesium APIs are:
  - `Cesium3DTileset`
  - `Cesium3DTileStyle`, `StyleExpression`, `Expression`, and `ConditionsExpression`
  - `Cesium3DTile`
  - `Cesium3DTileContent`
  - `Cesium3DTileFeature`
  - `Cesium3DTilesInspector`, `Cesium3DTilesInspectorViewModel`, and `viewerCesium3DTilesInspectorMixin`
  - `Cesium3DTileColorBlendMode`
- Added a particle system for effects like smoke, fire, sparks, etc. See `ParticleSystem`, `Particle`, `ParticleBurst`, `BoxEmitter`, `CircleEmitter`, `ConeEmitter`, `ParticleEmitter`, and `SphereEmitter`, and the new Sandcastle examples: [Particle System](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Particle%20System.html&label=Showcases) and [Particle System Fireworks](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Particle%20System%20Fireworks.html&label=Showcases). [#5212](https://github.com/CesiumGS/cesium/pull/5212)
- Added `options.clock`, `options.times` and `options.dimensions` to `WebMapTileServiceImageryProvider` in order to handle time dynamic and static values for dimensions.
- Added an `options.request` parameter to `loadWithXhr` and a `request` parameter to `loadArrayBuffer`, `loadBlob`, `loadImageViaBlob`, `loadText`, `loadJson`, `loadJsonp`, `loadXML`, `loadImageFromTypedArray`, `loadImage`, `loadCRN`, and `loadKTX`.
- `CzmlDataSource` and `KmlDataSource` load functions now take an optional `query` object, which will append query parameters to all network requests. [#5419](https://github.com/CesiumGS/cesium/pull/5419), [#5434](https://github.com/CesiumGS/cesium/pull/5434)
- Added Sandcastle demo for setting time with the Clock API [#5457](https://github.com/CesiumGS/cesium/pull/5457);
- Added Sandcastle demo for ArcticDEM data. [#5224](https://github.com/CesiumGS/cesium/issues/5224)
- Added `fromIso8601`, `fromIso8601DateArray`, and `fromIso8601DurationArray` to `TimeIntervalCollection` for handling various ways groups of intervals can be specified in ISO8601 format.
- Added `fromJulianDateArray` to `TimeIntervalCollection` for generating intervals from a list of dates.
- Fixed geocoder bug so geocoder can accurately handle NSEW inputs [#5407](https://github.com/CesiumGS/cesium/pull/5407)
- Fixed a bug where picking would break when the Sun came into view [#5478](https://github.com/CesiumGS/cesium/issues/5478)
- Fixed a bug where picking clusters would return undefined instead of a list of the clustered entities. [#5286](https://github.com/CesiumGS/cesium/issues/5286)
- Fixed bug where if polylines were set to follow the surface of an undefined globe, Cesium would throw an exception. [#5413](https://github.com/CesiumGS/cesium/pull/5413)
- Reduced the amount of Sun bloom post-process effect near the horizon. [#5381](https://github.com/CesiumGS/cesium/issues/5381)
- Fixed a bug where camera zooming worked incorrectly when the display height was greater than the display width [#5421](https://github.com/CesiumGS/cesium/pull/5421)
- Updated glTF/glb MIME types. [#5420](https://github.com/CesiumGS/cesium/issues/5420)
- Added `Cesium.Math.randomBetween`.
- Modified `defaultValue` to check for both `undefined` and `null`. [#5551](https://github.com/CesiumGS/cesium/pull/5551)
- The `throttleRequestByServer` function has been removed. Instead pass a `Request` object with `throttleByServer` set to `true` to any of following load functions: `loadWithXhr`, `loadArrayBuffer`, `loadBlob`, `loadImageViaBlob`, `loadText`, `loadJson`, `loadJsonp`, `loadXML`, `loadImageFromTypedArray`, `loadImage`, `loadCRN`, and `loadKTX`.

### 1.34 - 2017-06-01

- Deprecated
  - Passing `options.clock` when creating a new `Viewer` instance has been deprecated and will be removed in Cesium 1.37, pass `options.clockViewModel` instead.
- Fix issue where polylines in a `PolylineCollection` would ignore the far distance when updating the distance display condition. [#5283](https://github.com/CesiumGS/cesium/pull/5283)
- Fixed a crash when calling `Camera.pickEllipsoid` with a canvas of size 0.
- Fix `BoundingSphere.fromOrientedBoundingBox`. [#5334](https://github.com/CesiumGS/cesium/issues/5334)
- Fixed bug where polylines would not update when `PolylineCollection` model matrix was updated. [#5327](https://github.com/CesiumGS/cesium/pull/5327)
- Fixed a bug where adding a ground clamped label without a position would show up at a previous label's clamped position. [#5338](https://github.com/CesiumGS/cesium/issues/5338)
- Fixed translucency bug for certain material types. [#5335](https://github.com/CesiumGS/cesium/pull/5335)
- Fix picking polylines that use a depth fail appearance. [#5337](https://github.com/CesiumGS/cesium/pull/5337)
- Fixed a crash when morphing from Columbus view to 3D. [#5311](https://github.com/CesiumGS/cesium/issues/5311)
- Fixed a bug which prevented KML descriptions with relative paths from loading. [#5352](https://github.com/CesiumGS/cesium/pull/5352)
- Fixed an issue where camera view could be invalid at the last frame of animation. [#4949](https://github.com/CesiumGS/cesium/issues/4949)
- Fixed an issue where using the depth fail material for polylines would cause a crash in Edge. [#5359](https://github.com/CesiumGS/cesium/pull/5359)
- Fixed a crash where `EllipsoidGeometry` and `EllipsoidOutlineGeometry` were given floating point values when expecting integers. [#5260](https://github.com/CesiumGS/cesium/issues/5260)
- Fixed an issue where billboards were not properly aligned. [#2487](https://github.com/CesiumGS/cesium/issues/2487)
- Fixed an issue where translucent objects could flicker when picking on mouse move. [#5307](https://github.com/CesiumGS/cesium/issues/5307)
- Fixed a bug where billboards with `sizeInMeters` set to true would move upwards when zooming out. [#5373](https://github.com/CesiumGS/cesium/issues/5373)
- Fixed a bug where `SampledProperty.setInterpolationOptions` does not ignore undefined `options`. [#3575](https://github.com/CesiumGS/cesium/issues/3575)
- Added `basePath` option to `Cesium.Model.fromGltf`. [#5320](https://github.com/CesiumGS/cesium/issues/5320)

### 1.33 - 2017-05-01

- Breaking changes
  - Removed left, right, bottom and top properties from `OrthographicFrustum`. Use `OrthographicOffCenterFrustum` instead. [#5109](https://github.com/CesiumGS/cesium/issues/5109)
- Added `GoogleEarthEnterpriseTerrainProvider` and `GoogleEarthEnterpriseImageryProvider` to read data from Google Earth Enterprise servers. [#5189](https://github.com/CesiumGS/cesium/pull/5189).
- Support for dashed polylines [#5159](https://github.com/CesiumGS/cesium/pull/5159).
  - Added `PolylineDash` Material type.
  - Added `PolylineDashMaterialProperty` to the Entity API.
  - Added CZML `polylineDash` property .
- Added `disableDepthTestDistance` to billboards, points and labels. This sets the distance to the camera where the depth test will be disabled. Setting it to zero (the default) will always enable the depth test. Setting it to `Number.POSITVE_INFINITY` will never enabled the depth test. Also added `scene.minimumDisableDepthTestDistance` to change the default value from zero. [#5166](https://github.com/CesiumGS/cesium/pull/5166)
- Added a `depthFailMaterial` property to line entities, which is the material used to render the line when it fails the depth test. [#5160](https://github.com/CesiumGS/cesium/pull/5160)
- Fixed billboards not initially clustering. [#5208](https://github.com/CesiumGS/cesium/pull/5208)
- Fixed issue with displaying `MapboxImageryProvider` default token error message. [#5191](https://github.com/CesiumGS/cesium/pull/5191)
- Fixed bug in conversion formula in `Matrix3.fromHeadingPitchRoll`. [#5195](https://github.com/CesiumGS/cesium/issues/5195)
- Upgrade FXAA to version 3.11. [#5200](https://github.com/CesiumGS/cesium/pull/5200)
- `Scene.pickPosition` now caches results per frame to increase performance. [#5117](https://github.com/CesiumGS/cesium/issues/5117)

### 1.32 - 2017-04-03

- Deprecated
  - The `left`, `right`, `bottom`, and `top` properties of `OrthographicFrustum` are deprecated and will be removed in 1.33. Use `OrthographicOffCenterFrustum` instead.
- Breaking changes
  - Removed `ArcGisImageServerTerrainProvider`.
  - The top-level `properties` in an `Entity` created by `GeoJsonDataSource` are now instances of `ConstantProperty` instead of raw values.
- Added support for an orthographic projection in 3D and Columbus view.
  - Set `projectionPicker` to `true` in the options when creating a `Viewer` to add a widget that will switch projections. [#5021](https://github.com/CesiumGS/cesium/pull/5021)
  - Call `switchToOrthographicFrustum` or `switchToPerspectiveFrustum` on `Camera` to change projections.
- Added support for custom time-varying properties in CZML. [#5105](https://github.com/CesiumGS/cesium/pull/5105).
- Added new flight parameters to `Camera.flyTo` and `Camera.flyToBoundingSphere`: `flyOverLongitude`, `flyOverLongitudeWeight`, and `pitchAdjustHeight`. [#5070](https://github.com/CesiumGS/cesium/pull/5070)
- Added the event `Viewer.trackedEntityChanged`, which is raised when the value of `viewer.trackedEntity` changes. [#5060](https://github.com/CesiumGS/cesium/pull/5060)
- Added `Camera.DEFAULT_OFFSET` for default view of objects with bounding spheres. [#4936](https://github.com/CesiumGS/cesium/pull/4936)
- Fixed an issue with `TileBoundingBox` that caused the terrain to disappear in certain places [4032](https://github.com/CesiumGS/cesium/issues/4032)
- Fixed overlapping billboard blending. [#5066](https://github.com/CesiumGS/cesium/pull/5066)
- Fixed an issue with `PinBuilder` where inset images could have low-alpha fringes against an opaque background. [#5099](https://github.com/CesiumGS/cesium/pull/5099)
- Fix billboard, point and label clustering in 2D and Columbus view. [#5136](https://github.com/CesiumGS/cesium/pull/5136)
- Fixed `GroundPrimitive` rendering in 2D and Columbus View. [#5078](https://github.com/CesiumGS/cesium/pull/5078)
- Fixed an issue with camera tracking of dynamic ellipsoids. [#5133](https://github.com/CesiumGS/cesium/pull/5133)
- Fixed issues with imagerySplitPosition and the international date line in 2D mode. [#5151](https://github.com/CesiumGS/cesium/pull/5151)
- Fixed a bug in `ModelAnimationCache` causing different animations to reference the same animation. [#5064](https://github.com/CesiumGS/cesium/pull/5064)
- `ConstantProperty` now provides `valueOf` and `toString` methods that return the constant value.
- Improved depth artifacts between opaque and translucent primitives. [#5116](https://github.com/CesiumGS/cesium/pull/5116)
- Fixed crunch compressed textures in IE11. [#5057](https://github.com/CesiumGS/cesium/pull/5057)
- Fixed a bug in `Quaternion.fromHeadingPitchRoll` that made it erroneously throw an exception when passed individual angles in an unminified / debug build.
- Fixed a bug that caused an exception in `CesiumInspectorViewModel` when using the NW / NE / SW / SE / Parent buttons to navigate to a terrain tile that is not yet loaded.
- `QuadtreePrimitive` now uses `frameState.afterRender` to fire `tileLoadProgressEvent` [#3450](https://github.com/CesiumGS/cesium/issues/3450)

### 1.31 - 2017-03-01

- Deprecated
  - The function `Quaternion.fromHeadingPitchRoll(heading, pitch, roll, result)` will be removed in 1.33. Use `Quaternion.fromHeadingPitchRoll(hpr, result)` instead where `hpr` is a `HeadingPitchRoll`. [#4896](https://github.com/CesiumGS/cesium/pull/4896)
  - The function `Transforms.headingPitchRollToFixedFrame(origin, headingPitchRoll, ellipsoid, result)` will be removed in 1.33. Use `Transforms.headingPitchRollToFixedFrame(origin, headingPitchRoll, ellipsoid, fixedFrameTransform, result)` instead where `fixedFrameTransform` is a a 4x4 transformation matrix (see `Transforms.localFrameToFixedFrameGenerator`). [#4896](https://github.com/CesiumGS/cesium/pull/4896)
  - The function `Transforms.headingPitchRollQuaternion(origin, headingPitchRoll, ellipsoid, result)` will be removed in 1.33. Use `Transforms.headingPitchRollQuaternion(origin, headingPitchRoll, ellipsoid, fixedFrameTransform, result)` instead where `fixedFrameTransform` is a a 4x4 transformation matrix (see `Transforms.localFrameToFixedFrameGenerator`). [#4896](https://github.com/CesiumGS/cesium/pull/4896)
  - `ArcGisImageServerTerrainProvider` will be removed in 1.32 due to missing TIFF support in web browsers. [#4981](https://github.com/CesiumGS/cesium/pull/4981)
- Breaking changes
  - Corrected spelling of `Color.FUCHSIA` from `Color.FUSCHIA`. [#4977](https://github.com/CesiumGS/cesium/pull/4977)
  - The enums `MIDDLE_DOUBLE_CLICK` and `RIGHT_DOUBLE_CLICK` from `ScreenSpaceEventType` have been removed. [#5052](https://github.com/CesiumGS/cesium/pull/5052)
  - Removed the function `GeometryPipeline.computeBinormalAndTangent`. Use `GeometryPipeline.computeTangentAndBitangent` instead. [#5053](https://github.com/CesiumGS/cesium/pull/5053)
  - Removed the `url` and `key` properties from `GeocoderViewModel`. [#5056](https://github.com/CesiumGS/cesium/pull/5056)
  - `BingMapsGeocoderServices` now requires `options.scene`. [#5056](https://github.com/CesiumGS/cesium/pull/5056)
- Added compressed texture support. [#4758](https://github.com/CesiumGS/cesium/pull/4758)
  - glTF models and imagery layers can now reference [KTX](https://www.khronos.org/opengles/sdk/tools/KTX/) textures and textures compressed with [crunch](https://github.com/BinomialLLC/crunch).
  - Added `loadKTX`, to load KTX textures, and `loadCRN` to load crunch compressed textures.
  - Added new `PixelFormat` and `WebGLConstants` enums from WebGL extensions `WEBGL_compressed_s3tc`, `WEBGL_compressed_texture_pvrtc`, and `WEBGL_compressed_texture_etc1`.
  - Added `CompressedTextureBuffer`.
- Added support for `Scene.pickPosition` in Columbus view and 2D. [#4990](https://github.com/CesiumGS/cesium/pull/4990)
- Added support for depth picking translucent primitives when `Scene.pickTranslucentDepth` is `true`. [#4979](https://github.com/CesiumGS/cesium/pull/4979)
- Fixed an issue where the camera would zoom past an object and flip to the other side of the globe. [#4967](https://github.com/CesiumGS/cesium/pull/4967) and [#4982](https://github.com/CesiumGS/cesium/pull/4982)
- Enable rendering `GroundPrimitives` on hardware without the `EXT_frag_depth` extension; however, this could cause artifacts for certain viewing angles. [#4930](https://github.com/CesiumGS/cesium/pull/4930)
- Added `Transforms.localFrameToFixedFrameGenerator` to generate a function that computes a 4x4 transformation matrix from a local reference frame to fixed reference frame. [#4896](https://github.com/CesiumGS/cesium/pull/4896)
- Added `Label.scaleByDistance` to control minimum/maximum label size based on distance from the camera. [#5019](https://github.com/CesiumGS/cesium/pull/5019)
- Added support to `DebugCameraPrimitive` to draw multifrustum planes. The attribute `debugShowFrustumPlanes` of `Scene` and `frustumPlanes` of `CesiumInspector` toggle this. [#4932](https://github.com/CesiumGS/cesium/pull/4932)
- Added fix to always outline KML line extrusions so that they show up properly in 2D and other straight down views. [#4961](https://github.com/CesiumGS/cesium/pull/4961)
- Improved `RectangleGeometry` by skipping unnecessary logic in the code. [#4948](https://github.com/CesiumGS/cesium/pull/4948)
- Fixed exception for polylines in 2D when rotating the map. [#4619](https://github.com/CesiumGS/cesium/issues/4619)
- Fixed an issue with constant `VertexArray` attributes not being set correctly. [#4995](https://github.com/CesiumGS/cesium/pull/4995)
- Added the event `Viewer.selectedEntityChanged`, which is raised when the value of `viewer.selectedEntity` changes. [#5043](https://github.com/CesiumGS/cesium/pull/5043)

### 1.30 - 2017-02-01

- Deprecated
  - The properties `url` and `key` will be removed from `GeocoderViewModel` in 1.31. These properties will be available on geocoder services that support them, like `BingMapsGeocoderService`.
  - The function `GeometryPipeline.computeBinormalAndTangent` will be removed in 1.31. Use `GeometryPipeline.createTangentAndBitangent` instead. [#4856](https://github.com/CesiumGS/cesium/pull/4856)
  - The enums `MIDDLE_DOUBLE_CLICK` and `RIGHT_DOUBLE_CLICK` from `ScreenSpaceEventType` have been deprecated and will be removed in 1.31. [#4910](https://github.com/CesiumGS/cesium/pull/4910)
- Breaking changes
  - Removed separate `heading`, `pitch`, `roll` parameters from `Transform.headingPitchRollToFixedFrame` and `Transform.headingPitchRollQuaternion`. Pass a `HeadingPitchRoll` object instead. [#4843](https://github.com/CesiumGS/cesium/pull/4843)
  - The property `binormal` has been renamed to `bitangent` for `Geometry` and `VertexFormat`. [#4856](https://github.com/CesiumGS/cesium/pull/4856)
  - A handful of `CesiumInspectorViewModel` properties were removed or changed from variables to functions. [#4857](https://github.com/CesiumGS/cesium/pull/4857)
  - The `ShadowMap` constructor has been made private. [#4010](https://github.com/CesiumGS/cesium/issues/4010)
- Added `sampleTerrainMostDetailed` to sample the height of an array of positions using the best available terrain data at each point. This requires a `TerrainProvider` with the `availability` property.
- Transparent parts of billboards, labels, and points no longer overwrite parts of the scene behind them. [#4886](https://github.com/CesiumGS/cesium/pull/4886)
  - Added `blendOption` property to `BillboardCollection`, `LabelCollection`, and `PointPrimitiveCollection`. The default is `BlendOption.OPAQUE_AND_TRANSLUCENT`; however, if all billboards, labels, or points are either completely opaque or completely translucent, `blendOption` can be changed to `BlendOption.OPAQUE` or `BlendOption.TRANSLUCENT`, respectively, to increase performance by up to 2x.
- Added support for custom geocoder services and autocomplete, see the [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Custom%20Geocoder.html). Added `GeocoderService`, an interface for geocoders, and `BingMapsGeocoderService` and `CartographicGeocoderService` implementations. [#4723](https://github.com/CesiumGS/cesium/pull/4723)
- Added ability to draw an `ImageryLayer` with a splitter to allow layers to only display to the left or right of a splitter. See `ImageryLayer.splitDirection`, `Scene.imagerySplitPosition`, and the [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers%20Split.html&label=Showcases).
- Fixed bug where `GroundPrimitives` where rendering incorrectly or disappearing at different zoom levels. [#4161](https://github.com/CesiumGS/cesium/issues/4161), [#4326](https://github.com/CesiumGS/cesium/issues/4326)
- `TerrainProvider` now optionally exposes an `availability` property that can be used to query the terrain level that is available at a location or in a rectangle. Currently only `CesiumTerrainProvider` exposes this property.
- Added support for WMS version 1.3 by using CRS vice SRS query string parameter to request projection. SRS is still used for older versions.
- Fixed a bug that caused all models to use the same highlight color. [#4798](https://github.com/CesiumGS/cesium/pull/4798)
- Fixed sky atmosphere from causing incorrect picking and hanging drill picking. [#4783](https://github.com/CesiumGS/cesium/issues/4783) and [#4784](https://github.com/CesiumGS/cesium/issues/4784)
- Fixed KML loading when color is an empty string. [#4826](https://github.com/CesiumGS/cesium/pull/4826)
- Fixed a bug that could cause a "readyImagery is not actually ready" exception when quickly zooming past the maximum available imagery level of an imagery layer near the poles.
- Fixed a bug that affected dynamic graphics with time-dynamic modelMatrix. [#4907](https://github.com/CesiumGS/cesium/pull/4907)
- Fixed `Geocoder` autocomplete drop down visibility in Firefox. [#4916](https://github.com/CesiumGS/cesium/issues/4916)
- Added `Rectangle.fromRadians`.
- Updated the morph so the default view in Columbus View is now angled. [#3878](https://github.com/CesiumGS/cesium/issues/3878)
- Added 2D and Columbus View support for models using the RTC extension or whose vertices are in WGS84 coordinates. [#4922](https://github.com/CesiumGS/cesium/pull/4922)
- The attribute `perInstanceAttribute` of `DebugAppearance` has been made optional and defaults to `false`.
- Fixed a bug that would cause a crash when `debugShowFrustums` is enabled with OIT. [#4864](https://github.com/CesiumGS/cesium/pull/4864)
- Added the ability to run the unit tests with a [WebGL Stub](https://github.com/CesiumGS/cesium/tree/main/Documentation/Contributors/TestingGuide#run-with-webgl-stub), which makes all WebGL calls a noop and ignores test expectations that rely on reading back from WebGL. Use the web link from the main index.html or run with `npm run test-webgl-stub`.

### 1.29 - 2017-01-02

- Improved 3D Models
  - Added the ability to blend a `Model` with a color/translucency. Added `color`, `colorBlendMode`, and `colorBlendAmount` properties to `Model`, `ModelGraphics`, and CZML. Also added `ColorBlendMode` enum. [#4547](https://github.com/CesiumGS/cesium/pull/4547)
  - Added the ability to render a `Model` with a silhouette. Added `silhouetteColor` and `silhouetteSize` properties to `Model`, `ModelGraphics`, and CZML. [#4314](https://github.com/CesiumGS/cesium/pull/4314)
- Improved Labels
  - Added new `Label` properties `showBackground`, `backgroundColor`, and `backgroundPadding` to the primitive, Entity, and CZML layers.
  - Added support for newlines (`\n`) in Cesium `Label`s and CZML. [#2402]
  - Added new enum `VerticalOrigin.BASELINE`. Previously, `VerticalOrigin.BOTTOM` would sometimes align to the baseline depending on the contents of a label.
    (https://github.com/CesiumGS/cesium/issues/2402)
- Fixed translucency in Firefox 50. [#4762](https://github.com/CesiumGS/cesium/pull/4762)
- Fixed texture rotation for `RectangleGeometry`. [#2737](https://github.com/CesiumGS/cesium/issues/2737)
- Fixed issue where billboards on terrain had an incorrect offset. [#4598](https://github.com/CesiumGS/cesium/issues/4598)
- Fixed issue where `globe.getHeight` incorrectly returned `undefined`. [#3411](https://github.com/CesiumGS/cesium/issues/3411)
- Fixed a crash when using Entity path visualization with reference properties. [#4915](https://github.com/CesiumGS/cesium/issues/4915)
- Fixed a bug that caused `GroundPrimitive` to render incorrectly on systems without the `WEBGL_depth_texture` extension. [#4747](https://github.com/CesiumGS/cesium/pull/4747)
- Fixed default Mapbox token and added a watermark to notify users that they need to sign up for their own token.
- Fixed glTF models with skinning that used `bindShapeMatrix`. [#4722](https://github.com/CesiumGS/cesium/issues/4722)
- Fixed a bug that could cause a "readyImagery is not actually ready" exception with some configurations of imagery layers.
- Fixed `Rectangle.union` to correctly account for rectangles that cross the IDL. [#4732](https://github.com/CesiumGS/cesium/pull/4732)
- Fixed tooltips for gallery thumbnails in Sandcastle [#4702].(https://github.com/CesiumGS/cesium/pull/4702)
- DataSourceClock.getValue now preserves the provided `result` properties when its properties are `undefined`. [#4029](https://github.com/CesiumGS/cesium/issues/4029)
- Added `divideComponents` function to `Cartesian2`, `Cartesian3`, and `Cartesian4`. [#4750](https://github.com/CesiumGS/cesium/pull/4750)
- Added `WebGLConstants` enum. Previously, this was part of the private Renderer API. [#4731](https://github.com/CesiumGS/cesium/pull/4731)

### 1.28 - 2016-12-01

- Improved terrain/imagery load ordering, especially when the terrain is already fully loaded and a new imagery layer is loaded. This results in a 25% reduction in load times in many cases. [#4616](https://github.com/CesiumGS/cesium/pull/4616)
- Improved `Billboard`, `Label`, and `PointPrimitive` visual quality. [#4675](https://github.com/CesiumGS/cesium/pull/4675)
  - Corrected odd-width and odd-height billboard sizes from being incorrectly rounded up.
  - Changed depth testing from `LESS` to `LEQUAL`, allowing label glyphs of equal depths to overlap.
  - Label glyph positions have been adjusted and corrected.
  - `TextureAtlas.borderWidthInPixels` has always been applied to the upper and right edges of each internal texture, but is now also applied to the bottom and left edges of the entire TextureAtlas, guaranteeing borders on all sides regardless of position within the atlas.
- Fall back to packing floats into an unsigned byte texture when floating point textures are unsupported. [#4563](https://github.com/CesiumGS/cesium/issues/4563)
- Added support for saving html and css in GitHub Gists. [#4125](https://github.com/CesiumGS/cesium/issues/4125)
- Fixed `Cartographic.fromCartesian` when the cartesian is not on the ellipsoid surface. [#4611](https://github.com/CesiumGS/cesium/issues/4611)

### 1.27 - 2016-11-01

- Deprecated
  - Individual heading, pitch, and roll options to `Transforms.headingPitchRollToFixedFrame` and `Transforms.headingPitchRollQuaternion` have been deprecated and will be removed in 1.30. Pass the new `HeadingPitchRoll` object instead. [#4498](https://github.com/CesiumGS/cesium/pull/4498)
- Breaking changes
  - The `scene` parameter for creating `BillboardVisualizer`, `LabelVisualizer`, and `PointVisualizer` has been removed. Instead, pass an instance of `EntityCluster`. [#4514](https://github.com/CesiumGS/cesium/pull/4514)
- Fixed an issue where a billboard entity would not render after toggling the show property. [#4408](https://github.com/CesiumGS/cesium/issues/4408)
- Fixed a crash when zooming from touch input on viewer initialization. [#4177](https://github.com/CesiumGS/cesium/issues/4177)
- Fixed a crash when clustering is enabled, an entity has a label graphics defined, but the label isn't visible. [#4414](https://github.com/CesiumGS/cesium/issues/4414)
- Added the ability for KML files to load network links to other KML files within the same KMZ archive. [#4477](https://github.com/CesiumGS/cesium/issues/4477)
- `KmlDataSource` and `GeoJsonDataSource` were not honoring the `clampToGround` option for billboards and labels and was instead always clamping, reducing performance in cases when it was unneeded. [#4459](https://github.com/CesiumGS/cesium/pull/4459)
- Fixed `KmlDataSource` features to respect `timespan` and `timestamp` properties of its parents (e.g. Folders or NetworkLinks). [#4041](https://github.com/CesiumGS/cesium/issues/4041)
- Fixed a `KmlDataSource` bug where features had duplicate IDs and only one was drawn. [#3941](https://github.com/CesiumGS/cesium/issues/3941)
- `GeoJsonDataSource` now treats null crs values as a no-op instead of failing to load. [#4456](https://github.com/CesiumGS/cesium/pull/4456)
- `GeoJsonDataSource` now gracefully handles missing style icons instead of failing to load. [#4452](https://github.com/CesiumGS/cesium/pull/4452)
- Added `HeadingPitchRoll` [#4047](https://github.com/CesiumGS/cesium/pull/4047)
  - `HeadingPitchRoll.fromQuaternion` function for retrieving heading-pitch-roll angles from a quaternion.
  - `HeadingPitchRoll.fromDegrees` function that returns a new HeadingPitchRoll instance from angles given in degrees.
  - `HeadingPitchRoll.clone` function to duplicate HeadingPitchRoll instance.
  - `HeadingPitchRoll.equals` and `HeadingPitchRoll.equalsEpsilon` functions for comparing two instances.
  - Added `Matrix3.fromHeadingPitchRoll` Computes a 3x3 rotation matrix from the provided headingPitchRoll.
- Fixed primitive bounding sphere bug that would cause a crash when loading data sources. [#4431](https://github.com/CesiumGS/cesium/issues/4431)
- Fixed `BoundingSphere` computation for `Primitive` instances with a modelMatrix. [#4428](https://github.com/CesiumGS/cesium/issues/4428)
- Fixed a bug with rotated, textured rectangles. [#4430](https://github.com/CesiumGS/cesium/pull/4430)
- Added the ability to specify retina options, such as `@2x.png`, via the `MapboxImageryProvider` `format` option. [#4453](https://github.com/CesiumGS/cesium/pull/4453).
- Fixed a crash that could occur when specifying an imagery provider's `rectangle` option. [https://github.com/CesiumGS/cesium/issues/4377](https://github.com/CesiumGS/cesium/issues/4377)
- Fixed a crash that would occur when using dynamic `distanceDisplayCondition` properties. [#4403](https://github.com/CesiumGS/cesium/pull/4403)
- Fixed several bugs that lead to billboards and labels being improperly clamped to terrain. [#4396](https://github.com/CesiumGS/cesium/issues/4396), [#4062](https://github.com/CesiumGS/cesium/issues/4062)
- Fixed a bug affected models with multiple meshes without indices. [#4237](https://github.com/CesiumGS/cesium/issues/4237)
- Fixed a glTF transparency bug where `blendFuncSeparate` parameters were loaded in the wrong order. [#4435](https://github.com/CesiumGS/cesium/pull/4435)
- Fixed a bug where creating a custom geometry with attributes and indices that have values that are not a typed array would cause a crash. [#4419](https://github.com/CesiumGS/cesium/pull/4419)
- Fixed a bug when morphing from 2D to 3D. [#4388](https://github.com/CesiumGS/cesium/pull/4388)
- Fixed `RectangleGeometry` rotation when the rectangle is close to the international date line [#3874](https://github.com/CesiumGS/cesium/issues/3874)
- Added `clusterBillboards`, `clusterLabels`, and `cluserPoints` properties to `EntityCluster` to selectively cluster screen space entities.
- Prevent execution of default device/browser behavior when handling "pinch" touch event/gesture. [#4518](https://github.com/CesiumGS/cesium/pull/4518).
- Fixed a shadow aliasing issue where polygon offset was not being applied. [#4559](https://github.com/CesiumGS/cesium/pull/4559)
- Removed an unnecessary reprojection of Web Mercator imagery tiles to the Geographic projection on load. This should improve both visual quality and load performance slightly. [#4339](https://github.com/CesiumGS/cesium/pull/4339)
- Added `Transforms.northUpEastToFixedFrame` to compute a 4x4 local transformation matrix from a reference frame with a north-west-up axes.
- Improved `Geocoder` usability by selecting text on click [#4464](https://github.com/CesiumGS/cesium/pull/4464)
- Added `Rectangle.simpleIntersection` which is an optimized version of `Rectangle.intersection` for more constrained input. [#4339](https://github.com/CesiumGS/cesium/pull/4339)
- Fixed warning when using Webpack. [#4467](https://github.com/CesiumGS/cesium/pull/4467)

### 1.26 - 2016-10-03

- Deprecated
  - The `scene` parameter for creating `BillboardVisualizer`, `LabelVisualizer`, and `PointVisualizer` has been deprecated and will be removed in 1.28. Instead, pass an instance of `EntityCluster`.
- Breaking changes
  - Vertex texture fetch is now required to be supported to render polylines. Maximum vertex texture image units must be greater than zero.
  - Removed `castShadows` and `receiveShadows` properties from `Model`, `Primitive`, and `Globe`. Instead, use `shadows` with the `ShadowMode` enum, e.g. `model.shadows = ShadowMode.ENABLED`.
  - `Viewer.terrainShadows` now uses the `ShadowMode` enum instead of a Boolean, e.g. `viewer.terrainShadows = ShadowMode.RECEIVE_ONLY`.
- Added support for clustering `Billboard`, `Label` and `Point` entities. [#4240](https://github.com/CesiumGS/cesium/pull/4240)
- Added `DistanceDisplayCondition`s to all primitives to determine the range interval from the camera for when it will be visible.
- Removed the default gamma correction for Bing Maps aerial imagery, because it is no longer an improvement to current versions of the tiles. To restore the previous look, set the `defaultGamma` property of your `BingMapsImageryProvider` instance to 1.3.
- Fixed a bug that could lead to incorrect terrain heights when using `HeightmapTerrainData` with an encoding in which actual heights were equal to the minimum representable height.
- Fixed a bug in `AttributeCompression.compressTextureCoordinates` and `decompressTextureCoordinates` that could cause a small inaccuracy in the encoded texture coordinates.
- Fixed a bug where viewing a model with transparent geometry would cause a crash. [#4378](https://github.com/CesiumGS/cesium/issues/4378)
- Added `TrustedServer` collection that controls which servers should have `withCredential` set to `true` on XHR Requests.
- Fixed billboard rotation when sized in meters. [#3979](https://github.com/CesiumGS/cesium/issues/3979)
- Added `backgroundColor` and `borderWidth` properties to `writeTextToCanvas`.
- Fixed timeline touch events. [#4305](https://github.com/CesiumGS/cesium/pull/4305)
- Fixed a bug that was incorrectly clamping Latitudes in KML <GroundOverlay>(s) to the range -PI..PI. Now correctly clamps to -PI/2..PI/2.
- Added `CesiumMath.clampToLatitudeRange`. A convenience function to clamp a passed radian angle to valid Latitudes.
- Added `DebugCameraPrimitive` to visualize the view frustum of a camera.

### 1.25 - 2016-09-01

- Breaking changes
  - The number and order of arguments passed to `KmlDataSource` `unsupportedNodeEvent` listeners have changed to allow better handling of unsupported KML Features.
  - Changed billboards and labels that are clamped to terrain to have the `verticalOrigin` set to `CENTER` by default instead of `BOTTOM`.
- Deprecated
  - Deprecated `castShadows` and `receiveShadows` properties from `Model`, `Primitive`, and `Globe`. They will be removed in 1.26. Use `shadows` instead with the `ShadowMode` enum, e.g. `model.shadows = ShadowMode.ENABLED`.
  - `Viewer.terrainShadows` now uses the `ShadowMode` enum instead of a Boolean, e.g. `viewer.terrainShadows = ShadowMode.RECEIVE_ONLY`. Boolean support will be removed in 1.26.
- Updated the online [model converter](http://cesiumjs.org/convertmodel.html) to convert OBJ models to glTF with [obj2gltf](https://github.com/CesiumGS/OBJ2GLTF), as well as optimize existing glTF models with the [gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline). Added an option to bake ambient occlusion onto the glTF model. Also added an option to compress geometry using the glTF [WEB3D_quantized_attributes](https://github.com/KhronosGroup/glTF/blob/master/extensions/Vendor/WEB3D_quantized_attributes/README.md) extension.
- Improve label quality for oblique and italic fonts. [#3782](https://github.com/CesiumGS/cesium/issues/3782)
- Added `shadows` property to the entity API for `Box`, `Corridor`, `Cylinder`, `Ellipse`, `Ellipsoid`, `Polygon`, `Polyline`, `PoylineVolume`, `Rectangle`, and `Wall`. [#4005](https://github.com/CesiumGS/cesium/pull/4005)
- Added `Camera.cancelFlight` to cancel the existing camera flight if it exists.
- Fix overlapping camera flights by always cancelling the previous flight when a new one is created.
- Camera flights now disable collision with the terrain until all of the terrain in the area has finished loading. This prevents the camera from being moved to be above lower resolution terrain when flying to a position close to higher resolution terrain. [#4075](https://github.com/CesiumGS/cesium/issues/4075)
- Fixed a crash that would occur if quickly toggling imagery visibility. [#4083](https://github.com/CesiumGS/cesium/issues/4083)
- Fixed an issue causing an error if KML has a clamped to ground LineString with color. [#4131](https://github.com/CesiumGS/cesium/issues/4131)
- Added logic to `KmlDataSource` defaulting KML Feature node to hidden unless all ancestors are visible. This better matches the KML specification.
- Fixed position of KML point features with an altitude mode of `relativeToGround` and `clampToGround`.
- Added `GeocoderViewModel.keepExpanded` which when set to true will always keep the Geocoder in its expanded state.
- Added support for `INT` and `UNSIGNED_INT` in `ComponentDatatype`.
- Added `ComponentDatatype.fromName` for getting a `ComponentDatatype` from its name.
- Fixed a crash caused by draping dynamic geometry over terrain. [#4255](https://github.com/CesiumGS/cesium/pull/4255)

### 1.24 - 2016-08-01

- Added support in CZML for expressing `BillboardGraphics.alignedAxis` as the velocity vector of an entity, using `velocityReference` syntax.
- Added `urlSchemeZeroPadding` property to `UrlTemplateImageryProvider` to allow the numeric parts of a URL, such as `{x}`, to be padded with zeros to make them a fixed width.
- Added leap second just prior to January 2017. [#4092](https://github.com/CesiumGS/cesium/issues/4092)
- Fixed an exception that would occur when switching to 2D view when shadows are enabled. [#4051](https://github.com/CesiumGS/cesium/issues/4051)
- Fixed an issue causing entities to disappear when updating multiple entities simultaneously. [#4096](https://github.com/CesiumGS/cesium/issues/4096)
- Normalizing the velocity vector produced by `VelocityVectorProperty` is now optional.
- Pack functions now return the result array [#4156](https://github.com/CesiumGS/cesium/pull/4156)
- Added optional `rangeMax` parameter to `Math.toSNorm` and `Math.fromSNorm`. [#4121](https://github.com/CesiumGS/cesium/pull/4121)
- Removed `MapQuest OpenStreetMap` from the list of demo base layers since direct tile access has been discontinued. See the [MapQuest Developer Blog](http://devblog.mapquest.com/2016/06/15/modernization-of-mapquest-results-in-changes-to-open-tile-access/) for details.
- Fixed PolylinePipeline.generateArc to accept an array of heights when there's only one position [#4155](https://github.com/CesiumGS/cesium/pull/4155)

### 1.23 - 2016-07-01

- Breaking changes
  - `GroundPrimitive.initializeTerrainHeights()` must be called and have the returned promise resolve before a `GroundPrimitive` can be added synchronously.
- Added terrain clamping to entities, KML, and GeoJSON
  - Added `heightReference` property to point, billboard and model entities.
  - Changed corridor, ellipse, polygon and rectangle entities to conform to terrain by using a `GroundPrimitive` if its material is a `ColorMaterialProperty` instance and it doesn't have a `height` or `extrudedHeight`. Entities with any other type of material are not clamped to terrain.
  - `KMLDataSource`
    - Point and Model features will always respect `altitudeMode`.
    - Added `clampToGround` property. When `true`, clamps `Polygon`, `LineString` and `LinearRing` features to the ground if their `altitudeMode` is `clampToGround`. For this case, lines use a corridor instead of a polyline.
  - `GeoJsonDataSource`
    - Points with a height will be drawn at that height; otherwise, they will be clamped to the ground.
    - Added `clampToGround` property. When `true`, clamps `Polygon` and `LineString` features to the ground. For this case, lines use a corridor instead of a polyline.
  - Added [Ground Clamping Sandcastle example](https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Ground%20Clamping.html&label=Showcases).
- Improved performance and accuracy of polygon triangulation by using the [earcut](https://github.com/mapbox/earcut) library. Loading a GeoJSON with polygons for each country was 2x faster.
- Fix some large polygon triangulations. [#2788](https://github.com/CesiumGS/cesium/issues/2788)
- Added support for the glTF extension [WEB3D_quantized_attributes](https://github.com/KhronosGroup/glTF/blob/master/extensions/Vendor/WEB3D_quantized_attributes/README.md). [#3241](https://github.com/CesiumGS/cesium/issues/3241)
- Added CZML support for `Box`, `Corridor` and `Cylinder`. Added new CZML properties:
  - `Billboard`: `width`, `height`, `heightReference`, `scaleByDistance`, `translucencyByDistance`, `pixelOffsetScaleByDistance`, `imageSubRegion`
  - `Label`: `heightReference`, `translucencyByDistance`, `pixelOffsetScaleByDistance`
  - `Model`: `heightReference`, `maximumScale`
  - `Point`: `heightReference`, `scaleByDistance`, `translucencyByDistance`
  - `Ellipsoid`: `subdivisions`, `stackPartitions`, `slicePartitions`
- Added `rotatable2D` property to to `Scene`, `CesiumWidget` and `Viewer` to enable map rotation in 2D mode. [#3897](https://github.com/CesiumGS/cesium/issues/3897)
- `Camera.setView` and `Camera.flyTo` now use the `orientation.heading` parameter in 2D if the map is rotatable.
- Added `Camera.changed` event that will fire whenever the camera has changed more than `Camera.percentageChanged`. `percentageChanged` is in the range [0, 1].
- Zooming in toward a target point now keeps the target point at the same screen position. [#4016](https://github.com/CesiumGS/cesium/pull/4016)
- Improved `GroundPrimitive` performance.
- Some incorrect KML (specifically KML that reuses IDs) is now parsed correctly.
- Added `unsupportedNodeEvent` to `KmlDataSource` that is fired whenever an unsupported node is encountered.
- `Clock` now keeps its configuration settings self-consistent. Previously, this was done by `AnimationViewModel` and could become inconsistent in certain cases. [#4007](https://github.com/CesiumGS/cesium/pull/4007)
- Updated [Google Cardboard Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cardboard.html&label=Showcase).
- Added [hot air balloon](https://github.com/CesiumGS/cesium/tree/main/Apps/SampleData/models/CesiumBalloon) sample model.
- Fixed handling of sampled Rectangle coordinates in CZML. [#4033](https://github.com/CesiumGS/cesium/pull/4033)
- Fix "Cannot read property 'x' of undefined" error when calling SceneTransforms.wgs84ToWindowCoordinates in certain cases. [#4022](https://github.com/CesiumGS/cesium/pull/4022)
- Re-enabled mouse inputs after a specified number of milliseconds past the most recent touch event.
- Exposed a parametric ray-triangle intersection test to the API as `IntersectionTests.rayTriangleParametric`.
- Added `packArray` and `unpackArray` functions to `Cartesian2`, `Cartesian3`, and `Cartesian4`.

### 1.22.2 - 2016-06-14

- This is an npm only release to fix the improperly published 1.22.1. There were no code changes.

### 1.22.1 - 2016-06-13

- Fixed default Bing Key and added a watermark to notify users that they need to sign up for their own key.

### 1.22 - 2016-06-01

- Breaking changes
  - `KmlDataSource` now requires `options.camera` and `options.canvas`.
- Added shadows
  - See the Sandcastle demo: [Shadows](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Shadows.html&label=Showcases).
  - Added `Viewer.shadows` and `Viewer.terrainShadows`. Both are off by default.
  - Added `Viewer.shadowMap` and `Scene.shadowMap` for accessing the scene's shadow map.
  - Added `castShadows` and `receiveShadows` properties to `Model` and `Entity.model`, and options to the `Model` constructor and `Model.fromGltf`.
  - Added `castShadows` and `receiveShadows` properties to `Primitive`, and options to the `Primitive` constructor.
  - Added `castShadows` and `receiveShadows` properties to `Globe`.
- Added `heightReference` to models so they can be drawn on terrain.
- Added support for rendering models in 2D and Columbus view.
- Added option to enable sun position based atmosphere color when `Globe.enableLighting` is `true`. [3439](https://github.com/CesiumGS/cesium/issues/3439)
- Improved KML NetworkLink compatibility by supporting the `Url` tag. [#3895](https://github.com/CesiumGS/cesium/pull/3895).
- Added `VelocityVectorProperty` so billboard's aligned axis can follow the velocity vector. [#3908](https://github.com/CesiumGS/cesium/issues/3908)
- Improve memory management for entity billboard/label/point/path visualization.
- Added `terrainProviderChanged` event to `Scene` and `Globe`
- Added support for hue, saturation, and brightness color shifts in the atmosphere in `SkyAtmosphere`. See the new Sandcastle example: [Atmosphere Color](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Atmosphere%20Color.html&label=Showcases). [#3439](https://github.com/CesiumGS/cesium/issues/3439)
- Fixed exaggerated terrain tiles disappearing. [#3676](https://github.com/CesiumGS/cesium/issues/3676)
- Fixed a bug that could cause incorrect normals to be computed for exaggerated terrain, especially for low-detail tiles. [#3904](https://github.com/CesiumGS/cesium/pull/3904)
- Fixed a bug that was causing errors to be thrown when picking and terrain was enabled. [#3779](https://github.com/CesiumGS/cesium/issues/3779)
- Fixed a bug that was causing the atmosphere to disappear when only atmosphere is visible. [#3347](https://github.com/CesiumGS/cesium/issues/3347)
- Fixed infinite horizontal 2D scrolling in IE/Edge. [#3893](https://github.com/CesiumGS/cesium/issues/3893)
- Fixed a bug that would cause a crash is the camera was on the IDL in 2D. [#3951](https://github.com/CesiumGS/cesium/issues/3951)
- Fixed issue where a repeating model animation doesn't play when the clock is set to a time before the model was created. [#3932](https://github.com/CesiumGS/cesium/issues/3932)
- Fixed `Billboard.computeScreenSpacePosition` returning the wrong y coordinate. [#3920](https://github.com/CesiumGS/cesium/issues/3920)
- Fixed issue where labels were disappearing. [#3730](https://github.com/CesiumGS/cesium/issues/3730)
- Fixed issue where billboards on terrain didn't always update when the terrain provider was changed. [#3921](https://github.com/CesiumGS/cesium/issues/3921)
- Fixed issue where `Matrix4.fromCamera` was taking eye/target instead of position/direction. [#3927](https://github.com/CesiumGS/cesium/issues/3927)
- Added `Scene.nearToFarDistance2D` that determines the size of each frustum of the multifrustum in 2D.
- Added `Matrix4.computeView`.
- Added `CullingVolume.fromBoundingSphere`.
- Added `debugShowShadowVolume` to `GroundPrimitive`.
- Fix issue with disappearing tiles on Linux. [#3889](https://github.com/CesiumGS/cesium/issues/3889)

### 1.21 - 2016-05-02

- Breaking changes
  - Removed `ImageryMaterialProperty.alpha`. Use `ImageryMaterialProperty.color.alpha` instead.
  - Removed `OpenStreetMapImageryProvider`. Use `createOpenStreetMapImageryProvider` instead.
- Added ability to import and export Sandcastle example using GitHub Gists. [#3795](https://github.com/CesiumGS/cesium/pull/3795)
- Added `PolygonGraphics.closeTop`, `PolygonGraphics.closeBottom`, and `PolygonGeometry` options for creating an extruded polygon without a top or bottom. [#3879](https://github.com/CesiumGS/cesium/pull/3879)
- Added support for polyline arrow material to `CzmlDataSource` [#3860](https://github.com/CesiumGS/cesium/pull/3860)
- Fixed issue causing the sun not to render. [#3801](https://github.com/CesiumGS/cesium/pull/3801)
- Fixed issue where `Camera.flyTo` would not work with a rectangle in 2D. [#3688](https://github.com/CesiumGS/cesium/issues/3688)
- Fixed issue causing the fog to go dark and the atmosphere to flicker when the camera clips the globe. [#3178](https://github.com/CesiumGS/cesium/issues/3178)
- Fixed a bug that caused an exception and rendering to stop when using `ArcGisMapServerImageryProvider` to connect to a MapServer specifying the Web Mercator projection and a fullExtent bigger than the valid extent of the projection. [#3854](https://github.com/CesiumGS/cesium/pull/3854)
- Fixed issue causing an exception when switching scene modes with an active KML network link. [#3865](https://github.com/CesiumGS/cesium/issues/3865)

### 1.20 - 2016-04-01

- Breaking changes
  - Removed `TileMapServiceImageryProvider`. Use `createTileMapServiceImageryProvider` instead.
  - Removed `GroundPrimitive.geometryInstance`. Use `GroundPrimitive.geometryInstances` instead.
  - Removed `definedNotNull`. Use `defined` instead.
  - Removed ability to rotate the map in 2D due to the new infinite 2D scrolling feature.
- Deprecated
  - Deprecated `ImageryMaterialProperty.alpha`. It will be removed in 1.21. Use `ImageryMaterialProperty.color.alpha` instead.
- Added infinite horizontal scrolling in 2D.
- Added a code example to Sandcastle for the [new 1-meter Pennsylvania terrain service](http://cesiumjs.org/2016/03/15/New-Cesium-Terrain-Service-Covering-Pennsylvania/).
- Fixed loading for KML `NetworkLink` to not append a `?` if there isn't a query string.
- Fixed handling of non-standard KML `styleUrl` references within a `StyleMap`.
- Fixed issue in KML where StyleMaps from external documents fail to load.
- Added translucent and colored image support to KML ground overlays
- Fix bug when upsampling exaggerated terrain where the terrain heights were exaggerated at twice the value. [#3607](https://github.com/CesiumGS/cesium/issues/3607)
- All external urls are now https by default to make Cesium work better with non-server-based applications. [#3650](https://github.com/CesiumGS/cesium/issues/3650)
- `GeoJsonDataSource` now handles CRS `urn:ogc:def:crs:EPSG::4326`
- Fixed `TimeIntervalCollection.removeInterval` bug that resulted in too many intervals being removed.
- `GroundPrimitive` throws a `DeveloperError` when passed an unsupported geometry type instead of crashing.
- Fix issue with billboard collections that have at least one billboard with an aligned axis and at least one billboard without an aligned axis. [#3318](https://github.com/CesiumGS/cesium/issues/3318)
- Fix a race condition that would cause the terrain to continue loading and unloading or cause a crash when changing terrain providers. [#3690](https://github.com/CesiumGS/cesium/issues/3690)
- Fix issue where the `GroundPrimitive` volume was being clipped by the far plane. [#3706](https://github.com/CesiumGS/cesium/issues/3706)
- Fixed issue where `Camera.computeViewRectangle` was incorrect when crossing the international date line. [#3717](https://github.com/CesiumGS/cesium/issues/3717)
- Added `Rectangle` result parameter to `Camera.computeViewRectangle`.
- Fixed a reentrancy bug in `EntityCollection.collectionChanged`. [#3739](https://github.com/CesiumGS/cesium/pull/3739)
- Fixed a crash that would occur if you added and removed an `Entity` with a path without ever actually rendering it. [#3738](https://github.com/CesiumGS/cesium/pull/3738)
- Fixed issue causing parts of geometry and billboards/labels to be clipped. [#3748](https://github.com/CesiumGS/cesium/issues/3748)
- Fixed bug where transparent image materials were drawn black.
- Fixed `Color.fromCssColorString` from reusing the input `result` alpha value in some cases.

### 1.19 - 2016-03-01

- Breaking changes
  - `PolygonGeometry` now changes the input `Cartesian3` values of `options.positions` so that they are on the ellipsoid surface. This only affects polygons created synchronously with `options.perPositionHeight = false` when the positions have a non-zero height and the same positions are used for multiple entities. In this case, make a copy of the `Cartesian3` values used for the polygon positions.
- Deprecated
  - Deprecated `KmlDataSource` taking a proxy object. It will throw an exception in 1.21. It now should take a `options` object with required `camera` and `canvas` parameters.
  - Deprecated `definedNotNull`. It will be removed in 1.20. Use `defined` instead, which now checks for `null` as well as `undefined`.
- Improved KML support.
  - Added support for `NetworkLink` refresh modes `onInterval`, `onExpire` and `onStop`. Includes support for `viewboundScale`, `viewFormat`, `httpQuery`.
  - Added partial support for `NetworkLinkControl` including `minRefreshPeriod`, `cookie` and `expires`.
  - Added support for local `StyleMap`. The `highlight` style is still ignored.
  - Added support for `root://` URLs.
  - Added more warnings for unsupported features.
  - Improved style processing in IE.
- `Viewer.zoomTo` and `Viewer.flyTo` now accept an `ImageryLayer` instance as a valid parameter and will zoom to the extent of the imagery.
- Added `Camera.flyHome` function for resetting the camera to the home view.
- `Camera.flyTo` now honors max and min zoom settings in `ScreenSpaceCameraController`.
- Added `show` property to `CzmlDataSource`, `GeoJsonDataSource`, `KmlDataSource`, `CustomDataSource`, and `EntityCollection` for easily toggling display of entire data sources.
- Added `owner` property to `CompositeEntityCollection`.
- Added `DataSouceDisplay.ready` for determining whether or not static data associated with the Entity API has been rendered.
- Fix an issue when changing a billboard's position property multiple times per frame. [#3511](https://github.com/CesiumGS/cesium/pull/3511)
- Fixed texture coordinates for polygon with position heights.
- Fixed issue that kept `GroundPrimitive` with an `EllipseGeometry` from having a `rotation`.
- Fixed crash caused when drawing `CorridorGeometry` and `CorridorOutlineGeometry` synchronously.
- Added the ability to create empty geometries. Instead of throwing `DeveloperError`, `undefined` is returned.
- Fixed flying to `latitude, longitude, height` in the Geocoder.
- Fixed bug in `IntersectionTests.lineSegmentSphere` where the ray origin was not set.
- Added `length` to `Matrix2`, `Matrix3` and `Matrix4` so these can be used as array-like objects.
- Added `Color.add`, `Color.subtract`, `Color.multiply`, `Color.divide`, `Color.mod`, `Color.multiplyByScalar`, and `Color.divideByScalar` functions to perform arithmetic operations on colors.
- Added optional `result` parameter to `Color.fromRgba`, `Color.fromHsl` and `Color.fromCssColorString`.
- Fixed bug causing `navigator is not defined` reference error when Cesium is used with Node.js.
- Upgraded Knockout from version 3.2.0 to 3.4.0.
- Fixed hole that appeared in the top of in dynamic ellipsoids

### 1.18 - 2016-02-01

- Breaking changes
  - Removed support for `CESIUM_binary_glTF`. Use `KHR_binary_glTF` instead, which is the default for the online [COLLADA-to-glTF converter](http://cesiumjs.org/convertmodel.html).
- Deprecated
  - Deprecated `GroundPrimitive.geometryInstance`. It will be removed in 1.20. Use `GroundPrimitive.geometryInstances` instead.
  - Deprecated `TileMapServiceImageryProvider`. It will be removed in 1.20. Use `createTileMapServiceImageryProvider` instead.
- Reduced the amount of CPU memory used by terrain by ~25% in Chrome.
- Added a Sandcastle example to "star burst" overlapping billboards and labels.
- Added `VRButton` which is a simple, single-button widget that toggles VR mode. It is off by default. To enable the button, set the `vrButton` option to `Viewer` to `true`. Only Cardboard for mobile is supported. More VR devices will be supported when the WebVR API is more stable.
- Added `Scene.useWebVR` to switch the scene to use stereoscopic rendering.
- Cesium now honors `window.devicePixelRatio` on browsers that support the CSS `imageRendering` attribute. This greatly improves performance on mobile devices and high DPI displays by rendering at the browser-recommended resolution. This also reduces bandwidth usage and increases battery life in these cases. To enable the previous behavior, use the following code:
  ```javascript
  if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
    viewer.resolutionScale = window.devicePixelRatio;
  }
  ```
- `GroundPrimitive` now supports batching geometry for better performance.
- Improved compatibility with glTF KHR_binary_glTF and KHR_materials_common extensions
- Added `ImageryLayer.getViewableRectangle` to make it easy to get the effective bounds of an imagery layer.
- Improved compatibility with glTF KHR_binary_glTF and KHR_materials_common extensions
- Fixed a picking issue that sometimes prevented objects being selected. [#3386](https://github.com/CesiumGS/cesium/issues/3386)
- Fixed cracking between tiles in 2D. [#3486](https://github.com/CesiumGS/cesium/pull/3486)
- Fixed creating bounding volumes for `GroundPrimitive`s whose containing rectangle has a width greater than pi.
- Fixed incorrect texture coordinates for polygons with large height.
- Fixed camera.flyTo not working when in 2D mode and only orientation changes
- Added `UrlTemplateImageryProvider.reinitialize` for changing imagery provider options without creating a new instance.
- `UrlTemplateImageryProvider` now accepts a promise to an `options` object in addition to taking the object directly.
- Fixed a bug that prevented WMS feature picking from working with THREDDS XML and msGMLOutput in Internet Explorer 11.
- Added `Scene.useDepthPicking` to enable or disable picking using the depth buffer. [#3390](https://github.com/CesiumGS/cesium/pull/3390)
- Added `BoundingSphere.fromEncodedCartesianVertices` to create bounding volumes from parallel arrays of the upper and lower bits of `EncodedCartesian3`s.
- Added helper functions: `getExtensionFromUri`, `getAbsoluteUri`, and `Math.logBase`.
- Added `Rectangle.union` and `Rectangle.expand`.
- TMS support now works with newer versions of gdal2tiles.py generated layers. `createTileMapServiceImageryProvider`. Tilesets generated with older gdal2tiles.py versions may need to have the `flipXY : true` option set to load correctly.

### 1.17 - 2016-01-04

- Breaking changes
  - Removed `Camera.viewRectangle`. Use `Camera.setView({destination: rectangle})` instead.
  - Removed `RectanglePrimitive`. Use `RectangleGeometry` or `Entity.rectangle` instead.
  - Removed `Polygon`. Use `PolygonGeometry` or `Entity.polygon` instead.
  - Removed `OrthographicFrustum.getPixelSize`. Use `OrthographicFrustum.getPixelDimensions` instead.
  - Removed `PerspectiveFrustum.getPixelSize`. Use `PerspectiveFrustum.getPixelDimensions` instead.
  - Removed `PerspectiveOffCenterFrustum.getPixelSize`. Use `PerspectiveOffCenterFrustum.getPixelDimensions` instead.
  - Removed `Scene\HeadingPitchRange`. Use `Core\HeadingPitchRange` instead.
  - Removed `jsonp`. Use `loadJsonp` instead.
  - Removed `HeightmapTessellator` from the public API. It is an implementation details.
  - Removed `TerrainMesh` from the public API. It is an implementation details.
- Reduced the amount of GPU and CPU memory used by terrain by using [compression](http://cesiumjs.org/2015/12/18/Terrain-Quantization/). The CPU memory was reduced by up to 40%.
- Added the ability to manipulate `Model` node transformations via CZML and the Entity API. See the new Sandcastle example: [CZML Model - Node Transformations](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=CZML%20Model%20-%20Node%20Transformations.html&label=CZML). [#3316](https://github.com/CesiumGS/cesium/pull/3316)
- Added `Globe.tileLoadProgressEvent`, which is raised when the length of the tile load queue changes, enabling incremental loading indicators.
- Added support for msGMLOutput and Thredds server feature information formats to `GetFeatureInfoFormat` and `WebMapServiceImageryProvider`.
- Added dynamic `enableFeaturePicking` toggle to all ImageryProviders that support feature picking.
- Fixed disappearing terrain while fog is active. [#3335](https://github.com/CesiumGS/cesium/issues/3335)
- Fixed short segments in `CorridorGeometry` and `PolylineVolumeGeometry`. [#3293](https://github.com/CesiumGS/cesium/issues/3293)
- Fixed `CorridorGeometry` with nearly colinear points. [#3320](https://github.com/CesiumGS/cesium/issues/3320)
- Added missing points to `EllipseGeometry` and `EllipseOutlineGeometry`. [#3078](https://github.com/CesiumGS/cesium/issues/3078)
- `Rectangle.fromCartographicArray` now uses the smallest rectangle regardess of whether or not it crosses the international date line. [#3227](https://github.com/CesiumGS/cesium/issues/3227)
- Added `TranslationRotationScale` property, which represents an affine transformation defined by a translation, rotation, and scale.
- Added `Matrix4.fromTranslationRotationScale`.
- Added `NodeTransformationProperty`, which is a `Property` value that is defined by independent `translation`, `rotation`, and `scale` `Property` instances.
- Added `PropertyBag`, which is a `Property` whose value is a key-value mapping of property names to the computed value of other properties.
- Added `ModelGraphics.runAnimations` which is a boolean `Property` indicating if all model animations should be started after the model is loaded.
- Added `ModelGraphics.nodeTransformations` which is a `PropertyBag` of `TranslationRotationScale` properties to be applied to a loaded model.
- Added CZML support for new `runAnimations` and `nodeTransformations` properties on the `model` packet.

### 1.16 - 2015-12-01

- Deprecated
  - Deprecated `HeightmapTessellator`. It will be removed in 1.17.
  - Deprecated `TerrainMesh`. It will be removed in 1.17.
  - Deprecated `OpenStreetMapImageryProvider`. It will be removed in 1.18. Use `createOpenStreetMapImageryProvider` instead.
- Improved terrain performance by up to 35%. Added support for fog near the horizon, which improves performance by rendering less terrain tiles and reduces terrain tile requests. This is enabled by default. See `Scene.fog` for options. [#3154](https://github.com/CesiumGS/cesium/pull/3154)
- Added terrain exaggeration. Enabled on viewer creation with the exaggeration scalar as the `terrainExaggeration` option.
- Added support for incrementally loading textures after a Model is ready. This allows the Model to be visible as soon as possible while its textures are loaded in the background.
- `ImageMaterialProperty.image` now accepts an `HTMLVideoElement`. You can also assign a video element directly to an Entity `material` property.
- `Material` image uniforms now accept and `HTMLVideoElement` anywhere it could previously take a `Canvas` element.
- Added `VideoSynchronizer` helper object for keeping an `HTMLVideoElement` in sync with a scene's clock.
- Fixed an issue with loading skeletons for skinned glTF models. [#3224](https://github.com/CesiumGS/cesium/pull/3224)
- Fixed an issue with tile selection when below the surface of the ellipsoid. [#3170](https://github.com/CesiumGS/cesium/issues/3170)
- Added `Cartographic.fromCartesian` function.
- Added `createOpenStreetMapImageryProvider` function to replace the `OpenStreetMapImageryProvider` class. This function returns a constructed `UrlTemplateImageryProvider`.
- `GeoJsonDataSource.load` now takes an optional `describeProperty` function for generating feature description properties. [#3140](https://github.com/CesiumGS/cesium/pull/3140)
- Added `ImageryProvider.readyPromise` and `TerrainProvider.readyPromise` and implemented it in all terrain and imagery providers. This is a promise which resolves when `ready` becomes true and rejected if there is an error during initialization. [#3175](https://github.com/CesiumGS/cesium/pull/3175)
- Fixed an issue where the sun texture is not generated correctly on some mobile devices. [#3141](https://github.com/CesiumGS/cesium/issues/3141)
- Fixed a bug that caused setting `Entity.parent` to `undefined` to throw an exception. [#3169](https://github.com/CesiumGS/cesium/issues/3169)
- Fixed a bug which caused `Entity` polyline graphics to be incorrect when a scene's ellipsoid was not WGS84. [#3174](https://github.com/CesiumGS/cesium/pull/3174)
- Entities have a reference to their entity collection and to their owner (usually a data source, but can be a `CompositeEntityCollection`).
- Added `ImageMaterialProperty.alpha` and a `alpha` uniform to `Image` and `Material` types to control overall image opacity. It defaults to 1.0, fully opaque.
- Added `Camera.getPixelSize` function to get the size of a pixel in meters based on the current view.
- Added `Camera.distanceToBoundingSphere` function.
- Added `BoundingSphere.fromOrientedBoundingBox` function.
- Added utility function `getBaseUri`, which given a URI with or without query parameters, returns the base path of the URI.
- Added `Queue.peek` to return the item at the front of a Queue.
- Fixed `JulianDate.fromIso8601` so that it correctly parses the `YYYY-MM-DDThh:mmTZD` format.
- Added `Model.maximumScale` and `ModelGraphics.maximumScale` properties, giving an upper limit for minimumPixelSize.
- Fixed glTF implementation to read the version as a string as per the specification and to correctly handle backwards compatibility for axis-angle rotations in glTF 0.8 models.
- Fixed a bug in the deprecated `jsonp` that prevented it from returning a promise. Its replacement, `loadJsonp`, was unaffected.
- Fixed a bug where loadWithXhr would reject the returned promise with successful HTTP responses (2xx) that weren't 200.

### 1.15 - 2015-11-02

- Breaking changes
  - Deleted old `<subfolder>/package.json` and `*.profile.js` files, not used since Cesium moved away from a Dojo-based build years ago. This will allow future compatibility with newer systems like Browserify and Webpack.
- Deprecated
  - Deprecated `Camera.viewRectangle`. It will be removed in 1.17. Use `Camera.setView({destination: rectangle})` instead.
  - The following options to `Camera.setView` have been deprecated and will be removed in 1.17:
    - `position`. Use `destination` instead.
    - `positionCartographic`. Convert to a `Cartesian3` and use `destination` instead.
    - `heading`, `pitch` and `roll`. Use `orientation.heading/pitch/roll` instead.
  - Deprecated `CESIUM_binary_glTF` extension support for glTF models. [KHR_binary_glTF](https://github.com/KhronosGroup/glTF/tree/master/extensions/Khronos/KHR_binary_glTF) should be used instead. `CESIUM_binary_glTF` will be removed in 1.18. Reconvert models using the online [model converter](http://cesiumjs.org/convertmodel.html).
  - Deprecated `RectanglePrimitive`. It will be removed in 1.17. Use `RectangleGeometry` or `Entity.rectangle` instead.
  - Deprecated `EllipsoidPrimitive`. It will be removed in 1.17. Use `EllipsoidGeometry` or `Entity.ellipsoid` instead.
  - Made `EllipsoidPrimitive` private, use `EllipsoidGeometry` or `Entity.ellipsoid` instead.
  - Deprecated `BoxGeometry.minimumCorner` and `BoxGeometry.maximumCorner`. These will be removed in 1.17. Use `BoxGeometry.minimum` and `BoxGeometry.maximum` instead.
  - Deprecated `BoxOutlineGeometry.minimumCorner` and `BoxOutlineGeometry.maximumCorner`. These will be removed in 1.17. Use `BoxOutlineGeometry.minimum` and `BoxOutlineGeometry.maximum` instead.
  - Deprecated `OrthographicFrustum.getPixelSize`. It will be removed in 1.17. Use `OrthographicFrustum.getPixelDimensions` instead.
  - Deprecated `PerspectiveFrustum.getPixelSize`. It will be removed in 1.17. Use `PerspectiveFrustum.getPixelDimensions` instead.
  - Deprecated `PerspectiveOffCenterFrustum.getPixelSize`. It will be removed in 1.17. Use `PerspectiveOffCenterFrustum.getPixelDimensions` instead.
  - Deprecated `Scene\HeadingPitchRange`. It will be removed in 1.17. Use `Core\HeadingPitchRange` instead.
  - Deprecated `jsonp`. It will be removed in 1.17. Use `loadJsonp` instead.
- Added support for the [glTF 1.0](https://github.com/KhronosGroup/glTF/blob/master/specification/README.md) draft specification.
- Added support for the glTF extensions [KHR_binary_glTF](https://github.com/KhronosGroup/glTF/tree/master/extensions/Khronos/KHR_binary_glTF) and [KHR_materials_common](https://github.com/KhronosGroup/glTF/tree/KHR_materials_common/extensions/Khronos/KHR_materials_common).
- Decreased GPU memory usage in `BillboardCollection` and `LabelCollection` by using WebGL instancing.
- Added CZML examples to Sandcastle. See the new CZML tab.
- Changed `Camera.setView` to take the same parameter options as `Camera.flyTo`. `options.destination` takes a rectangle, `options.orientation` works with heading/pitch/roll or direction/up, and `options.endTransform` was added. [#3100](https://github.com/CesiumGS/cesium/pull/3100)
- Fixed token issue in `ArcGisMapServerImageryProvider`.
- `ImageryLayerFeatureInfo` now has an `imageryLayer` property, indicating the layer that contains the feature.
- Made `TileMapServiceImageryProvider` and `CesiumTerrainProvider` work properly when the provided base url contains query parameters and fragments.
- The WebGL setting of `failIfMajorPerformanceCaveat` now defaults to `false`, which is the WebGL default. This improves compatibility with out-of-date drivers and remote desktop sessions. Cesium will run slower in these cases instead of simply failing to load. [#3108](https://github.com/CesiumGS/cesium/pull/3108)
- Fixed the issue where the camera inertia takes too long to finish causing the camera move events to fire after it appears to. [#2839](https://github.com/CesiumGS/cesium/issues/2839)
- Make KML invalid coordinate processing match Google Earth behavior. [#3124](https://github.com/CesiumGS/cesium/pull/3124)
- Added `BoxOutlineGeometry.fromAxisAlignedBoundingBox` and `BoxGeometry.fromAxisAlignedBoundingBox` functions.
- Switched to [gulp](http://gulpjs.com/) for all build tasks. `Java` and `ant` are no longer required to develop Cesium. [#3106](https://github.com/CesiumGS/cesium/pull/3106)
- Updated `requirejs` from 2.1.9 to 2.1.20. [#3107](https://github.com/CesiumGS/cesium/pull/3107)
- Updated `almond` from 0.2.6 to 0.3.1. [#3107](https://github.com/CesiumGS/cesium/pull/3107)

### 1.14 - 2015-10-01

- Fixed issues causing the terrain and sky to disappear when the camera is near the surface. [#2415](https://github.com/CesiumGS/cesium/issues/2415) and [#2271](https://github.com/CesiumGS/cesium/issues/2271)
- Changed the `ScreenSpaceCameraController.minimumZoomDistance` default from `20.0` to `1.0`.
- Added `Billboard.sizeInMeters`. `true` sets the billboard size to be measured in meters; otherwise, the size of the billboard is measured in pixels. Also added support for billboard `sizeInMeters` to entities and CZML.
- Fixed a bug in `AssociativeArray` that would cause unbounded memory growth when adding and removing lots of items.
- Provided a workaround for Safari 9 where WebGL constants can't be accessed through `WebGLRenderingContext`. Now constants are hard-coded in `WebGLConstants`. [#2989](https://github.com/CesiumGS/cesium/issues/2989)
- Added a workaround for Chrome 45, where the first character in a label with a small font size would not appear. [#3011](https://github.com/CesiumGS/cesium/pull/3011)
- Added `subdomains` option to the `WebMapTileServiceImageryProvider` constructor.
- Added `subdomains` option to the `WebMapServiceImageryProvider` constructor.
- Fix zooming in 2D when tracking an object. The zoom was based on location rather than the tracked object. [#2991](https://github.com/CesiumGS/cesium/issues/2991)
- Added `options.credit` parameter to `MapboxImageryProvider`.
- Fixed an issue with drill picking at low frame rates that would cause a crash. [#3010](https://github.com/CesiumGS/cesium/pull/3010)
- Fixed a bug that prevented `setView` from working across all scene modes.
- Fixed a bug that caused `camera.positionWC` to occasionally return the incorrect value.
- Used all the template urls defined in the CesiumTerrain provider.[#3038](https://github.com/CesiumGS/cesium/pull/3038)

### 1.13 - 2015-09-01

- Breaking changes
  - Remove deprecated `AxisAlignedBoundingBox.intersect` and `BoundingSphere.intersect`. Use `BoundingSphere.intersectPlane` instead.
  - Remove deprecated `getFeatureInfoAsGeoJson` and `getFeatureInfoAsXml` constructor parameters from `WebMapServiceImageryProvider`.
- Added support for `GroundPrimitive` which works much like `Primitive` but drapes geometry over terrain. Valid geometries that can be draped on terrain are `CircleGeometry`, `CorridorGeometry`, `EllipseGeometry`, `PolygonGeometry`, and `RectangleGeometry`. Because of the cutting edge nature of this feature in WebGL, it requires the [EXT_frag_depth](https://www.khronos.org/registry/webgl/extensions/EXT_frag_depth/) extension, which is currently only supported in Chrome, Firefox, and Edge. Apple support is expected in iOS 9 and MacOS Safari 9. Android support varies by hardware and IE11 will most likely never support it. You can use [webglreport.com](http://webglreport.com) to verify support for your hardware. Finally, this feature is currently only supported in Primitives and not yet available via the Entity API. [#2865](https://github.com/CesiumGS/cesium/pull/2865)
- Added `Scene.groundPrimitives`, which is a primitive collection like `Scene.primitives`, but for `GroundPrimitive` instances. It allows custom z-ordering. [#2960](https://github.com/CesiumGS/cesium/pull/2960) For example:

        // draws the ellipse on top of the rectangle
        var ellipse = scene.groundPrimitives.add(new Cesium.GroundPrimitive({...}));
        var rectangle = scene.groundPrimitives.add(new Cesium.GroundPrimitive({...}));

        // move the rectangle to draw on top of the ellipse
        scene.groundPrimitives.raise(rectangle);

- Added `reverseZ` tag to `UrlTemplateImageryProvider`. [#2961](https://github.com/CesiumGS/cesium/pull/2961)
- Added `BoundingSphere.isOccluded` and `OrientedBoundingBox.isOccluded` to determine if the volumes are occluded by an `Occluder`.
- Added `distanceSquaredTo` and `computePlaneDistances` functions to `OrientedBoundingBox`.
- Fixed a GLSL precision issue that enables Cesium to support Mali-400MP GPUs and other mobile GPUs where GLSL shaders did not previously compile. [#2984](https://github.com/CesiumGS/cesium/pull/2984)
- Fixed an issue where extruded `PolygonGeometry` was always extruding to the ellipsoid surface instead of specified height. [#2923](https://github.com/CesiumGS/cesium/pull/2923)
- Fixed an issue where non-feature nodes prevented KML documents from loading. [#2945](https://github.com/CesiumGS/cesium/pull/2945)
- Fixed an issue where `JulianDate` would not parse certain dates properly. [#405](https://github.com/CesiumGS/cesium/issues/405)
- Removed [es5-shim](https://github.com/kriskowal/es5-shim), which is no longer being used. [#2933](https://github.com/CesiumGS/cesium/pull/2945)

### 1.12 - 2015-08-03

- Breaking changes
  - Remove deprecated `ObjectOrientedBoundingBox`. Use `OrientedBoundingBox` instead.
- Added `MapboxImageryProvider` to load imagery from [Mapbox](https://www.mapbox.com).
- Added `maximumHeight` option to `Viewer.flyTo`. [#2868](https://github.com/CesiumGS/cesium/issues/2868)
- Added picking support to `UrlTemplateImageryProvider`.
- Added ArcGIS token-based authentication support to `ArcGisMapServerImageryProvider`.
- Added proxy support to `ArcGisMapServerImageryProvider` for `pickFeatures` requests.
- The default `CTRL + Left Click Drag` mouse behavior is now duplicated for `CTRL + Right Click Drag` for better compatibility with Firefox on Mac OS [#2872](https://github.com/CesiumGS/cesium/pull/2913).
- Fixed incorrect texture coordinates for `WallGeometry` [#2872](https://github.com/CesiumGS/cesium/issues/2872)
- Fixed `WallGeometry` bug that caused walls covering a short distance not to render. [#2897](https://github.com/CesiumGS/cesium/issues/2897)
- Fixed `PolygonGeometry` clockwise winding order bug.
- Fixed extruded `RectangleGeometry` bug for small heights. [#2823](https://github.com/CesiumGS/cesium/issues/2823)
- Fixed `BillboardCollection` bounding sphere for billboards with a non-center vertical origin. [#2894](https://github.com/CesiumGS/cesium/issues/2894)
- Fixed a bug that caused `Camera.positionCartographic` to be incorrect. [#2838](https://github.com/CesiumGS/cesium/issues/2838)
- Fixed calling `Scene.pickPosition` after calling `Scene.drillPick`. [#2813](https://github.com/CesiumGS/cesium/issues/2813)
- The globe depth is now rendered during picking when `Scene.depthTestAgainstTerrain` is `true` so objects behind terrain are not picked.
- Fixed Cesium.js failing to parse in IE 8 and 9. While Cesium doesn't work in IE versions less than 11, this allows for more graceful error handling.

### 1.11 - 2015-07-01

- Breaking changes
  - Removed `Scene.fxaaOrderIndependentTranslucency`, which was deprecated in 1.10. Use `Scene.fxaa` which is now `true` by default.
  - Removed `Camera.clone`, which was deprecated in 1.10.
- Deprecated
  - The STK World Terrain url `cesiumjs.org/stk-terrain/world` has been deprecated, use `assets.agi.com/stk-terrain/world` instead. A redirect will be in place until 1.14.
  - Deprecated `AxisAlignedBoundingBox.intersect` and `BoundingSphere.intersect`. These will be removed in 1.13. Use `AxisAlignedBoundingBox.intersectPlane` and `BoundingSphere.intersectPlane` instead.
  - Deprecated `ObjectOrientedBoundingBox`. It will be removed in 1.12. Use `OrientedBoundingBox` instead.
- Improved camera flights. [#2825](https://github.com/CesiumGS/cesium/pull/2825)
- The camera now zooms to the point under the mouse cursor.
- Added a new camera mode for horizon views. When the camera is looking at the horizon and a point on terrain above the camera is picked, the camera moves in the plane containing the camera position, up and right vectors.
- Improved terrain and imagery performance and reduced tile loading by up to 50%, depending on the camera view, by using the new `OrientedBoundingBox` for view frustum culling. See [Terrain Culling with Oriented Bounding Boxes](http://cesiumjs.org/2015/06/24/Oriented-Bounding-Boxes/).
- Added `UrlTemplateImageryProvider`. This new imagery provider allows access to a wide variety of imagery sources, including OpenStreetMap, TMS, WMTS, WMS, WMS-C, and various custom schemes, by specifying a URL template to use to request imagery tiles.
- Fixed flash/streak rendering artifacts when picking. [#2790](https://github.com/CesiumGS/cesium/issues/2790), [#2811](https://github.com/CesiumGS/cesium/issues/2811)
- Fixed 2D and Columbus view lighting issue. [#2635](https://github.com/CesiumGS/cesium/issues/2635).
- Fixed issues with material caching which resulted in the inability to use an image-based material multiple times. [#2821](https://github.com/CesiumGS/cesium/issues/2821)
- Improved `Camera.viewRectangle` so that the specified rectangle is now better centered on the screen. [#2764](https://github.com/CesiumGS/cesium/issues/2764)
- Fixed a crash when `viewer.zoomTo` or `viewer.flyTo` were called immediately before or during a scene morph. [#2775](https://github.com/CesiumGS/cesium/issues/2775)
- Fixed an issue where `Camera` functions would throw an exception if used from within a `Scene.morphComplete` callback. [#2776](https://github.com/CesiumGS/cesium/issues/2776)
- Fixed camera flights that ended up at the wrong position in Columbus view. [#802](https://github.com/CesiumGS/cesium/issues/802)
- Fixed camera flights through the map in 2D. [#804](https://github.com/CesiumGS/cesium/issues/804)
- Fixed strange camera flights from opposite sides of the globe. [#1158](https://github.com/CesiumGS/cesium/issues/1158)
- Fixed camera flights that wouldn't fly to the home view after zooming out past it. [#1400](https://github.com/CesiumGS/cesium/issues/1400)
- Fixed flying to rectangles that cross the IDL in Columbus view and 2D. [#2093](https://github.com/CesiumGS/cesium/issues/2093)
- Fixed flights with a pitch of -90 degrees. [#2468](https://github.com/CesiumGS/cesium/issues/2468)
- `Model` can now load Binary glTF from a `Uint8Array`.
- Fixed a bug in `ImageryLayer` that could cause an exception and the render loop to stop when the base layer did not cover the entire globe.
- The performance statistics displayed when `scene.debugShowFramesPerSecond === true` can now be styled using the `cesium-performanceDisplay` CSS classes in `shared.css` [#2779](https://github.com/CesiumGS/cesium/issues/2779).
- Added `Plane.fromCartesian4`.
- Added `Plane.ORIGIN_XY_PLANE`/`ORIGIN_YZ_PLANE`/`ORIGIN_ZX_PLANE` constants for commonly-used planes.
- Added `Matrix2`/`Matrix3`/`Matrix4.ZERO` constants.
- Added `Matrix2`/`Matrix3.multiplyByScale` for multiplying against non-uniform scales.
- Added `projectPointToNearestOnPlane` and `projectPointsToNearestOnPlane` to `EllipsoidTangentPlane` to project 3D points to the nearest 2D point on an `EllipsoidTangentPlane`.
- Added `EllipsoidTangentPlane.plane` property to get the `Plane` for the tangent plane.
- Added `EllipsoidTangentPlane.xAxis`/`yAxis`/`zAxis` properties to get the local coordinate system of the tangent plane.
- Add `QuantizedMeshTerrainData` constructor argument `orientedBoundingBox`.
- Add `TerrainMesh.orientedBoundingBox` which holds the `OrientedBoundingBox` for the mesh for a single terrain tile.

### 1.10 - 2015-06-01

- Breaking changes
  - Existing bookmarks to documentation of static members have changed [#2757](https://github.com/CesiumGS/cesium/issues/2757).
  - Removed `InfoBoxViewModel.defaultSanitizer`, `InfoBoxViewModel.sanitizer`, and `Cesium.sanitize`, which was deprecated in 1.7.
  - Removed `InfoBoxViewModel.descriptionRawHtml`, which was deprecated in 1.7. Use `InfoBoxViewModel.description` instead.
  - Removed `GeoJsonDataSource.fromUrl`, which was deprecated in 1.7. Use `GeoJsonDataSource.load` instead. Unlike fromUrl, load can take either a url or parsed JSON object and returns a promise to a new instance, rather than a new instance.
  - Removed `GeoJsonDataSource.prototype.loadUrl`, which was deprecated in 1.7. Instead, pass a url as the first parameter to `GeoJsonDataSource.prototype.load`.
  - Removed `CzmlDataSource.prototype.loadUrl`, which was deprecated in 1.7. Instead, pass a url as the first parameter to `CzmlDataSource.prototype.load`.
  - Removed `CzmlDataSource.prototype.processUrl`, which was deprecated in 1.7. Instead, pass a url as the first parameter to `CzmlDataSource.prototype.process`.
  - Removed the `sourceUri` parameter to all `CzmlDataSource` load and process functions, which was deprecated in 1.7. Instead pass an `options` object with `sourceUri` property.
  - Removed `PolygonGraphics.positions` which was deprecated in 1.6. Instead, use `PolygonGraphics.hierarchy`.
  - Existing bookmarks to documentation of static members changed. [#2757](https://github.com/CesiumGS/cesium/issues/2757)
- Deprecated
  - `WebMapServiceImageryProvider` constructor parameters `options.getFeatureInfoAsGeoJson` and `options.getFeatureInfoAsXml` were deprecated and will be removed in Cesium 1.13. Use `options.getFeatureInfoFormats` instead.
  - Deprecated `Camera.clone`. It will be removed in 1.11.
  - Deprecated `Scene.fxaaOrderIndependentTranslucency`. It will be removed in 1.11. Use `Scene.fxaa` which is now `true` by default.
  - The Cesium sample models are now in the Binary glTF format (`.bgltf`). Cesium will also include the models as plain glTF (`.gltf`) until 1.13. Cesium support for `.gltf` will not be removed.
- Added `view` query parameter to the CesiumViewer app, which sets the initial camera position using longitude, latitude, height, heading, pitch and roll. For example: `http://cesiumjs.org/Cesium/Build/Apps/CesiumViewer/index.html/index.html?view=-75.0,40.0,300.0,9.0,-13.0,3.0`
- Added `Billboard.heightReference` and `Label.heightReference` to clamp billboards and labels to terrain.
- Added support for the [CESIUM_binary_glTF](https://github.com/KhronosGroup/glTF/blob/new-extensions/extensions/CESIUM_binary_glTF/README.md) extension for loading binary blobs of glTF to `Model`. See [Faster 3D Models with Binary glTF](http://cesiumjs.org/2015/06/01/Binary-glTF/).
- Added support for the [CESIUM_RTC](https://github.com/KhronosGroup/glTF/blob/new-extensions/extensions/CESIUM_RTC/README.md) glTF extension for high-precision rendering to `Model`.
- Added `PointPrimitive` and `PointPrimitiveCollection`, which are faster and use less memory than billboards with circles.
- Changed `Entity.point` to use the new `PointPrimitive` instead of billboards. This does not change the `Entity.point` API.
- Added `Scene.pickPosition` to reconstruct the WGS84 position from window coordinates.
- The default mouse controls now support panning and zooming on 3D models and other opaque geometry.
- Added `Camera.moveStart` and `Camera.moveEnd` events.
- Added `GeocoderViewModel.complete` event. Triggered after the camera flight is completed.
- `KmlDataSource` can now load a KML file that uses explicit XML namespacing, e.g. `kml:Document`.
- Setting `Entity.show` now properly toggles the display of all descendant entities, previously it only affected its direct children.
- Fixed a bug that sometimes caused `Entity` instances with `show` set to false to reappear when new `Entity` geometry is added. [#2686](https://github.com/CesiumGS/cesium/issues/2686)
- Added a `Rotation` object which, when passed to `SampledProperty`, always interpolates values towards the shortest angle. Also hooked up CZML to use `Rotation` for all time-dynamic rotations.
- Fixed a bug where moon rendered in front of foreground geometry. [#1964](https://github.com/CesiumGS/cesium/issue/1964)
- Fixed a bug where the sun was smeared when the skybox/stars was disabled. [#1829](https://github.com/CesiumGS/cesium/issue/1829)
- `TileProviderError` now optionally takes an `error` parameter with more details of the error or exception that occurred. `ImageryLayer` passes that information through when tiles fail to load. This allows tile provider error handling to take a different action when a tile returns a 404 versus a 500, for example.
- `ArcGisMapServerImageryProvider` now has a `maximumLevel` constructor parameter.
- `ArcGisMapServerImageryProvider` picking now works correctly when the `layers` parameter is specified. Previously, it would pick from all layers even if only displaying a subset.
- `WebMapServiceImageryProvider.pickFeatures` now works with WMS servers, such as Google Maps Engine, that can only return feature information in HTML format.
- `WebMapServiceImageryProvider` now accepts an array of `GetFeatureInfoFormat` instances that it will use to obtain information about the features at a given position on the globe. This enables an arbitrary `info_format` to be passed to the WMS server, and an arbitrary JavaScript function to be used to interpret the response.
- Fixed a crash caused by `ImageryLayer` attempting to generate mipmaps for textures that are not a power-of-two size.
- Fixed a bug where `ImageryLayerCollection.pickImageryLayerFeatures` would return incorrect results when picking from a terrain tile that was partially covered by correct-level imagery and partially covered by imagery from an ancestor level.
- Fixed incorrect counting of `debug.tilesWaitingForChildren` in `QuadtreePrimitive`.
- Added `throttleRequestsByServer.maximumRequestsPerServer` property.
- Changed `createGeometry` to load individual-geometry workers using a CommonJS-style `require` when run in a CommonJS-like environment.
- Added `buildModuleUrl.setBaseUrl` function to allow the Cesium base URL to be set without the use of the global CESIUM_BASE_URL variable.
- Changed `ThirdParty/zip` to defer its call to `buildModuleUrl` until it is needed, rather than executing during module loading.
- Added optional drilling limit to `Scene.drillPick`.
- Added optional `ellipsoid` parameter to construction options of imagery and terrain providers that were lacking it. Note that terrain bounding spheres are precomputed on the server, so any supplied terrain ellipsoid must match the one used by the server.
- Added debug option to `Scene` to show the depth buffer information for a specified view frustum slice and exposed capability in `CesiumInspector` widget.
- Added new leap second for 30 June 2015 at UTC 23:59:60.
- Upgraded Autolinker from version 0.15.2 to 0.17.1.

### 1.9 - 2015-05-01

- Breaking changes
  - Removed `ColorMaterialProperty.fromColor`, previously deprecated in 1.6. Pass a `Color` directly to the `ColorMaterialProperty` constructor instead.
  - Removed `CompositeEntityCollection.entities` and `EntityCollection.entities`, both previously deprecated in 1.6. Use `CompositeEntityCollection.values` and `EntityCollection.values` instead.
  - Removed `DataSourceDisplay.getScene` and `DataSourceDisplay.getDataSources`, both previously deprecated in 1.6. Use `DataSourceDisplay.scene` and `DataSourceDisplay.dataSources` instead.
  - `Entity` no longer takes a string id as its constructor argument. Pass an options object with `id` property instead. This was previously deprecated in 1.6.
  - Removed `Model.readyToRender`, previously deprecated in 1.6. Use `Model.readyPromise` instead.
- Entity `material` properties and `Material` uniform values can now take a `canvas` element in addition to an image or url. [#2667](https://github.com/CesiumGS/cesium/pull/2667)
- Fixed a bug which caused `Entity.viewFrom` to be ignored when flying to, zooming to, or tracking an Entity. [#2628](https://github.com/CesiumGS/cesium/issues/2628)
- Fixed a bug that caused `Corridor` and `PolylineVolume` geometry to be incorrect for sharp corners [#2626](https://github.com/CesiumGS/cesium/pull/2626)
- Fixed crash when modifying a translucent entity geometry outline. [#2630](https://github.com/CesiumGS/cesium/pull/2630)
- Fixed crash when loading KML GroundOverlays that spanned 360 degrees. [#2639](https://github.com/CesiumGS/cesium/pull/2639)
- Fixed `Geocoder` styling issue in Safari. [#2658](https://github.com/CesiumGS/cesium/pull/2658).
- Fixed a crash that would occur when the `Viewer` or `CesiumWidget` was resized to 0 while the camera was in motion. [#2662](https://github.com/CesiumGS/cesium/issues/2662)
- Fixed a bug that prevented the `InfoBox` title from updating if the name of `viewer.selectedEntity` changed. [#2644](https://github.com/CesiumGS/cesium/pull/2644)
- Added an optional `result` parameter to `computeScreenSpacePosition` on both `Billboard` and `Label`.
- Added number of cached shaders to the `CesiumInspector` debugging widget.
- An exception is now thrown if `Primitive.modelMatrix` is not the identity matrix when in in 2D or Columbus View.

### 1.8 - 2015-04-01

- Breaking changes
  - Removed the `eye`, `target`, and `up` parameters to `Camera.lookAt` which were deprecated in Cesium 1.6. Use the `target` and `offset`.
  - Removed `Camera.setTransform`, which was deprecated in Cesium 1.6. Use `Camera.lookAtTransform`.
  - Removed `Camera.transform`, which was deprecated in Cesium 1.6. Use `Camera.lookAtTransform`.
  - Removed the `direction` and `up` options to `Camera.flyTo`, which were deprecated in Cesium 1.6. Use the `orientation` option.
  - Removed `Camera.flyToRectangle`, which was deprecated in Cesium 1.6. Use `Camera.flyTo`.
- Deprecated
  - Deprecated the `smallterrain` tileset. It will be removed in 1.11. Use the [STK World Terrain](http://cesiumjs.org/data-and-assets/terrain/stk-world-terrain.html) tileset.
- Added `Entity.show`, a boolean for hiding or showing an entity and its children.
- Added `Entity.isShowing`, a read-only property that indicates if an entity is currently being drawn.
- Added support for the KML `visibility` element.
- Added `PolylineArrowMaterialProperty` to allow entities materials to use polyline arrows.
- Added `VelocityOrientationProperty` to easily orient Entity graphics (such as a model) along the direction it is moving.
- Added a new Sandcastle demo, [Interpolation](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Interpolation.html&label=Showcases), which illustrates time-dynamic position interpolation options and uses the new `VelocityOrientationProperty` to orient an aircraft in flight.
- Improved `viewer.zoomTo` and `viewer.flyTo` so they are now "best effort" and work even if some entities being zoomed to are not currently in the scene.
- Fixed `PointerEvent` detection so that it works with older implementations of the specification. This also fixes lack of mouse handling when detection failed, such as when using Cesium in the Windows `WebBrowser` control.
- Fixed an issue with transparency. [#2572](https://github.com/CesiumGS/cesium/issues/2572)
- Fixed improper handling of null values when loading `GeoJSON` data.
- Added support for automatic raster feature picking from `ArcGisMapServerImagerProvider`.
- Added the ability to specify the desired tiling scheme, rectangle, and width and height of tiles to the `ArcGisMapServerImagerProvider` constructor.
- Added the ability to access dynamic ArcGIS MapServer layers by specifying the `layers` parameter to the `ArcGisMapServerImagerProvider` constructor.
- Fixed a bug that could cause incorrect rendering of an `ArcGisMapServerImageProvider` with a "singleFusedMapCache" in the geographic projection (EPSG:4326).
- Added new construction options to `CesiumWidget` and `Viewer`, for `skyBox`, `skyAtmosphere`, and `globe`.
- Fixed a bug that prevented Cesium from working in browser configurations that explicitly disabled localStorage, such as Safari's private browsing mode.
- Cesium is now tested using Jasmine 2.2.0.

### 1.7.1 - 2015-03-06

- Fixed a crash in `InfoBox` that would occur when attempting to display plain text.
- Fixed a crash when loading KML features that have no description and an empty `ExtendedData` node.
- Fixed a bug `in Color.fromCssColorString` where undefined would be returned for the CSS color `transparent`.
- Added `Color.TRANSPARENT`.
- Added support for KML `TimeStamp` nodes.
- Improved KML compatibility to work with non-specification compliant KML files that still happen to load in Google Earth.
- All data sources now print errors to the console in addition to raising the `errorEvent` and rejecting their load promise.

### 1.7 - 2015-03-02

- Breaking changes
  - Removed `viewerEntityMixin`, which was deprecated in Cesium 1.5. Its functionality is now directly part of the `Viewer` widget.
  - Removed `Camera.tilt`, which was deprecated in Cesium 1.6. Use `Camera.pitch`.
  - Removed `Camera.heading` and `Camera.tilt`. They were deprecated in Cesium 1.6. Use `Camera.setView`.
  - Removed `Camera.setPositionCartographic`, which was was deprecated in Cesium 1.6. Use `Camera.setView`.
- Deprecated
  - Deprecated `InfoBoxViewModel.defaultSanitizer`, `InfoBoxViewModel.sanitizer`, and `Cesium.sanitize`. They will be removed in 1.10.
  - Deprecated `InfoBoxViewModel.descriptionRawHtml`, it will be removed in 1.10. Use `InfoBoxViewModel.description` instead.
  - Deprecated `GeoJsonDataSource.fromUrl`, it will be removed in 1.10. Use `GeoJsonDataSource.load` instead. Unlike fromUrl, load can take either a url or parsed JSON object and returns a promise to a new instance, rather than a new instance.
  - Deprecated `GeoJsonDataSource.prototype.loadUrl`, it will be removed in 1.10. Instead, pass a url as the first parameter to `GeoJsonDataSource.prototype.load`.
  - Deprecated `CzmlDataSource.prototype.loadUrl`, it will be removed in 1.10. Instead, pass a url as the first parameter to `CzmlDataSource.prototype.load`.
  - Deprecated `CzmlDataSource.prototype.processUrl`, it will be removed in 1.10. Instead, pass a url as the first parameter to `CzmlDataSource.prototype.process`.
  - Deprecated the `sourceUri` parameter to all `CzmlDataSource` load and process functions. Support will be removed in 1.10. Instead pass an `options` object with `sourceUri` property.
- Added initial support for [KML 2.2](https://developers.google.com/kml/) via `KmlDataSource`. Check out the new [Sandcastle Demo](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=KML.html) and the [reference documentation](http://cesiumjs.org/Cesium/Build/Documentation/KmlDataSource.html) for more details.
- `InfoBox` sanitization now relies on [iframe sandboxing](http://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/). This allows for much more content to be displayed in the InfoBox (and still be secure).
- Added `InfoBox.frame` which is the instance of the iframe that is used to host description content. Sanitization can be controlled via the frame's `sandbox` attribute. See the above link for additional information.
- Worked around a bug in Safari that caused most of Cesium to be broken. Cesium should now work much better on Safari for both desktop and mobile.
- Fixed incorrect ellipse texture coordinates. [#2363](https://github.com/CesiumGS/cesium/issues/2363) and [#2465](https://github.com/CesiumGS/cesium/issues/2465)
- Fixed a bug that would cause incorrect geometry for long Corridors and Polyline Volumes. [#2513](https://github.com/CesiumGS/cesium/issues/2513)
- Fixed a bug in imagery loading that could cause some or all of the globe to be missing when using an imagery layer that does not cover the entire globe.
- Fixed a bug that caused `ElipseOutlineGeometry` and `CircleOutlineGeometry` to be extruded to the ground when they should have instead been drawn at height. [#2499](https://github.com/CesiumGS/cesium/issues/2499).
- Fixed a bug that prevented per-vertex colors from working with `PolylineGeometry` and `SimplePolylineGeometry` when used asynchronously. [#2516](https://github.com/CesiumGS/cesium/issues/2516)
- Fixed a bug that would caused duplicate graphics if non-time-dynamic `Entity` objects were modified in quick succession. [#2514](https://github.com/CesiumGS/cesium/issues/2514).
- Fixed a bug where `camera.flyToBoundingSphere` would ignore range if the bounding sphere radius was 0. [#2519](https://github.com/CesiumGS/cesium/issues/2519)
- Fixed some styling issues with `InfoBox` and `BaseLayerPicker` caused by using Bootstrap with Cesium. [#2487](https://github.com/CesiumGS/cesium/issues/2479)
- Added support for rendering a water effect on Quantized-Mesh terrain tiles.
- Added `pack` and `unpack` functions to `Matrix2` and `Matrix3`.
- Added camera-terrain collision detection/response when the camera reference frame is set.
- Added `ScreenSpaceCameraController.enableCollisionDetection` to enable/disable camera collision detection with terrain.
- Added `CzmlDataSource.load` and `GeoJsonDataSource.load` to make it easy to create and load data in a single line.
- Added the ability to pass a `Promise` to a `DataSource` to `DataSourceCollection.add`. The `DataSource` will not actually be added until the promise resolves.
- Added the ability to pass a `Promise` to a target to `viewer.zoomTo` and `viewer.flyTo`.
- All `CzmlDataSource` and `GeoJsonDataSource` loading functions now return `Promise` instances that resolve to the instances after data is loaded.
- Error handling in all `CzmlDataSource` and `GeoJsonDataSource` loading functions is now more consistent. Rather than a mix of exceptions and `Promise` rejections, all errors are raised via `Promise` rejections.
- In addition to addresses, the `Geocoder` widget now allows input of longitude, latitude, and an optional height in degrees and meters. Example: `-75.596, 40.038, 1000` or `-75.596 40.038`.

### 1.6 - 2015-02-02

- Breaking changes
  - `Rectangle.intersectWith` was deprecated in Cesium 1.5. Use `Rectangle.intersection`, which is the same but returns `undefined` when two rectangles do not intersect.
  - `Rectangle.isEmpty` was deprecated in Cesium 1.5.
  - The `sourceUri` parameter to `GeoJsonDatasource.load` was deprecated in Cesium 1.4 and has been removed. Use options.sourceUri instead.
  - `PolygonGraphics.positions` created by `GeoJSONDataSource` now evaluate to a `PolygonHierarchy` object instead of an array of positions.
- Deprecated
  - `Camera.tilt` was deprecated in Cesium 1.6. It will be removed in Cesium 1.7. Use `Camera.pitch`.
  - `Camera.heading` and `Camera.tilt` were deprecated in Cesium 1.6. They will become read-only in Cesium 1.7. Use `Camera.setView`.
  - `Camera.setPositionCartographic` was deprecated in Cesium 1.6. It will be removed in Cesium 1.7. Use `Camera.setView`.
  - The `direction` and `up` options to `Camera.flyTo` have been deprecated in Cesium 1.6. They will be removed in Cesium 1.8. Use the `orientation` option.
  - `Camera.flyToRectangle` has been deprecated in Cesium 1.6. They will be removed in Cesium 1.8. Use `Camera.flyTo`.
  - `Camera.setTransform` was deprecated in Cesium 1.6. It will be removed in Cesium 1.8. Use `Camera.lookAtTransform`.
  - `Camera.transform` was deprecated in Cesium 1.6. It will be removed in Cesium 1.8. Use `Camera.lookAtTransform`.
  - The `eye`, `target`, and `up` parameters to `Camera.lookAt` were deprecated in Cesium 1.6. It will be removed in Cesium 1.8. Use the `target` and `offset`.
  - `PolygonGraphics.positions` was deprecated and replaced with `PolygonGraphics.hierarchy`, whose value is a `PolygonHierarchy` instead of an array of positions. `PolygonGraphics.positions` will be removed in Cesium 1.8.
  - The `Model.readyToRender` event was deprecated and will be removed in Cesium 1.9. Use the new `Model.readyPromise` instead.
  - `ColorMaterialProperty.fromColor(color)` has been deprecated and will be removed in Cesium 1.9. The constructor can now take a Color directly, for example `new ColorMaterialProperty(color)`.
  - `DataSourceDisplay` methods `getScene` and `getDataSources` have been deprecated and replaced with `scene` and `dataSources` properties. They will be removed in Cesium 1.9.
  - The `Entity` constructor taking a single string value for the id has been deprecated. The constructor now takes an options object which allows you to provide any and all `Entity` related properties at construction time. Support for the deprecated behavior will be removed in Cesium 1.9.
  - The `EntityCollection.entities` and `CompositeEntityCollect.entities` properties have both been renamed to `values`. Support for the deprecated behavior will be removed in Cesium 1.9.
- Fixed an issue which caused order independent translucency to be broken on many video cards. Disabling order independent translucency should no longer be necessary.
- `GeoJsonDataSource` now supports polygons with holes.
- Many Sandcastle examples have been rewritten to make use of the newly improved Entity API.
- Instead of throwing an exception when there are not enough unique positions to define a geometry, creating a `Primitive` will succeed, but not render. [#2375](https://github.com/CesiumGS/cesium/issues/2375)
- Improved performance of asynchronous geometry creation (as much as 20% faster in some use cases). [#2342](https://github.com/CesiumGS/cesium/issues/2342)
- Fixed picking in 2D. [#2447](https://github.com/CesiumGS/cesium/issues/2447)
- Added `viewer.entities` which allows you to easily create and manage `Entity` instances without a corresponding `DataSource`. This is just a shortcut to `viewer.dataSourceDisplay.defaultDataSource.entities`
- Added `viewer.zoomTo` and `viewer.flyTo` which takes an entity, array of entities, `EntityCollection`, or `DataSource` as a parameter and zooms or flies to the corresponding visualization.
- Setting `viewer.trackedEntity` to `undefined` will now restore the camera controls to their default states.
- When you track an entity by clicking on the track button in the `InfoBox`, you can now stop tracking by clicking the button a second time.
- Added `Quaternion.fromHeadingPitchRoll` to create a rotation from heading, pitch, and roll angles.
- Added `Transforms.headingPitchRollToFixedFrame` to create a local frame from a position and heading/pitch/roll angles.
- Added `Transforms.headingPitchRollQuaternion` which is the quaternion rotation from `Transforms.headingPitchRollToFixedFrame`.
- Added `Color.fromAlpha` and `Color.withAlpha` to make it easy to create translucent colors from constants, i.e. `var translucentRed = Color.RED.withAlpha(0.95)`.
- Added `PolylineVolumeGraphics` and `Entity.polylineVolume`
- Added `Camera.lookAtTransform` which sets the camera position and orientation given a transformation matrix defining a reference frame and either a cartesian offset or heading/pitch/range from the center of that frame.
- Added `Camera.setView` (which use heading, pitch, and roll) and `Camera.roll`.
- Added an orientation option to `Camera.flyTo` that can be either direction and up unit vectors or heading, pitch and roll angles.
- Added `BillboardGraphics.imageSubRegion`, to enable custom texture atlas use for `Entity` instances.
- Added `CheckerboardMaterialProperty` to enable use of the checkerboard material with the entity API.
- Added `PolygonHierarchy` to make defining polygons with holes clearer.
- Added `PolygonGraphics.hierarchy` for supporting polygons with holes via data sources.
- Added `BoundingSphere.fromBoundingSpheres`, which creates a `BoundingSphere` that encloses the specified array of BoundingSpheres.
- Added `Model.readyPromise` and `Primitive.readyPromise` which are promises that resolve when the primitives are ready.
- `ConstantProperty` can now hold any value; previously it was limited to values that implemented `equals` and `clones` functions, as well as a few special cases.
- Fixed a bug in `EllipsoidGeodesic` that caused it to modify the `height` of the positions passed to the constructor or to to `setEndPoints`.
- `WebMapTileServiceImageryProvider` now supports RESTful requests (by accepting a tile-URL template).
- Fixed a bug that caused `Camera.roll` to be around 180 degrees, indicating the camera was upside-down, when in the Southern hemisphere.
- The object returned by `Primitive.getGeometryInstanceAttributes` now contains the instance's bounding sphere and repeated calls will always now return the same object instance.
- Fixed a bug that caused dynamic geometry outlines widths to not work on implementations that support them.
- The `SelectionIndicator` widget now works for all entity visualization and uses the center of visualization instead of entity.position. This produces more accurate results, especially for shapes, volumes, and models.
- Added `CustomDataSource` which makes it easy to create and manage a group of entities without having to manually implement the DataSource interface in a new class.
- Added `DataSourceDisplay.defaultDataSource` which is an instance of `CustomDataSource` and allows you to easily add custom entities to the display.
- Added `Camera.viewBoundingSphere` and `Camera.flyToBoundingSphere`, which as the names imply, sets or flies to a view that encloses the provided `BoundingSphere`
- For constant `Property` values, there is no longer a need to create an instance of `ConstantProperty` or `ConstantPositionProperty`, you can now assign a value directly to the corresponding property. The same is true for material images and colors.
- All Entity and related classes can now be assigned using anonymous objects as well as be passed template objects. The correct underlying instance is created for you automatically. For a more detailed overview of changes to the Entity API, see [this forum thread](https://community.cesium.com/t/cesium-in-2015-entity-api/1863) for details.

### 1.5 - 2015-01-05

- Breaking changes
  - Removed `GeometryPipeline.wrapLongitude`, which was deprecated in 1.4. Use `GeometryPipeline.splitLongitude` instead.
  - Removed `GeometryPipeline.combine`, which was deprecated in 1.4. Use `GeometryPipeline.combineInstances` instead.
- Deprecated
  - `viewerEntityMixin` was deprecated. It will be removed in Cesium 1.6. Its functionality is now directly part of the `Viewer` widget.
  - `Rectangle.intersectWith` was deprecated. It will be removed in Cesium 1.6. Use `Rectangle.intersection`, which is the same but returns `undefined` when two rectangles do not intersect.
  - `Rectangle.isEmpty` was deprecated. It will be removed in Cesium 1.6.
- Improved GeoJSON, TopoJSON, and general polygon loading performance.
- Added caching to `Model` to save memory and improve loading speed when several models with the same url are created.
- Added `ModelNode.show` for per-node show/hide.
- Added the following properties to `Viewer` and `CesiumWidget`: `imageryLayers`, `terrainProvider`, and `camera`. This avoids the need to access `viewer.scene` in some cases.
- Dramatically improved the quality of font outlines.
- Added `BoxGraphics` and `Entity.box`.
- Added `CorridorGraphics` and `Entity.corridor`.
- Added `CylinderGraphics` and `Entity.cylinder`.
- Fixed imagery providers whose rectangle crosses the IDL. Added `Rectangle.computeWidth`, `Rectangle.computeHeight`, `Rectangle.width`, and `Rectangle.height`. [#2195](https://github.com/CesiumGS/cesium/issues/2195)
- `ConstantProperty` now accepts `HTMLElement` instances as valid values.
- `BillboardGraphics.image` and `ImageMaterialProperty.image` now accept `Property` instances that represent an `Image` or `Canvas` in addition to a url.
- Fixed a bug in `PolylineGeometry` that would cause gaps in the line. [#2136](https://github.com/CesiumGS/cesium/issues/2136)
- Fixed `upsampleQuantizedTerrainMesh` rounding errors that had occasionally led to missing terrain skirt geometry in upsampled tiles.
- Added `Math.mod` which computes `m % n` but also works when `m` is negative.

### 1.4 - 2014-12-01

- Breaking changes
  - Types implementing `TerrainProvider` are now required to implement the `getTileDataAvailable` function. Backwards compatibility for this was deprecated in Cesium 1.2.
- Deprecated
  - The `sourceUri` parameter to `GeoJsonDatasource.load` was deprecated and will be removed in Cesium 1.6 on February 3, 2015 ([#2257](https://github.com/CesiumGS/cesium/issues/2257)). Use `options.sourceUri` instead.
  - `GeometryPipeline.wrapLongitude` was deprecated. It will be removed in Cesium 1.5 on January 2, 2015. Use `GeometryPipeline.splitLongitude`. ([#2272](https://github.com/CesiumGS/cesium/issues/2272))
  - `GeometryPipeline.combine` was deprecated. It will be removed in Cesium 1.5. Use `GeometryPipeline.combineInstances`.
- Added support for touch events on Internet Explorer 11 using the [Pointer Events API](http://www.w3.org/TR/pointerevents/).
- Added geometry outline width support to the `DataSource` layer. This is exposed via the new `outlineWidth` property on `EllipseGraphics`, `EllipsoidGraphics`, `PolygonGraphics`, `RectangleGraphics`, and `WallGraphics`.
- Added `outlineWidth` support to CZML geometry packets.
- Added `stroke-width` support to the GeoJSON simple-style implementation.
- Added the ability to specify global GeoJSON default styling. See the [documentation](http://cesiumjs.org/Cesium/Build/Documentation/GeoJsonDataSource.html) for details.
- Added `CallbackProperty` to support lazy property evaluation as well as make custom properties easier to create.
- Added an options parameter to `GeoJsonDataSource.load`, `GeoJsonDataSource.loadUrl`, and `GeoJsonDataSource.fromUrl` to allow for basic per-instance styling. [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20and%20TopoJSON.html&label=Showcases).
- Improved GeoJSON loading performance.
- Improved point visualization performance for all DataSources.
- Improved the performance and memory usage of `EllipseGeometry`, `EllipseOutlineGeometry`, `CircleGeometry`, and `CircleOutlineGeometry`.
- Added `tileMatrixLabels` option to `WebMapTileServiceImageryProvider`.
- Fixed a bug in `PolylineGeometry` that would cause the geometry to be split across the IDL for 3D only scenes. [#1197](https://github.com/CesiumGS/cesium/issues/1197)
- Added `modelMatrix` and `cull` options to `Primitive` constructor.
- The `translation` parameter to `Matrix4.fromRotationTranslation` now defaults to `Cartesian3.ZERO`.
- Fixed `ModelNode.matrix` when a node is targeted for animation.
- `Camera.tilt` now clamps to [-pi / 2, pi / 2] instead of [0, pi / 2].
- Fixed an issue that could lead to poor performance on lower-end GPUs like the Intel HD 3000.
- Added `distanceSquared` to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
- Added `Matrix4.multiplyByMatrix3`.
- Fixed a bug in `Model` where the WebGL shader optimizer in Linux was causing mesh loading to fail.

### 1.3 - 2014-11-03

- Worked around a shader compilation regression in Firefox 33 and 34 by falling back to a less precise shader on those browsers. [#2197](https://github.com/CesiumGS/cesium/issues/2197)
- Added support to the `CesiumTerrainProvider` for terrain tiles with more than 64K vertices, which is common for sub-meter terrain.
- Added `Primitive.compressVertices`. When true (default), geometry vertices are compressed to save GPU memory.
- Added `culture` option to `BingMapsImageryProvider` constructor.
- Reduced the amount of GPU memory used by billboards and labels.
- Fixed a bug that caused non-base imagery layers with a limited `rectangle` to be stretched to the edges of imagery tiles. [#416](https://github.com/CesiumGS/cesium/issues/416)
- Fixed rendering polylines with duplicate positions. [#898](https://github.com/CesiumGS/cesium/issues/898)
- Fixed a bug in `Globe.pick` that caused it to return incorrect results when using terrain data with vertex normals. The bug manifested itself as strange behavior when navigating around the surface with the mouse as well as incorrect results when using `Camera.viewRectangle`.
- Fixed a bug in `sampleTerrain` that could cause it to produce undefined heights when sampling for a position very near the edge of a tile.
- `ReferenceProperty` instances now retain their last value if the entity being referenced is removed from the target collection. The reference will be automatically reattached if the target is reintroduced.
- Upgraded topojson from 1.6.8 to 1.6.18.
- Upgraded Knockout from version 3.1.0 to 3.2.0.
- Upgraded CodeMirror, used by SandCastle, from 2.24 to 4.6.

### 1.2 - 2014-10-01

- Deprecated
  - Types implementing the `TerrainProvider` interface should now include the new `getTileDataAvailable` function. The function will be required starting in Cesium 1.4.
- Fixed model orientations to follow the same Z-up convention used throughout Cesium. There was also an orientation issue fixed in the [online model converter](http://cesiumjs.org/convertmodel.html). If you are having orientation issues after updating, try reconverting your models.
- Fixed a bug in `Model` where the wrong animations could be used when the model was created from glTF JSON instead of a url to a glTF file. [#2078](https://github.com/CesiumGS/cesium/issues/2078)
- Fixed a bug in `GeoJsonDataSource` which was causing polygons with height values to be drawn onto the surface.
- Fixed a bug that could cause a crash when quickly adding and removing imagery layers.
- Eliminated imagery artifacts at some zoom levels due to Mercator reprojection.
- Added support for the GeoJSON [simplestyle specification](https://github.com/mapbox/simplestyle-spec). ([Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20simplestyle.html))
- Added `GeoJsonDataSource.fromUrl` to make it easy to add a data source in less code.
- Added `PinBuilder` class for easy creation of map pins. ([Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=PinBuilder.html))
- Added `Color.brighten` and `Color.darken` to make it easy to brighten or darker a color instance.
- Added a constructor option to `Scene`, `CesiumWidget`, and `Viewer` to disable order independent translucency.
- Added support for WKID 102113 (equivalent to 102100) to `ArcGisMapServerImageryProvider`.
- Added `TerrainProvider.getTileDataAvailable` to improve tile loading performance when camera starts near globe.
- Added `Globe.showWaterEffect` to enable/disable the water effect for supported terrain providers.
- Added `Globe.baseColor` to set the color of the globe when no imagery is available.
- Changed default `GeoJSON` Point feature graphics to use `BillboardGraphics` with a blue map pin instead of color `PointGraphics`.
- Cesium now ships with a version of the [maki icon set](https://www.mapbox.com/maki/) for use with `PinBuilder` and GeoJSON simplestyle support.
- Cesium now ships with a default web.config file to simplify IIS deployment.

### 1.1 - 2014-09-02

- Added a new imagery provider, `WebMapTileServiceImageryProvider`, for accessing tiles on a WMTS 1.0.0 server.
- Added an optional `pickFeatures` function to the `ImageryProvider` interface. With supporting imagery providers, such as `WebMapServiceImageryProvider`, it can be used to determine the rasterized features under a particular location.
- Added `ImageryLayerCollection.pickImageryLayerFeatures`. It determines the rasterized imagery layer features intersected by a given pick ray by querying supporting layers using `ImageryProvider.pickFeatures`.
- Added `tileWidth`, `tileHeight`, `minimumLevel`, and `tilingScheme` parameters to the `WebMapServiceImageryProvider` constructor.
- Added `id` property to `Scene` which is a readonly unique identifier associated with each instance.
- Added `FeatureDetection.supportsWebWorkers`.
- Greatly improved the performance of time-varying polylines when using DataSources.
- `viewerEntityMixin` now automatically queries for imagery layer features on click and shows their properties in the `InfoBox` panel.
- Fixed a bug in terrain and imagery loading that could cause an inconsistent frame rate when moving around the globe, especially on a faster internet connection.
- Fixed a bug that caused `SceneTransforms.wgs84ToWindowCoordinates` to incorrectly return `undefined` when in 2D.
- Fixed a bug in `ImageryLayer` that caused layer images to be rendered twice for each terrain tile that existed prior to adding the imagery layer.
- Fixed a bug in `Camera.pickEllipsoid` that caused it to return the back side of the ellipsoid when near the surface.
- Fixed a bug which prevented `loadWithXhr` from working with older browsers, such as Internet Explorer 9.

### 1.0 - 2014-08-01

- Breaking changes ([why so many?](https://community.cesium.com/t/moving-towards-cesium-1-0/1209))

  - All `Matrix2`, `Matrix3`, `Matrix4` and `Quaternion` functions that take a `result` parameter now require the parameter, except functions starting with `from`.
  - Removed `Billboard.imageIndex` and `BillboardCollection.textureAtlas`. Instead, use `Billboard.image`.

    - Code that looked like:

            var billboards = new Cesium.BillboardCollection();
            var textureAtlas = new Cesium.TextureAtlas({
                scene : scene,
                images : images // array of loaded images
            });
            billboards.textureAtlas = textureAtlas;
            billboards.add({
                imageIndex : 0,
                position : //...
            });

    - should now look like:

            var billboards = new Cesium.BillboardCollection();
            billboards.add({
                image : '../images/Cesium_Logo_overlay.png',
                position : //...
            });

  - Updated the [Model Converter](http://cesiumjs.org/convertmodel.html) and `Model` to support [glTF 0.8](https://github.com/KhronosGroup/glTF/blob/schema-8/specification/README.md). See the [forum post](https://community.cesium.com/t/cesium-and-gltf-version-compatibility/1343) for full details.
  - `Model` primitives are now rotated to be `Z`-up to match Cesium convention; glTF stores models with `Y` up.
  - `SimplePolylineGeometry` and `PolylineGeometry` now curve to follow the ellipsoid surface by default. To disable this behavior, set the option `followSurface` to `false`.
  - Renamed `DynamicScene` layer to `DataSources`. The following types were also renamed:
    - `DynamicBillboard` -> `BillboardGraphics`
    - `DynamicBillboardVisualizer` -> `BillboardVisualizer`
    - `CompositeDynamicObjectCollection` -> `CompositeEntityCollection`
    - `DynamicClock` -> `DataSourceClock`
    - `DynamicEllipse` -> `EllipseGraphics`
    - `DynamicEllipsoid` -> `EllipsoidGraphics`
    - `DynamicObject` -> `Entity`
    - `DynamicObjectCollection` -> `EntityCollection`
    - `DynamicObjectView` -> `EntityView`
    - `DynamicLabel` -> `LabelGraphics`
    - `DynamicLabelVisualizer` -> `LabelVisualizer`
    - `DynamicModel` -> `ModelGraphics`
    - `DynamicModelVisualizer` -> `ModelVisualizer`
    - `DynamicPath` -> `PathGraphics`
    - `DynamicPathVisualizer` -> `PathVisualizer`
    - `DynamicPoint` -> `PointGraphics`
    - `DynamicPointVisualizer` -> `PointVisualizer`
    - `DynamicPolygon` -> `PolygonGraphics`
    - `DynamicPolyline` -> `PolylineGraphics`
    - `DynamicRectangle` -> `RectangleGraphics`
    - `DynamicWall` -> `WallGraphics`
    - `viewerDynamicObjectMixin` -> `viewerEntityMixin`
  - Removed `DynamicVector` and `DynamicVectorVisualizer`.
  - Renamed `DataSource.dynamicObjects` to `DataSource.entities`.
  - `EntityCollection.getObjects()` and `CompositeEntityCollection.getObjects()` are now properties named `EntityCollection.entities` and `CompositeEntityCollection.entities`.
  - Renamed `Viewer.trackedObject` and `Viewer.selectedObject` to `Viewer.trackedEntity` and `Viewer.selectedEntity` when using the `viewerEntityMixin`.
  - Renamed functions for consistency:
    - `BoundingSphere.getPlaneDistances` -> `BoundingSphere.computePlaneDistances`
    - `Cartesian[2,3,4].getMaximumComponent` -> `Cartesian[2,3,4].maximumComponent`
    - `Cartesian[2,3,4].getMinimumComponent` -> `Cartesian[2,3,4].minimumComponent`
    - `Cartesian[2,3,4].getMaximumByComponent` -> `Cartesian[2,3,4].maximumByComponent`
    - `Cartesian[2,3,4].getMinimumByComponent` -> `Cartesian[2,3,4].minimumByComponent`
    - `CubicRealPolynomial.realRoots` -> `CubicRealPolynomial.computeRealRoots`
    - `CubicRealPolynomial.discriminant` -> `CubicRealPolynomial.computeDiscriminant`
    - `JulianDate.getTotalDays` -> `JulianDate.totalDyas`
    - `JulianDate.getSecondsDifference` -> `JulianDate.secondsDifference`
    - `JulianDate.getDaysDifference` -> `JulianDate.daysDifference`
    - `JulianDate.getTaiMinusUtc` -> `JulianDate.computeTaiMinusUtc`
    - `Matrix3.getEigenDecompostion` -> `Matrix3.computeEigenDecomposition`
    - `Occluder.getVisibility` -> `Occluder.computeVisibility`
    - `Occluder.getOccludeePoint` -> `Occluder.computerOccludeePoint`
    - `QuadraticRealPolynomial.discriminant` -> `QuadraticRealPolynomial.computeDiscriminant`
    - `QuadraticRealPolynomial.realRoots` -> `QuadraticRealPolynomial.computeRealRoots`
    - `QuarticRealPolynomial.discriminant` -> `QuarticRealPolynomial.computeDiscriminant`
    - `QuarticRealPolynomial.realRoots` -> `QuarticRealPolynomial.computeRealRoots`
    - `Quaternion.getAxis` -> `Quaternion.computeAxis`
    - `Quaternion.getAngle` -> `Quaternion.computeAngle`
    - `Quaternion.innerQuadrangle` -> `Quaternion.computeInnerQuadrangle`
    - `Rectangle.getSouthwest` -> `Rectangle.southwest`
    - `Rectangle.getNorthwest` -> `Rectangle.northwest`
    - `Rectangle.getSoutheast` -> `Rectangle.southeast`
    - `Rectangle.getNortheast` -> `Rectangle.northeast`
    - `Rectangle.getCenter` -> `Rectangle.center`
    - `CullingVolume.getVisibility` -> `CullingVolume.computeVisibility`
  - Replaced `PerspectiveFrustum.fovy` with `PerspectiveFrustum.fov` which will change the field of view angle in either the `X` or `Y` direction depending on the aspect ratio.
  - Removed the following from the Cesium API: `Transforms.earthOrientationParameters`, `EarthOrientationParameters`, `EarthOrientationParametersSample`, `Transforms.iau2006XysData`, `Iau2006XysData`, `Iau2006XysSample`, `IauOrientationAxes`, `TimeConstants`, `Scene.frameState`, `FrameState`, `EncodedCartesian3`, `EllipsoidalOccluder`, `TextureAtlas`, and `FAR`. These are still available but are not part of the official API and may change in future versions.
  - Removed `DynamicObject.vertexPositions`. Use `DynamicWall.positions`, `DynamicPolygon.positions`, and `DynamicPolyline.positions` instead.
  - Removed `defaultPoint`, `defaultLine`, and `defaultPolygon` from `GeoJsonDataSource`.
  - Removed `Primitive.allow3DOnly`. Set the `Scene` constructor option `scene3DOnly` instead.
  - `SampledProperty` and `SampledPositionProperty` no longer extrapolate outside of their sample data time range by default.
  - Changed the following functions to properties:
    - `TerrainProvider.hasWaterMask`
    - `CesiumTerrainProvider.hasWaterMask`
    - `ArcGisImageServerTerrainProvider.hasWaterMask`
    - `EllipsoidTerrainProvider.hasWaterMask`
    - `VRTheWorldTerrainProvider.hasWaterMask`
  - Removed `ScreenSpaceCameraController.ellipsoid`. The behavior that depended on the ellipsoid is now determined based on the scene state.
  - Sandcastle examples now automatically wrap the example code in RequireJS boilerplate. To upgrade any custom examples, copy the code into an existing example (such as Hello World) and save a new file.
  - Removed `CustomSensorVolume`, `RectangularPyramidSensorVolume`, `DynamicCone`, `DynamicConeVisualizerUsingCustomSensor`, `DynamicPyramid` and `DynamicPyramidVisualizer`. This will be moved to a plugin in early August. [#1887](https://github.com/CesiumGS/cesium/issues/1887)
  - If `Primitive.modelMatrix` is changed after creation, it only affects primitives with one instance and only in 3D mode.
  - `ImageryLayer` properties `alpha`, `brightness`, `contrast`, `hue`, `saturation`, and `gamma` may no longer be functions. If you need to change these values each frame, consider moving your logic to an event handler for `Scene.preRender`.
  - Removed `closeTop` and `closeBottom` options from `RectangleGeometry`.
  - CZML changes:
    - CZML is now versioned using the <major>.<minor> scheme. For example, any CZML 1.0 implementation will be able to load any 1.<minor> document (with graceful degradation). Major version number increases will be reserved for breaking changes. We fully expect these major version increases to happen, as CZML is still in development, but we wanted to give developers a stable target to work with.
    - A `"1.0"` version string is required to be on the document packet, which is required to be the first packet in a CZML file. Previously the `document` packet was optional; it is now mandatory. The simplest document packet is:
      ```
      {
        "id":"document",
        "version":"1.0"
      }
      ```
    - The `vertexPositions` property has been removed. There is now a `positions` property directly on objects that use it, currently `polyline`, `polygon`, and `wall`.
    - `cone`, `pyramid`, and `vector` have been removed from the core CZML schema. They are now treated as extensions maintained by Analytical Graphics and have been renamed to `agi_conicSensor`, `agi_customPatternSensor`, and `agi_vector` respectively.
    - The `orientation` property has been changed to match Cesium convention. To update existing CZML documents, conjugate the quaternion values.
    - `pixelOffset` now uses the top-left of the screen as the origin; previously it was the bottom-left. To update existing documents, negate the `y` value.
    - Removed `color`, `outlineColor`, and `outlineWidth` properties from `polyline` and `path`. There is a new `material` property that allows you to specify a variety of materials, such as `solidColor`, `polylineOutline` and `polylineGlow`.
    - See the [CZML Schema](https://github.com/CesiumGS/cesium/wiki/CZML-Content) for more details. We plan on greatly improving this document in the coming weeks.

- Added camera collision detection with terrain to the default mouse interaction.
- Modified the default camera tilt mouse behavior to tilt about the point clicked, taking into account terrain.
- Modified the default camera mouse behavior to look about the camera's position when the sky is clicked.
- Cesium can now render an unlimited number of imagery layers, no matter how few texture units are supported by the hardware.
- Added support for rendering terrain lighting with oct-encoded per-vertex normals. Added `CesiumTerrainProvider.requestVertexNormals` to request per vertex normals. Added `hasVertexNormals` property to all terrain providers to indicate whether or not vertex normals are included in the requested terrain tiles.
- Added `Globe.getHeight` and `Globe.pick` for finding the terrain height at a given Cartographic coordinate and picking the terrain with a ray.
- Added `scene3DOnly` options to `Viewer`, `CesiumWidget`, and `Scene` constructors. This setting optimizes memory usage and performance for 3D mode at the cost of losing the ability to use 2D or Columbus View.
- Added `forwardExtrapolationType`, `forwardExtrapolationDuration`, `backwardExtrapolationType`, and `backwardExtrapolationDuration` to `SampledProperty` and `SampledPositionProperty` which allows the user to specify how a property calculates its value when outside the range of its sample data.
- Prevent primitives from flashing off and on when modifying static DataSources.
- Added the following methods to `IntersectionTests`: `rayTriangle`, `lineSegmentTriangle`, `raySphere`, and `lineSegmentSphere`.
- Matrix types now have `add` and `subtract` functions.
- `Matrix3` type now has a `fromCrossProduct` function.
- Added `CesiumMath.signNotZero`, `CesiumMath.toSNorm` and `CesiumMath.fromSNorm` functions.
- DataSource & CZML models now default to North-East-Down orientation if none is provided.
- `TileMapServiceImageryProvider` now works with tilesets created by tools that better conform to the TMS specification. In particular, a profile of `global-geodetic` or `global-mercator` is now supported (in addition to the previous `geodetic` and `mercator`) and in these profiles it is assumed that the X coordinates of the bounding box correspond to the longitude direction.
- `EntityCollection` and `CompositeEntityCollection` now include the array of modified entities as the last parameter to their `onCollectionChanged` event.
- `RectangleGeometry`, `RectangleOutlineGeometry` and `RectanglePrimitive` can cross the international date line.

## Beta Releases

### b30 - 2014-07-01

- Breaking changes ([why so many?](https://community.cesium.com/t/moving-towards-cesium-1-0/1209))

  - CZML property references now use a `#` symbol to separate identifier from property path. `objectId.position` should now be `objectId#position`.
  - All `Cartesian2`, `Cartesian3`, `Cartesian4`, `TimeInterval`, and `JulianDate` functions that take a `result` parameter now require the parameter (except for functions starting with `from`).
  - Modified `Transforms.pointToWindowCoordinates` and `SceneTransforms.wgs84ToWindowCoordinates` to return window coordinates with origin at the top left corner.
  - `Billboard.pixelOffset` and `Label.pixelOffset` now have their origin at the top left corner.
  - Replaced `CameraFlightPath.createAnimation` with `Camera.flyTo` and replaced `CameraFlightPath.createAnimationRectangle` with `Camera.flyToRectangle`. Code that looked like:

            scene.animations.add(Cesium.CameraFlightPath.createAnimation(scene, {
                destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
            }));

    should now look like:

            scene.camera.flyTo({
                destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
            });

  - In `Camera.flyTo` and `Camera.flyToRectangle`:
    - `options.duration` is now in seconds, not milliseconds.
    - Renamed `options.endReferenceFrame` to `options.endTransform`.
    - Renamed `options.onComplete` to `options.complete`.
    - Renamed `options.onCancel` to `options.cancel`.
  - The following are now in seconds, not milliseconds.
    - `Scene.morphToColumbusView`, `Scene.morphTo2D`, and `Scene.morphTo3D` parameter `duration`.
    - `HomeButton` constructor parameter `options.duration`, `HomeButtonViewModel` constructor parameter `duration`, and `HomeButtonViewModel.duration`.
    - `SceneModePicker` constructor parameter `duration`, `SceneModePickerViewModel` constructor parameter `duration`, and `SceneModePickerViewModel.duration`.
    - `Geocoder` and `GeocoderViewModel` constructor parameter `options.flightDuration` and `GeocoderViewModel.flightDuration`.
    - `ScreenSpaceCameraController.bounceAnimationTime`.
    - `FrameRateMonitor` constructor parameter `options.samplingWindow`, `options.quietPeriod`, and `options.warmupPeriod`.
  - Refactored `JulianDate` to be in line with other Core types.
    - Most functions now take result parameters.
    - The default constructor no longer creates a date at the current time, use `JulianDate.now()` instead.
    - Removed `JulianDate.getJulianTimeFraction` and `JulianDate.compareTo`
    - `new JulianDate()` -> `JulianDate.now()`
    - `date.getJulianDayNumber()` -> `date.dayNumber`
    - `date.getSecondsOfDay()` -> `secondsOfDay`
    - `date.getTotalDays()` -> `JulianDate.getTotalDays(date)`
    - `date.getSecondsDifference(arg1, arg2)` -> `JulianDate.getSecondsDifference(arg2, arg1)` (Note, order of arguments flipped)
    - `date.getDaysDifference(arg1, arg2)` -> `JulianDate.getDaysDifference(arg2, arg1)` (Note, order of arguments flipped)
    - `date.getTaiMinusUtc()` -> `JulianDate.getTaiMinusUtc(date)`
    - `date.addSeconds(seconds)` -> `JulianDate.addSeconds(date, seconds)`
    - `date.addMinutes(minutes)` -> `JulianDate.addMinutes(date, minutes)`
    - `date.addHours(hours)` -> `JulianDate.addHours(date, hours)`
    - `date.addDays(days)` -> `JulianDate.addDays(date, days)`
    - `date.lessThan(right)` -> `JulianDate.lessThan(left, right)`
    - `date.lessThanOrEquals(right)` -> `JulianDate.lessThanOrEquals(left, right)`
    - `date.greaterThan(right)` -> `JulianDate.greaterThan(left, right)`
    - `date.greaterThanOrEquals(right)` -> `JulianDate.greaterThanOrEquals(left, right)`
  - Refactored `TimeInterval` to be in line with other Core types.

    - The constructor no longer requires parameters and now takes a single options parameter. Code that looked like:

            new TimeInterval(startTime, stopTime, true, true, data);

    should now look like:

            new TimeInterval({
                start : startTime,
                stop : stopTime,
                isStartIncluded : true,
                isStopIncluded : true,
                data : data
            });

    - `TimeInterval.fromIso8601` now takes a single options parameter. Code that looked like:

            TimeInterval.fromIso8601(intervalString, true, true, data);

    should now look like:

            TimeInterval.fromIso8601({
                iso8601 : intervalString,
                isStartIncluded : true,
                isStopIncluded : true,
                data : data
            });

    - `interval.intersect(otherInterval)` -> `TimeInterval.intersect(interval, otherInterval)`
    - `interval.contains(date)` -> `TimeInterval.contains(interval, date)`

  - Removed `TimeIntervalCollection.intersectInterval`.
  - `TimeIntervalCollection.findInterval` now takes a single options parameter instead of individual parameters. Code that looked like:

            intervalCollection.findInterval(startTime, stopTime, false, true);

    should now look like:

            intervalCollection.findInterval({
                start : startTime,
                stop : stopTime,
                isStartIncluded : false,
                isStopIncluded : true
            });

  - `TimeIntervalCollection.empty` was renamed to `TimeIntervalCollection.isEmpty`
  - Removed `Scene.animations` and `AnimationCollection` from the public Cesium API.
  - Replaced `color`, `outlineColor`, and `outlineWidth` in `DynamicPath` with a `material` property.
  - `ModelAnimationCollection.add` and `ModelAnimationCollection.addAll` renamed `options.startOffset` to `options.delay`. Also renamed `ModelAnimation.startOffset` to `ModelAnimation.delay`.
  - Replaced `Scene.scene2D.projection` property with read-only `Scene.mapProjection`. Set this with the `mapProjection` option for the `Viewer`, `CesiumWidget`, or `Scene` constructors.
  - Moved Fresnel, Reflection, and Refraction materials to the [Materials Pack Plugin](https://github.com/CesiumGS/cesium-materials-pack).
  - Renamed `Simon1994PlanetaryPositions` functions `ComputeSunPositionInEarthInertialFrame` and `ComputeMoonPositionInEarthInertialFrame` to `computeSunPositionInEarthInertialFrame` and `computeMoonPositionInEarthInertialFrame`, respectively.
  - `Scene` constructor function now takes an `options` parameter instead of individual parameters.
  - `CesiumWidget.showErrorPanel` now takes a `message` parameter in between the previous `title` and `error` parameters.
  - Removed `Camera.createCorrectPositionAnimation`.
  - Moved `LeapSecond.leapSeconds` to `JulianDate.leapSeconds`.
  - `Event.removeEventListener` no longer throws `DeveloperError` if the `listener` does not exist; it now returns `false`.
  - Enumeration values of `SceneMode` have better correspondence with mode names to help with debugging.
  - The build process now requires [Node.js](http://nodejs.org/) to be installed on the system.

- Cesium now supports Internet Explorer 11.0.9 on desktops. For the best results, use the new [IE Developer Channel](http://devchannel.modern.ie/) for development.
- `ReferenceProperty` can now handle sub-properties, for example, `myObject#billboard.scale`.
- `DynamicObject.id` can now include period characters.
- Added `PolylineGlowMaterialProperty` which enables data sources to use the PolylineGlow material.
- Fixed support for embedded resources in glTF models.
- Added `HermitePolynomialApproximation.interpolate` for performing interpolation when derivative information is available.
- `SampledProperty` and `SampledPositionProperty` can now store derivative information for each sample value. This allows for more accurate interpolation when using `HermitePolynomialApproximation`.
- Added `FrameRateMonitor` to monitor the frame rate achieved by a `Scene` and to raise a `lowFrameRate` event when it falls below a configurable threshold.
- Added `PerformanceWatchdog` widget and `viewerPerformanceWatchdogMixin`.
- `Viewer` and `CesiumWidget` now provide more user-friendly error messages when an initialization or rendering error occurs.
- `Viewer` and `CesiumWidget` now take a new optional parameter, `creditContainer`.
- `Viewer` can now optionally be constructed with a `DataSourceCollection`. Previously, it always created one itself internally.
- Fixed a problem that could rarely lead to the camera's `tilt` property being `NaN`.
- `GeoJsonDataSource` no longer uses the `name` or `title` property of the feature as the dynamic object's name if the value of the property is null.
- Added `TimeIntervalCollection.isStartIncluded` and `TimeIntervalCollection.isStopIncluded`.
- Added `Cesium.VERSION` to the combined `Cesium.js` file.
- Made general improvements to the [reference documentation](http://cesiumjs.org/refdoc.html).
- Updated third-party [Tween.js](https://github.com/sole/tween.js/) from r7 to r13.
- Updated third-party JSDoc 3.3.0-alpha5 to 3.3.0-alpha9.
- The development web server has been rewritten in Node.js, and is now included as part of each release.

### b29 - 2014-06-02

- Breaking changes ([why so many?](https://community.cesium.com/t/moving-towards-cesium-1-0/1209))

  - Replaced `Scene.createTextureAtlas` with `new TextureAtlas`.
  - Removed `CameraFlightPath.createAnimationCartographic`. Code that looked like:

           var flight = CameraFlightPath.createAnimationCartographic(scene, {
               destination : cartographic
           });
           scene.animations.add(flight);

    should now look like:

           var flight = CameraFlightPath.createAnimation(scene, {
               destination : ellipsoid.cartographicToCartesian(cartographic)
           });
           scene.animations.add(flight);

  - Removed `CesiumWidget.onRenderLoopError` and `Viewer.renderLoopError`. They have been replaced by `Scene.renderError`.
  - Renamed `CompositePrimitive` to `PrimitiveCollection` and added an `options` parameter to the constructor function.
  - Removed `Shapes.compute2DCircle`, `Shapes.computeCircleBoundary` and `Shapes.computeEllipseBoundary`. Instead, use `CircleOutlineGeometry` and `EllipseOutlineGeometry`. See the [tutorial](http://cesiumjs.org/2013/11/04/Geometry-and-Appearances/).
  - Removed `PolylinePipeline`, `PolygonPipeline`, `Tipsify`, `FrustumCommands`, and all `Renderer` types (except noted below) from the public Cesium API. These are still available but are not part of the official API and may change in future versions. `Renderer` types in particular are likely to change.
  - For AMD users only:
    - Moved `PixelFormat` from `Renderer` to `Core`.
    - Moved the following from `Renderer` to `Scene`: `TextureAtlas`, `TextureAtlasBuilder`, `BlendEquation`, `BlendFunction`, `BlendingState`, `CullFace`, `DepthFunction`, `StencilFunction`, and `StencilOperation`.
    - Moved the following from `Scene` to `Core`: `TerrainProvider`, `ArcGisImageServerTerrainProvider`, `CesiumTerrainProvider`, `EllipsoidTerrainProvider`, `VRTheWorldTerrainProvider`, `TerrainData`, `HeightmapTerrainData`, `QuantizedMeshTerrainData`, `TerrainMesh`, `TilingScheme`, `GeographicTilingScheme`, `WebMercatorTilingScheme`, `sampleTerrain`, `TileProviderError`, `Credit`.
  - Removed `TilingScheme.createRectangleOfLevelZeroTiles`, `GeographicTilingScheme.createLevelZeroTiles` and `WebMercatorTilingScheme.createLevelZeroTiles`.
  - Removed `CameraColumbusViewMode`.
  - Removed `Enumeration`.

- Added new functions to `Cartesian3`: `fromDegrees`, `fromRadians`, `fromDegreesArray`, `fromRadiansArray`, `fromDegreesArray3D` and `fromRadiansArray3D`. Added `fromRadians` to `Cartographic`.
- Fixed dark lighting in 3D and Columbus View when viewing a primitive edge on. ([#592](https://github.com/CesiumGS/cesium/issues/592))
- Improved Internet Explorer 11.0.8 support including workarounds for rendering labels, billboards, and the sun.
- Improved terrain and imagery rendering performance when very close to the surface.
- Added `preRender` and `postRender` events to `Scene`.
- Added `Viewer.targetFrameRate` and `CesiumWidget.targetFrameRate` to allow for throttling of the requestAnimationFrame rate.
- Added `Viewer.resolutionScale` and `CesiumWidget.resolutionScale` to allow the scene to be rendered at a resolution other than the canvas size.
- `Camera.transform` now works consistently across scene modes.
- Fixed a bug that prevented `sampleTerrain` from working with STK World Terrain in Firefox.
- `sampleTerrain` no longer fails when used with a `TerrainProvider` that is not yet ready.
- Fixed problems that could occur when using `ArcGisMapServerImageryProvider` to access a tiled MapServer of non-global extent.
- Added `interleave` option to `Primitive` constructor.
- Upgraded JSDoc from 3.0 to 3.3.0-alpha5. The Cesium reference documentation now has a slightly different look and feel.
- Upgraded Dojo from 1.9.1 to 1.9.3. NOTE: Dojo is only used in Sandcastle and not required by Cesium.

### b28 - 2014-05-01

- Breaking changes ([why so many?](https://community.cesium.com/t/breaking-changes/1132)):
  - Renamed and moved `Scene.primitives.centralBody` moved to `Scene.globe`.
  - Removed `CesiumWidget.centralBody` and `Viewer.centralBody`. Use `CesiumWidget.scene.globe` and `Viewer.scene.globe`.
  - Renamed `CentralBody` to `Globe`.
  - Replaced `Model.computeWorldBoundingSphere` with `Model.boundingSphere`.
  - Refactored visualizers, removing `setDynamicObjectCollection`, `getDynamicObjectCollection`, `getScene`, and `removeAllPrimitives` which are all superfluous after the introduction of `DataSourceDisplay`. The affected classes are:
    - `DynamicBillboardVisualizer`
    - `DynamicConeVisualizerUsingCustomSensor`
    - `DynamicLabelVisualizer`
    - `DynamicModelVisualizer`
    - `DynamicPathVisualizer`
    - `DynamicPointVisualizer`
    - `DynamicPyramidVisualizer`
    - `DynamicVectorVisualizer`
    - `GeometryVisualizer`
  - Renamed Extent to Rectangle
    - `Extent` -> `Rectangle`
    - `ExtentGeometry` -> `RectangleGeomtry`
    - `ExtentGeometryOutline` -> `RectangleGeometryOutline`
    - `ExtentPrimitive` -> `RectanglePrimitive`
    - `BoundingRectangle.fromExtent` -> `BoundingRectangle.fromRectangle`
    - `BoundingSphere.fromExtent2D` -> `BoundingSphere.fromRectangle2D`
    - `BoundingSphere.fromExtentWithHeights2D` -> `BoundingSphere.fromRectangleWithHeights2D`
    - `BoundingSphere.fromExtent3D` -> `BoundingSphere.fromRectangle3D`
    - `EllipsoidalOccluder.computeHorizonCullingPointFromExtent` -> `EllipsoidalOccluder.computeHorizonCullingPointFromRectangle`
    - `Occluder.computeOccludeePointFromExtent` -> `Occluder.computeOccludeePointFromRectangle`
    - `Camera.getExtentCameraCoordinates` -> `Camera.getRectangleCameraCoordinates`
    - `Camera.viewExtent` -> `Camera.viewRectangle`
    - `CameraFlightPath.createAnimationExtent` -> `CameraFlightPath.createAnimationRectangle`
    - `TilingScheme.extentToNativeRectangle` -> `TilingScheme.rectangleToNativeRectangle`
    - `TilingScheme.tileXYToNativeExtent` -> `TilingScheme.tileXYToNativeRectangle`
    - `TilingScheme.tileXYToExtent` -> `TilingScheme.tileXYToRectangle`
  - Converted `DataSource` get methods into properties.
    - `getName` -> `name`
    - `getClock` -> `clock`
    - `getChangedEvent` -> `changedEvent`
    - `getDynamicObjectCollection` -> `dynamicObjects`
    - `getErrorEvent` -> `errorEvent`
  - `BaseLayerPicker` has been extended to support terrain selection ([#1607](https://github.com/CesiumGS/cesium/pull/1607)).
    - The `BaseLayerPicker` constructor function now takes the container element and an options object instead of a CentralBody and ImageryLayerCollection.
    - The `BaseLayerPickerViewModel` constructor function now takes an options object instead of a `CentralBody` and `ImageryLayerCollection`.
    - `ImageryProviderViewModel` -> `ProviderViewModel`
    - `BaseLayerPickerViewModel.selectedName` -> `BaseLayerPickerViewModel.buttonTooltip`
    - `BaseLayerPickerViewModel.selectedIconUrl` -> `BaseLayerPickerViewModel.buttonImageUrl`
    - `BaseLayerPickerViewModel.selectedItem` -> `BaseLayerPickerViewModel.selectedImagery`
    - `BaseLayerPickerViewModel.imageryLayers`has been removed and replaced with `BaseLayerPickerViewModel.centralBody`
  - Renamed `TimeIntervalCollection.clear` to `TimeIntervalColection.removeAll`
  - `Context` is now private.
    - Removed `Scene.context`. Instead, use `Scene.drawingBufferWidth`, `Scene.drawingBufferHeight`, `Scene.maximumAliasedLineWidth`, and `Scene.createTextureAtlas`.
    - `Billboard.computeScreenSpacePosition`, `Label.computeScreenSpacePosition`, `SceneTransforms.clipToWindowCoordinates` and `SceneTransforms.clipToDrawingBufferCoordinates` take a `Scene` parameter instead of a `Context`.
    - `Camera` constructor takes `Scene` as parameter instead of `Context`
  - Types implementing the `ImageryProvider` interface arenow require a `hasAlphaChannel` property.
  - Removed `checkForChromeFrame` since Chrome Frame is no longer supported by Google. See [Google's official announcement](http://blog.chromium.org/2013/06/retiring-chrome-frame.html).
  - Types implementing `DataSource` no longer need to implement `getIsTimeVarying`.
- Added a `NavigationHelpButton` widget that, when clicked, displays information about how to navigate around the globe with the mouse. The new button is enabled by default in the `Viewer` widget.
- Added `Model.minimumPixelSize` property so models remain visible when the viewer zooms out.
- Added `DynamicRectangle` to support DataSource provided `RectangleGeometry`.
- Added `DynamicWall` to support DataSource provided `WallGeometry`.
- Improved texture upload performance and reduced memory usage when using `BingMapsImageryProvider` and other imagery providers that return false from `hasAlphaChannel`.
- Added the ability to offset the grid in the `GridMaterial`.
- `GeometryVisualizer` now creates geometry asynchronously to prevent locking up the browser.
- Add `Clock.canAnimate` to prevent time from advancing, even while the clock is animating.
- `Viewer` now prevents time from advancing if asynchronous geometry is being processed in order to avoid showing an incomplete picture. This can be disabled via the `Viewer.allowDataSourcesToSuspendAnimation` settings.
- Added ability to modify glTF material parameters using `Model.getMaterial`, `ModelMaterial`, and `ModelMesh.material`.
- Added `asynchronous` and `ready` properties to `Model`.
- Added `Cartesian4.fromColor` and `Color.fromCartesian4`.
- Added `getScale` and `getMaximumScale` to `Matrix2`, `Matrix3`, and `Matrix4`.
- Upgraded Knockout from version 3.0.0 to 3.1.0.
- Upgraded TopoJSON from version 1.1.4 to 1.6.8.

### b27 - 2014-04-01

- Breaking changes:

  - All `CameraController` functions have been moved up to the `Camera`. Removed `CameraController`. For example, code that looked like:

           scene.camera.controller.viewExtent(extent);

    should now look like:

           scene.camera.viewExtent(extent);

  - Finished replacing getter/setter functions with properties:
    - `ImageryLayer`
      - `getImageryProvider` -> `imageryProvider`
      - `getExtent` -> `extent`
    - `Billboard`, `Label`
      - `getShow`, `setShow` -> `show`
      - `getPosition`, `setPosition` -> `position`
      - `getPixelOffset`, `setPixelOffset` -> `pixelOffset`
      - `getTranslucencyByDistance`, `setTranslucencyByDistance` -> `translucencyByDistance`
      - `getPixelOffsetScaleByDistance`, `setPixelOffsetScaleByDistance` -> `pixelOffsetScaleByDistance`
      - `getEyeOffset`, `setEyeOffset` -> `eyeOffset`
      - `getHorizontalOrigin`, `setHorizontalOrigin` -> `horizontalOrigin`
      - `getVerticalOrigin`, `setVerticalOrigin` -> `verticalOrigin`
      - `getScale`, `setScale` -> `scale`
      - `getId` -> `id`
    - `Billboard`
      - `getScaleByDistance`, `setScaleByDistance` -> `scaleByDistance`
      - `getImageIndex`, `setImageIndex` -> `imageIndex`
      - `getColor`, `setColor` -> `color`
      - `getRotation`, `setRotation` -> `rotation`
      - `getAlignedAxis`, `setAlignedAxis` -> `alignedAxis`
      - `getWidth`, `setWidth` -> `width`
      - `getHeight` `setHeight` -> `height`
    - `Label`
      - `getText`, `setText` -> `text`
      - `getFont`, `setFont` -> `font`
      - `getFillColor`, `setFillColor` -> `fillColor`
      - `getOutlineColor`, `setOutlineColor` -> `outlineColor`
      - `getOutlineWidth`, `setOutlineWidth` -> `outlineWidth`
      - `getStyle`, `setStyle` -> `style`
    - `Polygon`
      - `getPositions`, `setPositions` -> `positions`
    - `Polyline`
      - `getShow`, `setShow` -> `show`
      - `getPositions`, `setPositions` -> `positions`
      - `getMaterial`, `setMeterial` -> `material`
      - `getWidth`, `setWidth` -> `width`
      - `getLoop`, `setLoop` -> `loop`
      - `getId` -> `id`
    - `Occluder`
      - `getPosition` -> `position`
      - `getRadius` -> `radius`
      - `setCameraPosition` -> `cameraPosition`
    - `LeapSecond`
      - `getLeapSeconds`, `setLeapSeconds` -> `leapSeconds`
    - `Fullscreen`
      - `getFullscreenElement` -> `element`
      - `getFullscreenChangeEventName` -> `changeEventName`
      - `getFullscreenErrorEventName` -> `errorEventName`
      - `isFullscreenEnabled` -> `enabled`
      - `isFullscreen` -> `fullscreen`
    - `Event`
      - `getNumberOfListeners` -> `numberOfListeners`
    - `EllipsoidGeodesic`
      - `getSurfaceDistance` -> `surfaceDistance`
      - `getStart` -> `start`
      - `getEnd` -> `end`
      - `getStartHeading` -> `startHeading`
      - `getEndHeading` -> `endHeading`
    - `AnimationCollection`
      - `getAll` -> `all`
    - `CentralBodySurface`
      - `getTerrainProvider`, `setTerrainProvider` -> `terrainProvider`
    - `Credit`
      - `getText` -> `text`
      - `getImageUrl` -> `imageUrl`
      - `getLink` -> `link`
    - `TerrainData`, `HightmapTerrainData`, `QuanitzedMeshTerrainData`
      - `getWaterMask` -> `waterMask`
    - `Tile`
      - `getChildren` -> `children`
    - `Buffer`
      - `getSizeInBytes` -> `sizeInBytes`
      - `getUsage` -> `usage`
      - `getVertexArrayDestroyable`, `setVertexArrayDestroyable` -> `vertexArrayDestroyable`
    - `CubeMap`
      - `getPositiveX` -> `positiveX`
      - `getNegativeX` -> `negativeX`
      - `getPositiveY` -> `positiveY`
      - `getNegativeY` -> `negativeY`
      - `getPositiveZ` -> `positiveZ`
      - `getNegativeZ` -> `negativeZ`
    - `CubeMap`, `Texture`
      - `getSampler`, `setSampler` -> `sampler`
      - `getPixelFormat` -> `pixelFormat`
      - `getPixelDatatype` -> `pixelDatatype`
      - `getPreMultiplyAlpha` -> `preMultiplyAlpha`
      - `getFlipY` -> `flipY`
      - `getWidth` -> `width`
      - `getHeight` -> `height`
    - `CubeMapFace`
      - `getPixelFormat` -> `pixelFormat`
      - `getPixelDatatype` -> `pixelDatatype`
    - `Framebuffer`
      - `getNumberOfColorAttachments` -> `numberOfColorAttachments`
      - `getDepthTexture` -> `depthTexture`
      - `getDepthRenderbuffer` -> `depthRenderbuffer`
      - `getStencilRenderbuffer` -> `stencilRenderbuffer`
      - `getDepthStencilTexture` -> `depthStencilTexture`
      - `getDepthStencilRenderbuffer` -> `depthStencilRenderbuffer`
      - `hasDepthAttachment` -> `hasdepthAttachment`
    - `Renderbuffer`
      - `getFormat` -> `format`
      - `getWidth` -> `width`
      - `getHeight` -> `height`
    - `ShaderProgram`
      - `getVertexAttributes` -> `vertexAttributes`
      - `getNumberOfVertexAttributes` -> `numberOfVertexAttributes`
      - `getAllUniforms` -> `allUniforms`
      - `getManualUniforms` -> `manualUniforms`
    - `Texture`
      - `getDimensions` -> `dimensions`
    - `TextureAtlas`
      - `getBorderWidthInPixels` -> `borderWidthInPixels`
      - `getTextureCoordinates` -> `textureCoordinates`
      - `getTexture` -> `texture`
      - `getNumberOfImages` -> `numberOfImages`
      - `getGUID` -> `guid`
    - `VertexArray`
      - `getNumberOfAttributes` -> `numberOfAttributes`
      - `getIndexBuffer` -> `indexBuffer`
  - Finished removing prototype functions. (Use 'static' versions of these functions instead):
    - `BoundingRectangle`
      - `union`, `expand`
    - `BoundingSphere`
      - `union`, `expand`, `getPlaneDistances`, `projectTo2D`
    - `Plane`
      - `getPointDistance`
    - `Ray`
      - `getPoint`
    - `Spherical`
      - `normalize`
    - `Extent`
      - `validate`, `getSouthwest`, `getNorthwest`, `getNortheast`, `getSoutheast`, `getCenter`, `intersectWith`, `contains`, `isEmpty`, `subsample`
  - `DataSource` now has additional required properties, `isLoading` and `loadingEvent` as well as a new optional `update` method which will be called each frame.
  - Renamed `Stripe` material uniforms `lightColor` and `darkColor` to `evenColor` and `oddColor`.
  - Replaced `SceneTransitioner` with new functions and properties on the `Scene`: `morphTo2D`, `morphToColumbusView`, `morphTo3D`, `completeMorphOnUserInput`, `morphStart`, `morphComplete`, and `completeMorph`.
  - Removed `TexturePool`.

- Improved visual quality for translucent objects with [Weighted Blended Order-Independent Transparency](http://cesiumjs.org/2014/03/14/Weighted-Blended-Order-Independent-Transparency/).
- Fixed extruded polygons rendered in the southern hemisphere. [#1490](https://github.com/CesiumGS/cesium/issues/1490)
- Fixed Primitive picking that have a closed appearance drawn on the surface. [#1333](https://github.com/CesiumGS/cesium/issues/1333)
- Added `StripeMaterialProperty` for supporting the `Stripe` material in DynamicScene.
- `loadArrayBuffer`, `loadBlob`, `loadJson`, `loadText`, and `loadXML` now support loading data from data URIs.
- The `debugShowBoundingVolume` property on primitives now works across all scene modes.
- Eliminated the use of a texture pool for Earth surface imagery textures. The use of the pool was leading to mipmapping problems in current versions of Google Chrome where some tiles would show imagery from entirely unrelated parts of the globe.

### b26 - 2014-03-03

- Breaking changes:
  - Replaced getter/setter functions with properties:
    - `Scene`
      - `getCanvas` -> `canvas`
      - `getContext` -> `context`
      - `getPrimitives` -> `primitives`
      - `getCamera` -> `camera`
      - `getScreenSpaceCameraController` -> `screenSpaceCameraController`
      - `getFrameState` -> `frameState`
      - `getAnimations` -> `animations`
    - `CompositePrimitive`
      - `getCentralBody`, `setCentralBody` -> `centralBody`
      - `getLength` -> `length`
    - `Ellipsoid`
      - `getRadii` -> `radii`
      - `getRadiiSquared` -> `radiiSquared`
      - `getRadiiToTheFourth` -> `radiiToTheFourth`
      - `getOneOverRadii` -> `oneOverRadii`
      - `getOneOverRadiiSquared` -> `oneOverRadiiSquared`
      - `getMinimumRadius` -> `minimumRadius`
      - `getMaximumRadius` -> `maximumRadius`
    - `CentralBody`
      - `getEllipsoid` -> `ellipsoid`
      - `getImageryLayers` -> `imageryLayers`
    - `EllipsoidalOccluder`
      - `getEllipsoid` -> `ellipsoid`
      - `getCameraPosition`, `setCameraPosition` -> `cameraPosition`
    - `EllipsoidTangentPlane`
      - `getEllipsoid` -> `ellipsoid`
      - `getOrigin` -> `origin`
    - `GeographicProjection`
      - `getEllipsoid` -> `ellipsoid`
    - `WebMercatorProjection`
      - `getEllipsoid` -> `ellipsoid`
    - `SceneTransitioner`
      - `getScene` -> `scene`
      - `getEllipsoid` -> `ellipsoid`
    - `ScreenSpaceCameraController`
      - `getEllipsoid`, `setEllipsoid` -> `ellipsoid`
    - `SkyAtmosphere`
      - `getEllipsoid` -> `ellipsoid`
    - `TilingScheme`, `GeographicTilingScheme`, `WebMercatorTilingSheme`
      - `getEllipsoid` -> `ellipsoid`
      - `getExtent` -> `extent`
      - `getProjection` -> `projection`
    - `ArcGisMapServerImageryProvider`, `BingMapsImageryProvider`, `GoogleEarthImageryProvider`, `GridImageryProvider`, `OpenStreetMapImageryProvider`, `SingleTileImageryProvider`, `TileCoordinatesImageryProvider`, `TileMapServiceImageryProvider`, `WebMapServiceImageryProvider`
      - `getProxy` -> `proxy`
      - `getTileWidth` -> `tileWidth`
      - `getTileHeight` -> `tileHeight`
      - `getMaximumLevel` -> `maximumLevel`
      - `getMinimumLevel` -> `minimumLevel`
      - `getTilingScheme` -> `tilingScheme`
      - `getExtent` -> `extent`
      - `getTileDiscardPolicy` -> `tileDiscardPolicy`
      - `getErrorEvent` -> `errorEvent`
      - `isReady` -> `ready`
      - `getCredit` -> `credit`
    - `ArcGisMapServerImageryProvider`, `BingMapsImageryProvider`, `GoogleEarthImageryProvider`, `OpenStreetMapImageryProvider`, `SingleTileImageryProvider`, `TileMapServiceImageryProvider`, `WebMapServiceImageryProvider`
      - `getUrl` -> `url`
    - `ArcGisMapServerImageryProvider`
      - `isUsingPrecachedTiles` - > `usingPrecachedTiles`
    - `BingMapsImageryProvider`
      - `getKey` -> `key`
      - `getMapStyle` -> `mapStyle`
    - `GoogleEarthImageryProvider`
      - `getPath` -> `path`
      - `getChannel` -> `channel`
      - `getVersion` -> `version`
      - `getRequestType` -> `requestType`
    - `WebMapServiceImageryProvider`
      - `getLayers` -> `layers`
    - `CesiumTerrainProvider`, `EllipsoidTerrainProvider`, `ArcGisImageServerTerrainProvider`, `VRTheWorldTerrainProvider`
      - `getErrorEvent` -> `errorEvent`
      - `getCredit` -> `credit`
      - `getTilingScheme` -> `tilingScheme`
      - `isReady` -> `ready`
    - `TimeIntervalCollection`
      - `getChangedEvent` -> `changedEvent`
      - `getStart` -> `start`
      - `getStop` -> `stop`
      - `getLength` -> `length`
      - `isEmpty` -> `empty`
    - `DataSourceCollection`, `ImageryLayerCollection`, `LabelCollection`, `PolylineCollection`, `SensorVolumeCollection`
      - `getLength` -> `length`
    - `BillboardCollection`
      - `getLength` -> `length`
      - `getTextureAtlas`, `setTextureAtlas` -> `textureAtlas`
      - `getDestroyTextureAtlas`, `setDestroyTextureAtlas` -> `destroyTextureAtlas`
  - Removed `Scene.getUniformState()`. Use `scene.context.getUniformState()`.
  - Visualizers no longer create a `dynamicObject` property on the primitives they create. Instead, they set the `id` property that is standard for all primitives.
  - The `propertyChanged` on DynamicScene objects has been renamed to `definitionChanged`. Also, the event is now raised in the case of an existing property being modified as well as having a new property assigned (previously only property assignment would raise the event).
  - The `visualizerTypes` parameter to the `DataSouceDisplay` has been changed to a callback function that creates an array of visualizer instances.
  - `DynamicDirectionsProperty` and `DynamicVertexPositionsProperty` were both removed, they have been superseded by `PropertyArray` and `PropertyPositionArray`, which make it easy for DataSource implementations to create time-dynamic arrays.
  - `VisualizerCollection` has been removed. It is superseded by `DataSourceDisplay`.
  - `DynamicEllipsoidVisualizer`, `DynamicPolygonVisualizer`, and `DynamicPolylineVisualizer` have been removed. They are superseded by `GeometryVisualizer` and corresponding `GeometryUpdater` implementations; `EllipsoidGeometryUpdater`, `PolygonGeometryUpdater`, `PolylineGeometryUpdater`.
  - Modified `CameraFlightPath` functions to take place in the camera's current reference frame. The arguments to the function now need to be given in world coordinates and an optional reference frame can be given when the flight is completed.
  - `PixelDatatype` properties are now JavaScript numbers, not `Enumeration` instances.
  - `combine` now takes two objects instead of an array, and defaults to copying shallow references. The `allowDuplicates` parameter has been removed. In the event of duplicate properties, the first object's properties will be used.
  - Removed `FeatureDetection.supportsCrossOriginImagery`. This check was only useful for very old versions of WebKit.
- Added `Model` for drawing 3D models using glTF. See the [tutorial](http://cesiumjs.org/2014/03/03/Cesium-3D-Models-Tutorial/) and [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=3D%20Models.html&label=Showcases).
- DynamicScene now makes use of [Geometry and Appearances](http://cesiumjs.org/2013/11/04/Geometry-and-Appearances/), which provides a tremendous improvements to DataSource visualization (CZML, GeoJSON, etc..). Extruded geometries are now supported and in many use cases performance is an order of magnitude faster.
- Added new `SelectionIndicator` and `InfoBox` widgets to `Viewer`, activated by `viewerDynamicObjectMixin`.
- `CesiumTerrainProvider` now supports mesh-based terrain like the tiles created by [STK Terrain Server](https://community.cesium.com/t/stk-terrain-server-beta/1017).
- Fixed rendering artifact on translucent objects when zooming in or out.
- Added `CesiumInspector` widget for graphics debugging. In Cesium Viewer, it is enabled by using the query parameter `inspector=true`. Also see the [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cesium%20Inspector.html&label=Showcases).
- Improved compatibility with Internet Explorer 11.
- `DynamicEllipse`, `DynamicPolygon`, and `DynamicEllipsoid` now have properties matching their geometry counterpart, i.e. `EllipseGeometry`, `EllipseOutlineGeometry`, etc. These properties are also available in CZML.
- Added a `definitionChanged` event to the `Property` interface as well as most `DynamicScene` objects. This makes it easy for a client to observe when new data is loaded into a property or object.
- Added an `isConstant` property to the `Property` interface. Constant properties do not change in regards to simulation time, i.e. `Property.getValue` will always return the same result for all times.
- `ConstantProperty` is now mutable; it's value can be updated via `ConstantProperty.setValue`.
- Improved the quality of imagery near the poles when the imagery source uses a `GeographicTilingScheme`.
- `OpenStreetMapImageryProvider` now supports imagery with a minimum level.
- `BingMapsImageryProvider` now uses HTTPS by default for metadata and tiles when the document is loaded over HTTPS.
- Added the ability for imagery providers to specify view-dependent attribution to be display in the `CreditDisplay`.
- View-dependent imagery source attribution is now added to the `CreditDisplay` by the `BingMapsImageryProvider`.
- Fixed viewing an extent. [#1431](https://github.com/CesiumGS/cesium/issues/1431)
- Fixed camera tilt in ICRF. [#544](https://github.com/CesiumGS/cesium/issues/544)
- Fixed developer error when zooming in 2D. If the zoom would create an invalid frustum, nothing is done. [#1432](https://github.com/CesiumGS/cesium/issues/1432)
- Fixed `WallGeometry` bug that failed by removing positions that were less close together by less than 6 decimal places. [#1483](https://github.com/CesiumGS/cesium/pull/1483)
- Fixed `EllipsoidGeometry` texture coordinates. [#1454](https://github.com/CesiumGS/cesium/issues/1454)
- Added a loop property to `Polyline`s to join the first and last point. [#960](https://github.com/CesiumGS/cesium/issues/960)
- Use `performance.now()` instead of `Date.now()`, when available, to limit time spent loading terrain and imagery tiles. This results in more consistent frame rates while loading tiles on some systems.
- `RequestErrorEvent` now includes the headers that were returned with the error response.
- Added `AssociativeArray`, which is a helper class for maintaining a hash of objects that also needs to be iterated often.
- Added `TimeIntervalCollection.getChangedEvent` which returns an event that will be raised whenever intervals are updated.
- Added a second parameter to `Material.fromType` to override default uniforms. [#1522](https://github.com/CesiumGS/cesium/pull/1522)
- Added `Intersections2D` class containing operations on 2D triangles.
- Added `czm_inverseViewProjection` and `czm_inverseModelViewProjection` automatic GLSL uniform.

### b25 - 2014-02-03

- Breaking changes:
  - The `Viewer` constructor argument `options.fullscreenElement` now matches the `FullscreenButton` default of `document.body`, it was previously the `Viewer` container itself.
  - Removed `Viewer.objectTracked` event; `Viewer.trackedObject` is now an ES5 Knockout observable that can be subscribed to directly.
  - Replaced `PerformanceDisplay` with `Scene.debugShowFramesPerSecond`.
  - `Asphalt`, `Blob`, `Brick`, `Cement`, `Erosion`, `Facet`, `Grass`, `TieDye`, and `Wood` materials were moved to the [Materials Pack Plugin](https://github.com/CesiumGS/cesium-materials-pack).
  - Renamed `GeometryPipeline.createAttributeIndices` to `GeometryPipeline.createAttributeLocations`.
  - Renamed `attributeIndices` property to `attributeLocations` when calling `Context.createVertexArrayFromGeometry`.
  - `PerformanceDisplay` requires a DOM element as a parameter.
- Fixed globe rendering in the current Canary version of Google Chrome.
- `Viewer` now monitors the clock settings of the first added `DataSource` for changes, and also now has a constructor option `automaticallyTrackFirstDataSourceClock` which will turn off this behavior.
- The `DynamicObjectCollection` created by `CzmlDataSource` now sends a single `collectionChanged` event after CZML is loaded; previously it was sending an event every time an object was created or removed during the load process.
- Added `ScreenSpaceCameraController.enableInputs` to fix issue with inputs not being restored after overlapping camera flights.
- Fixed picking in 2D with rotated map. [#1337](https://github.com/CesiumGS/cesium/issues/1337)
- `TileMapServiceImageryProvider` can now handle casing differences in tilemapresource.xml.
- `OpenStreetMapImageryProvider` now supports imagery with a minimum level.
- Added `Quaternion.fastSlerp` and `Quaternion.fastSquad`.
- Upgraded Tween.js to version r12.

### b24 - 2014-01-06

- Breaking changes:

  - Added `allowTextureFilterAnisotropic` (default: `true`) and `failIfMajorPerformanceCaveat` (default: `true`) properties to the `contextOptions` property passed to `Viewer`, `CesiumWidget`, and `Scene` constructors and moved the existing properties to a new `webgl` sub-property. For example, code that looked like:

           var viewer = new Viewer('cesiumContainer', {
               contextOptions : {
                 alpha : true
               }
           });

    should now look like:

           var viewer = new Viewer('cesiumContainer', {
               contextOptions : {
                 webgl : {
                   alpha : true
                 }
               }
           });

  - The read-only `Cartesian3` objects must now be cloned to camera properties instead of assigned. For example, code that looked like:

          camera.up = Cartesian3.UNIT_Z;

    should now look like:

          Cartesian3.clone(Cartesian3.UNIT_Z, camera.up);

  - The CSS files for individual widgets, e.g. `BaseLayerPicker.css`, no longer import other CSS files. Most applications should import `widgets.css` (and optionally `lighter.css`).
  - `SvgPath` has been replaced by a Knockout binding: `cesiumSvgPath`.
  - `DynamicObject.availability` is now a `TimeIntervalCollection` instead of a `TimeInterval`.
  - Removed prototype version of `BoundingSphere.transform`.
  - `Matrix4.multiplyByPoint` now returns a `Cartesian3` instead of a `Cartesian4`.

- The minified, combined `Cesium.js` file now omits certain `DeveloperError` checks, to increase performance and reduce file size. When developing your application, we recommend using the unminified version locally for early error detection, then deploying the minified version to production.
- Fixed disabling `CentralBody.enableLighting`.
- Fixed `Geocoder` flights when following an object.
- The `Viewer` widget now clears `Geocoder` input when the user clicks the home button.
- The `Geocoder` input type has been changed to `search`, which improves usability (particularly on mobile devices). There were also some other minor styling improvements.
- Added `CentralBody.maximumScreenSpaceError`.
- Added `translateEventTypes`, `zoomEventTypes`, `rotateEventTypes`, `tiltEventTypes`, and `lookEventTypes` properties to `ScreenSpaceCameraController` to change the default mouse inputs.
- Added `Billboard.setPixelOffsetScaleByDistance`, `Label.setPixelOffsetScaleByDistance`, `DynamicBillboard.pixelOffsetScaleByDistance`, and `DynamicLabel.pixelOffsetScaleByDistance` to control minimum/maximum pixelOffset scaling based on camera distance.
- Added `BoundingSphere.transformsWithoutScale`.
- Added `fromArray` function to `Matrix2`, `Matrix3` and `Matrix4`.
- Added `Matrix4.multiplyTransformation`, `Matrix4.multiplyByPointAsVector`.

### b23 - 2013-12-02

- Breaking changes:

  - Changed the `CatmulRomSpline` and `HermiteSpline` constructors from taking an array of structures to a structure of arrays. For example, code that looked like:

           var controlPoints = [
               { point: new Cartesian3(1235398.0, -4810983.0, 4146266.0), time: 0.0},
               { point: new Cartesian3(1372574.0, -5345182.0, 4606657.0), time: 1.5},
               { point: new Cartesian3(-757983.0, -5542796.0, 4514323.0), time: 3.0},
               { point: new Cartesian3(-2821260.0, -5248423.0, 4021290.0), time: 4.5},
               { point: new Cartesian3(-2539788.0, -4724797.0, 3620093.0), time: 6.0}
           ];
           var spline = new HermiteSpline(controlPoints);

    should now look like:

           var spline = new HermiteSpline({
               times : [ 0.0, 1.5, 3.0, 4.5, 6.0 ],
               points : [
                   new Cartesian3(1235398.0, -4810983.0, 4146266.0),
                   new Cartesian3(1372574.0, -5345182.0, 4606657.0),
                   new Cartesian3(-757983.0, -5542796.0, 4514323.0),
                   new Cartesian3(-2821260.0, -5248423.0, 4021290.0),
                   new Cartesian3(-2539788.0, -4724797.0, 3620093.0)
               ]
           });

  - `loadWithXhr` now takes an options object, and allows specifying HTTP method and data to send with the request.
  - Renamed `SceneTransitioner.onTransitionStart` to `SceneTransitioner.transitionStart`.
  - Renamed `SceneTransitioner.onTransitionComplete` to `SceneTransitioner.transitionComplete`.
  - Renamed `CesiumWidget.onRenderLoopError` to `CesiumWidget.renderLoopError`.
  - Renamed `SceneModePickerViewModel.onTransitionStart` to `SceneModePickerViewModel.transitionStart`.
  - Renamed `Viewer.onRenderLoopError` to `Viewer.renderLoopError`.
  - Renamed `Viewer.onDropError` to `Viewer.dropError`.
  - Renamed `CesiumViewer.onDropError` to `CesiumViewer.dropError`.
  - Renamed `viewerDragDropMixin.onDropError` to `viewerDragDropMixin.dropError`.
  - Renamed `viewerDynamicObjectMixin.onObjectTracked` to `viewerDynamicObjectMixin.objectTracked`.
  - `PixelFormat`, `PrimitiveType`, `IndexDatatype`, `TextureWrap`, `TextureMinificationFilter`, and `TextureMagnificationFilter` properties are now JavaScript numbers, not `Enumeration` instances.
  - Replaced `sizeInBytes` properties on `IndexDatatype` with `IndexDatatype.getSizeInBytes`.

- Added `perPositionHeight` option to `PolygonGeometry` and `PolygonOutlineGeometry`.
- Added `QuaternionSpline` and `LinearSpline`.
- Added `Quaternion.log`, `Quaternion.exp`, `Quaternion.innerQuadrangle`, and `Quaternion.squad`.
- Added `Matrix3.inverse` and `Matrix3.determinant`.
- Added `ObjectOrientedBoundingBox`.
- Added `Ellipsoid.transformPositionFromScaledSpace`.
- Added `Math.nextPowerOfTwo`.
- Renamed our main website from [cesium.agi.com](http://cesium.agi.com/) to [cesiumjs.org](http://cesiumjs.org/).

### b22 - 2013-11-01

- Breaking changes:
  - Reversed the rotation direction of `Matrix3.fromQuaternion` to be consistent with graphics conventions. Mirrored change in `Quaternion.fromRotationMatrix`.
  - The following prototype functions were removed:
    - From `Matrix2`, `Matrix3`, and `Matrix4`: `toArray`, `getColumn`, `setColumn`, `getRow`, `setRow`, `multiply`, `multiplyByVector`, `multiplyByScalar`, `negate`, and `transpose`.
    - From `Matrix4`: `getTranslation`, `getRotation`, `inverse`, `inverseTransformation`, `multiplyByTranslation`, `multiplyByUniformScale`, `multiplyByPoint`. For example, code that previously looked like `matrix.toArray();` should now look like `Matrix3.toArray(matrix);`.
  - Replaced `DynamicPolyline` `color`, `outlineColor`, and `outlineWidth` properties with a single `material` property.
  - Renamed `DynamicBillboard.nearFarScalar` to `DynamicBillboard.scaleByDistance`.
  - All data sources must now implement `DataSource.getName`, which returns a user-readable name for the data source.
  - CZML `document` objects are no longer added to the `DynamicObjectCollection` created by `CzmlDataSource`. Use the `CzmlDataSource` interface to access the data instead.
  - `TimeInterval.equals`, and `TimeInterval.equalsEpsilon` now compare interval data as well.
  - All SVG files were deleted from `Widgets/Images` and replaced by a new `SvgPath` class.
  - The toolbar widgets (Home, SceneMode, BaseLayerPicker) and the fullscreen button now depend on `CesiumWidget.css` for global Cesium button styles.
  - The toolbar widgets expect their `container` to be the toolbar itself now, no need for separate containers for each widget on the bar.
  - `Property` implementations are now required to implement a prototype `equals` function.
  - `ConstantProperty` and `TimeIntervalCollectionProperty` no longer take a `clone` function and instead require objects to implement prototype `clone` and `equals` functions.
  - The `SkyBox` constructor now takes an `options` argument with a `sources` property, instead of directly taking `sources`.
  - Replaced `SkyBox.getSources` with `SkyBox.sources`.
  - The `bearing` property of `DynamicEllipse` is now called `rotation`.
  - CZML `ellipse.bearing` property is now `ellipse.rotation`.
- Added a `Geocoder` widget that allows users to enter an address or the name of a landmark and zoom to that location. It is enabled by default in applications that use the `Viewer` widget.
- Added `GoogleEarthImageryProvider`.
- Added `Moon` for drawing the moon, and `IauOrientationAxes` for computing the Moon's orientation.
- Added `Material.translucent` property. Set this property or `Appearance.translucent` for correct rendering order. Translucent geometries are rendered after opaque geometries.
- Added `enableLighting`, `lightingFadeOutDistance`, and `lightingFadeInDistance` properties to `CentralBody` to configure lighting.
- Added `Billboard.setTranslucencyByDistance`, `Label.setTranslucencyByDistance`, `DynamicBillboard.translucencyByDistance`, and `DynamicLabel.translucencyByDistance` to control minimum/maximum translucency based on camera distance.
- Added `PolylineVolumeGeometry` and `PolylineVolumeGeometryOutline`.
- Added `Shapes.compute2DCircle`.
- Added `Appearances` tab to Sandcastle with an example for each geometry appearance.
- Added `Scene.drillPick` to return list of objects each containing 1 primitive at a screen space position.
- Added `PolylineOutlineMaterialProperty` for use with `DynamicPolyline.material`.
- Added the ability to use `Array` and `JulianDate` objects as custom CZML properties.
- Added `DynamicObject.name` and corresponding CZML support. This is a non-unique, user-readable name for the object.
- Added `DynamicObject.parent` and corresponding CZML support. This allows for `DataSource` objects to present data hierarchically.
- Added `DynamicPoint.scaleByDistance` to control minimum/maximum point size based on distance from the camera.
- The toolbar widgets (Home, SceneMode, BaseLayerPicker) and the fullscreen button can now be styled directly with user-supplied CSS.
- Added `skyBox` to the `CesiumWidget` and `Viewer` constructors for changing the default stars.
- Added `Matrix4.fromTranslationQuaternionRotationScale` and `Matrix4.multiplyByScale`.
- Added `Matrix3.getEigenDecomposition`.
- Added utility function `getFilenameFromUri`, which given a URI with or without query parameters, returns the last segment of the URL.
- Added prototype versions of `equals` and `equalsEpsilon` method back to `Cartesian2`, `Cartesian3`, `Cartesian4`, and `Quaternion`.
- Added prototype equals function to `NearFarScalar`, and `TimeIntervalCollection`.
- Added `FrameState.events`.
- Added `Primitive.allowPicking` to save memory when picking is not needed.
- Added `debugShowBoundingVolume`, for debugging primitive rendering, to `Primitive`, `Polygon`, `ExtentPrimitive`, `EllipsoidPrimitive`, `BillboardCollection`, `LabelCollection`, and `PolylineCollection`.
- Added `DebugModelMatrixPrimitive` for debugging primitive's `modelMatrix`.
- Added `options` argument to the `EllipsoidPrimitive` constructor.
- Upgraded Knockout from version 2.3.0 to 3.0.0.
- Upgraded RequireJS to version 2.1.9, and Almond to 0.2.6.
- Added a user-defined `id` to all primitives for use with picking. For example:

            primitives.add(new Polygon({
                id : {
                    // User-defined object returned by Scene.pick
                },
                // ...
            }));
            // ...
            var p = scene.pick(/* ... */);
            if (defined(p) && defined(p.id)) {
               // Use properties and functions in p.id
            }

### b21 - 2013-10-01

- Breaking changes:

  - Cesium now prints a reminder to the console if your application uses Bing Maps imagery and you do not supply a Bing Maps key for your application. This is a reminder that you should create a Bing Maps key for your application as soon as possible and prior to deployment. You can generate a Bing Maps key by visiting [https://www.bingmapsportal.com/](https://www.bingmapsportal.com/). Set the `BingMapsApi.defaultKey` property to the value of your application's key before constructing the `CesiumWidget` or any other types that use the Bing Maps API.

           BingMapsApi.defaultKey = 'my-key-generated-with-bingmapsportal.com';

  - `Scene.pick` now returns an object with a `primitive` property, not the primitive itself. For example, code that looked like:

           var primitive = scene.pick(/* ... */);
           if (defined(primitive)) {
              // Use primitive
           }

    should now look like:

           var p = scene.pick(/* ... */);
           if (defined(p) && defined(p.primitive)) {
              // Use p.primitive
           }

  - Removed `getViewMatrix`, `getInverseViewMatrix`, `getInverseTransform`, `getPositionWC`, `getDirectionWC`, `getUpWC` and `getRightWC` from `Camera`. Instead, use the `viewMatrix`, `inverseViewMatrix`, `inverseTransform`, `positionWC`, `directionWC`, `upWC`, and `rightWC` properties.
  - Removed `getProjectionMatrix` and `getInfiniteProjectionMatrix` from `PerspectiveFrustum`, `PerspectiveOffCenterFrustum` and `OrthographicFrustum`. Instead, use the `projectionMatrix` and `infiniteProjectionMatrix` properties.
  - The following prototype functions were removed:

    - From `Quaternion`: `conjugate`, `magnitudeSquared`, `magnitude`, `normalize`, `inverse`, `add`, `subtract`, `negate`, `dot`, `multiply`, `multiplyByScalar`, `divideByScalar`, `getAxis`, `getAngle`, `lerp`, `slerp`, `equals`, `equalsEpsilon`
    - From `Cartesian2`, `Cartesian3`, and `Cartesian4`: `getMaximumComponent`, `getMinimumComponent`, `magnitudeSquared`, `magnitude`, `normalize`, `dot`, `multiplyComponents`, `add`, `subtract`, `multiplyByScalar`, `divideByScalar`, `negate`, `abs`, `lerp`, `angleBetween`, `mostOrthogonalAxis`, `equals`, and `equalsEpsilon`.
    - From `Cartesian3`: `cross`

    Code that previously looked like `quaternion.magnitude();` should now look like `Quaternion.magnitude(quaternion);`.

  - `DynamicObjectCollection` and `CompositeDynamicObjectCollection` have been largely re-written, see the documentation for complete details. Highlights include:
    - `getObject` has been renamed `getById`.
    - `removeObject` has been renamed `removeById`.
    - `collectionChanged` event added for notification of objects being added or removed.
  - `DynamicScene` graphics object (`DynamicBillboard`, etc...) have had their static `mergeProperties` and `clean` functions removed.
  - `UniformState.update` now takes a context as its first parameter.
  - `Camera` constructor now takes a context instead of a canvas.
  - `SceneTransforms.clipToWindowCoordinates` now takes a context instead of a canvas.
  - Removed `canvasDimensions` from `FrameState`.
  - Removed `context` option from `Material` constructor and parameter from `Material.fromType`.
  - Renamed `TextureWrap.CLAMP` to `TextureWrap.CLAMP_TO_EDGE`.

- Added `Geometries` tab to Sandcastle with an example for each geometry type.
- Added `CorridorOutlineGeometry`.
- Added `PolylineGeometry`, `PolylineColorAppearance`, and `PolylineMaterialAppearance`.
- Added `colors` option to `SimplePolylineGeometry` for per vertex or per segment colors.
- Added proper support for browser zoom.
- Added `propertyChanged` event to `DynamicScene` graphics objects for receiving change notifications.
- Added prototype `clone` and `merge` functions to `DynamicScene` graphics objects.
- Added `width`, `height`, and `nearFarScalar` properties to `DynamicBillboard` for controlling the image size.
- Added `heading` and `tilt` properties to `CameraController`.
- Added `Scene.sunBloom` to enable/disable the bloom filter on the sun. The bloom filter should be disabled for better frame rates on mobile devices.
- Added `getDrawingBufferWidth` and `getDrawingBufferHeight` to `Context`.
- Added new built-in GLSL functions `czm_getLambertDiffuse` and `czm_getSpecular`.
- Added support for [EXT_frag_depth](http://www.khronos.org/registry/webgl/extensions/EXT_frag_depth/).
- Improved graphics performance.
  - An Everest terrain view went from 135-140 to over 150 frames per second.
  - Rendering over a thousand polylines in the same collection with different materials went from 20 to 40 frames per second.
- Improved runtime generation of GLSL shaders.
- Made sun size accurate.
- Fixed bug in triangulation that fails on complex polygons. Instead, it makes a best effort to render what it can. [#1121](https://github.com/CesiumGS/cesium/issues/1121)
- Fixed geometries not closing completely. [#1093](https://github.com/CesiumGS/cesium/issues/1093)
- Fixed `EllipsoidTangentPlane.projectPointOntoPlane` for tangent planes on an ellipsoid other than the unit sphere.
- `CompositePrimitive.add` now returns the added primitive. This allows us to write more concise code.

        var p = new Primitive(/* ... */);
        primitives.add(p);
        return p;

  becomes

        return primitives.add(new Primitive(/* ... */));

### b20 - 2013-09-03

_This releases fixes 2D and other issues with Chrome 29.0.1547.57 ([#1002](https://github.com/CesiumGS/cesium/issues/1002) and [#1047](https://github.com/CesiumGS/cesium/issues/1047))._

- Breaking changes:

  - The `CameraFlightPath` functions `createAnimation`, `createAnimationCartographic`, and `createAnimationExtent` now take `scene` as their first parameter instead of `frameState`.
  - Completely refactored the `DynamicScene` property system to vastly improve the API. See [#1080](https://github.com/CesiumGS/cesium/pull/1080) for complete details.
    - Removed `CzmlBoolean`, `CzmlCartesian2`, `CzmlCartesian3`, `CzmlColor`, `CzmlDefaults`, `CzmlDirection`, `CzmlHorizontalOrigin`, `CzmlImage`, `CzmlLabelStyle`, `CzmlNumber`, `CzmlPosition`, `CzmlString`, `CzmlUnitCartesian3`, `CzmlUnitQuaternion`, `CzmlUnitSpherical`, and `CzmlVerticalOrigin` since they are no longer needed.
    - Removed `DynamicProperty`, `DynamicMaterialProperty`, `DynamicDirectionsProperty`, and `DynamicVertexPositionsProperty`; replacing them with an all new system of properties.
      - `Property` - base interface for all properties.
      - `CompositeProperty` - a property composed of other properties.
      - `ConstantProperty` - a property whose value never changes.
      - `SampledProperty` - a property whose value is interpolated from a set of samples.
      - `TimeIntervalCollectionProperty` - a property whose value changes based on time interval.
      - `MaterialProperty` - base interface for all material properties.
      - `CompositeMaterialProperty` - a `CompositeProperty` for materials.
      - `ColorMaterialProperty` - a property that maps to a color material. (replaces `DynamicColorMaterial`)
      - `GridMaterialProperty` - a property that maps to a grid material. (replaces `DynamicGridMaterial`)
      - `ImageMaterialProperty` - a property that maps to an image material. (replaces `DynamicImageMaterial`)
      - `PositionProperty`- base interface for all position properties.
      - `CompositePositionProperty` - a `CompositeProperty` for positions.
      - `ConstantPositionProperty` - a `PositionProperty` whose value does not change in respect to the `ReferenceFrame` in which is it defined.
      - `SampledPositionProperty` - a `SampledProperty` for positions.
      - `TimeIntervalCollectionPositionProperty` - A `TimeIntervalCollectionProperty` for positions.
  - Removed `processCzml`, use `CzmlDataSource` instead.
  - `Source/Widgets/Viewer/lighter.css` was deleted, use `Source/Widgets/lighter.css` instead.
  - Replaced `ExtentGeometry` parameters for extruded extent to make them consistent with other geometries.
    - `options.extrudedOptions.height` -> `options.extrudedHeight`
    - `options.extrudedOptions.closeTop` -> `options.closeBottom`
    - `options.extrudedOptions.closeBottom` -> `options.closeTop`
  - Geometry constructors no longer compute vertices or indices. Use the type's `createGeometry` method. For example, code that looked like:

          var boxGeometry = new BoxGeometry({
            minimumCorner : min,
            maximumCorner : max,
            vertexFormat : VertexFormat.POSITION_ONLY
          });

    should now look like:

          var box = new BoxGeometry({
              minimumCorner : min,
              maximumCorner : max,
              vertexFormat : VertexFormat.POSITION_ONLY
          });
          var geometry = BoxGeometry.createGeometry(box);

  - Removed `createTypedArray` and `createArrayBufferView` from each of the `ComponentDatatype` enumerations. Instead, use `ComponentDatatype.createTypedArray` and `ComponentDatatype.createArrayBufferView`.
  - `DataSourceDisplay` now requires a `DataSourceCollection` to be passed into its constructor.
  - `DeveloperError` and `RuntimeError` no longer contain an `error` property. Call `toString`, or check the `stack` property directly instead.
  - Replaced `createPickFragmentShaderSource` with `createShaderSource`.
  - Renamed `PolygonPipeline.earClip2D` to `PolygonPipeline.triangulate`.

- Added outline geometries. [#1021](https://github.com/CesiumGS/cesium/pull/1021).
- Added `CorridorGeometry`.
- Added `Billboard.scaleByDistance` and `NearFarScalar` to control billboard minimum/maximum scale based on camera distance.
- Added `EllipsoidGeodesic`.
- Added `PolylinePipeline.scaleToSurface`.
- Added `PolylinePipeline.scaleToGeodeticHeight`.
- Added the ability to specify a `minimumTerrainLevel` and `maximumTerrainLevel` when constructing an `ImageryLayer`. The layer will only be shown for terrain tiles within the specified range.
- Added `Math.setRandomNumberSeed` and `Math.nextRandomNumber` for generating repeatable random numbers.
- Added `Color.fromRandom` to generate random and partially random colors.
- Added an `onCancel` callback to `CameraFlightPath` functions that will be executed if the flight is canceled.
- Added `Scene.debugShowFrustums` and `Scene.debugFrustumStatistics` for rendering debugging.
- Added `Packable` and `PackableForInterpolation` interfaces to aid interpolation and in-memory data storage. Also made most core Cesium types implement them.
- Added `InterpolationAlgorithm` interface to codify the base interface already being used by `LagrangePolynomialApproximation`, `LinearApproximation`, and `HermitePolynomialApproximation`.
- Improved the performance of polygon triangulation using an O(n log n) algorithm.
- Improved geometry batching performance by moving work to a web worker.
- Improved `WallGeometry` to follow the curvature of the earth.
- Improved visual quality of closed translucent geometries.
- Optimized polyline bounding spheres.
- `Viewer` now automatically sets its clock to that of the first added `DataSource`, regardless of how it was added to the `DataSourceCollection`. Previously, this was only done for dropped files by `viewerDragDropMixin`.
- `CesiumWidget` and `Viewer` now display an HTML error panel if an error occurs while rendering, which can be disabled with a constructor option.
- `CameraFlightPath` now automatically disables and restores mouse input for the flights it generates.
- Fixed broken surface rendering in Columbus View when using the `EllipsoidTerrainProvider`.
- Fixed triangulation for polygons that cross the international date line.
- Fixed `EllipsoidPrimitive` rendering for some oblate ellipsoids. [#1067](https://github.com/CesiumGS/cesium/pull/1067).
- Fixed Cesium on Nexus 4 with Android 4.3.
- Upgraded Knockout from version 2.2.1 to 2.3.0.

### b19 - 2013-08-01

- Breaking changes:
  - Replaced tessellators and meshes with geometry. In particular:
    - Replaced `CubeMapEllipsoidTessellator` with `EllipsoidGeometry`.
    - Replaced `BoxTessellator` with `BoxGeometry`.
    - Replaced `ExtentTessletaor` with `ExtentGeometry`.
    - Removed `PlaneTessellator`. It was incomplete and not used.
    - Renamed `MeshFilters` to `GeometryPipeline`.
    - Renamed `MeshFilters.toWireframeInPlace` to `GeometryPipeline.toWireframe`.
    - Removed `MeshFilters.mapAttributeIndices`. It was not used.
    - Renamed `Context.createVertexArrayFromMesh` to `Context.createVertexArrayFromGeometry`. Likewise, renamed `mesh` constructor property to `geometry`.
  - Renamed `ComponentDatatype.*.toTypedArray` to `ComponentDatatype.*.createTypedArray`.
  - Removed `Polygon.configureExtent`. Use `ExtentPrimitive` instead.
  - Removed `Polygon.bufferUsage`. It is no longer needed.
  - Removed `height` and `textureRotationAngle` arguments from `Polygon` `setPositions` and `configureFromPolygonHierarchy` functions. Use `Polygon` `height` and `textureRotationAngle` properties.
  - Renamed `PolygonPipeline.cleanUp` to `PolygonPipeline.removeDuplicates`.
  - Removed `PolygonPipeline.wrapLongitude`. Use `GeometryPipeline.wrapLongitude` instead.
  - Added `surfaceHeight` parameter to `BoundingSphere.fromExtent3D`.
  - Added `surfaceHeight` parameter to `Extent.subsample`.
  - Renamed `pointInsideTriangle2D` to `pointInsideTriangle`.
  - Renamed `getLogo` to `getCredit` for `ImageryProvider` and `TerrainProvider`.
- Added Geometry and Appearances [#911](https://github.com/CesiumGS/cesium/pull/911).
- Added property `intersectionWidth` to `DynamicCone`, `DynamicPyramid`, `CustomSensorVolume`, and `RectangularPyramidSensorVolume`.
- Added `ExtentPrimitive`.
- Added `PolylinePipeline.removeDuplicates`.
- Added `barycentricCoordinates` to compute the barycentric coordinates of a point in a triangle.
- Added `BoundingSphere.fromEllipsoid`.
- Added `BoundingSphere.projectTo2D`.
- Added `Extent.fromDegrees`.
- Added `czm_tangentToEyeSpaceMatrix` built-in GLSL function.
- Added debugging aids for low-level rendering: `DrawCommand.debugShowBoundingVolume` and `Scene.debugCommandFilter`.
- Added extrusion to `ExtentGeometry`.
- Added `Credit` and `CreditDisplay` for displaying credits on the screen.
- Improved performance and visual quality of `CustomSensorVolume` and `RectangularPyramidSensorVolume`.
- Improved the performance of drawing polygons created with `configureFromPolygonHierarchy`.

### b18 - 2013-07-01

- Breaking changes:
  - Removed `CesiumViewerWidget` and replaced it with a new `Viewer` widget with mixin architecture. This new widget does not depend on Dojo and is part of the combined Cesium.js file. It is intended to be a flexible base widget for easily building robust applications. ([#838](https://github.com/CesiumGS/cesium/pull/838))
  - Changed all widgets to use ECMAScript 5 properties. All public observable properties now must be accessed and assigned as if they were normal properties, instead of being called as functions. For example:
    - `clockViewModel.shouldAnimate()` -> `clockViewModel.shouldAnimate`
    - `clockViewModel.shouldAnimate(true);` -> `clockViewModel.shouldAnimate = true;`
  - `ImageryProviderViewModel.fromConstants` has been removed. Use the `ImageryProviderViewModel` constructor directly.
  - Renamed the `transitioner` property on `CesiumWidget`, `HomeButton`, and `ScreenModePicker` to `sceneTrasitioner` to be consistent with property naming convention.
  - `ImageryProvider.loadImage` now requires that the calling imagery provider instance be passed as its first parameter.
  - Removed the Dojo-based `checkForChromeFrame` function, and replaced it with a new standalone version that returns a promise to signal when the asynchronous check has completed.
  - Removed `Assets/Textures/NE2_LR_LC_SR_W_DR_2048.jpg`. If you were previously using this image with `SingleTileImageryProvider`, consider instead using `TileMapServiceImageryProvider` with a URL of `Assets/Textures/NaturalEarthII`.
  - The `Client CZML` SandCastle demo has been removed, largely because it is redundant with the Simple CZML demo.
  - The `Two Viewer Widgets` SandCastle demo has been removed. We will add back a multi-scene example when we have a good architecture for it in place.
  - Changed static `clone` functions in all objects such that if the object being cloned is undefined, the function will return undefined instead of throwing an exception.
- Fix resizing issues in `CesiumWidget` ([#608](https://github.com/CesiumGS/cesium/issues/608), [#834](https://github.com/CesiumGS/cesium/issues/834)).
- Added initial support for [GeoJSON](http://www.geojson.org/) and [TopoJSON](https://github.com/mbostock/topojson). ([#890](https://github.com/CesiumGS/cesium/pull/890), [#906](https://github.com/CesiumGS/cesium/pull/906))
- Added rotation, aligned axis, width, and height properties to `Billboard`s.
- Improved the performance of "missing tile" checking, especially for Bing imagery.
- Improved the performance of terrain and imagery refinement, especially when using a mixture of slow and fast imagery sources.
- `TileMapServiceImageryProvider` now supports imagery with a minimum level. This improves compatibility with tile sets generated by MapTiler or gdal2tiles.py using their default settings.
- Added `Context.getAntialias`.
- Improved test robustness on Mac.
- Upgraded RequireJS to version 2.1.6, and Almond to 0.2.5.
- Fixed artifacts that showed up on the edges of imagery tiles on a number of GPUs.
- Fixed an issue in `BaseLayerPicker` where destroy wasn't properly cleaning everything up.
- Added the ability to unsubscribe to `Timeline` update event.
- Added a `screenSpaceEventHandler` property to `CesiumWidget`. Also added a `sceneMode` option to the constructor to set the initial scene mode.
- Added `useDefaultRenderLoop` property to `CesiumWidget` that allows the default render loop to be disabled so that a custom render loop can be used.
- Added `CesiumWidget.onRenderLoopError` which is an `Event` that is raised if an exception is generated inside of the default render loop.
- `ImageryProviderViewModel.creationCommand` can now return an array of ImageryProvider instances, which allows adding multiple layers when a single item is selected in the `BaseLayerPicker` widget.

### b17 - 2013-06-03

- Breaking changes:
  - Replaced `Uniform.getFrameNumber` and `Uniform.getTime` with `Uniform.getFrameState`, which returns the full frame state.
  - Renamed `Widgets/Fullscreen` folder to `Widgets/FullscreenButton` along with associated objects/files.
    - `FullscreenWidget` -> `FullscreenButton`
    - `FullscreenViewModel` -> `FullscreenButtonViewModel`
  - Removed `addAttribute`, `removeAttribute`, and `setIndexBuffer` from `VertexArray`. They were not used.
- Added support for approximating local vertical, local horizontal (LVLH) reference frames when using `DynamicObjectView` in 3D. The object automatically selects LVLH or EastNorthUp based on the object's velocity.
- Added support for CZML defined vectors via new `CzmlDirection`, `DynamicVector`, and `DynamicVectorVisualizer` objects.
- Added `SceneTransforms.wgs84ToWindowCoordinates`. [#746](https://github.com/CesiumGS/cesium/issues/746).
- Added `fromElements` to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
- Added `DrawCommand.cull` to avoid redundant visibility checks.
- Added `czm_morphTime` automatic GLSL uniform.
- Added support for [OES_vertex_array_object](http://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/), which improves rendering performance.
- Added support for floating-point textures.
- Added `IntersectionTests.trianglePlaneIntersection`.
- Added `computeHorizonCullingPoint`, `computeHorizonCullingPointFromVertices`, and `computeHorizonCullingPointFromExtent` methods to `EllipsoidalOccluder` and used them to build a more accurate horizon occlusion test for terrain rendering.
- Added sun visualization. See `Sun` and `Scene.sun`.
- Added a new `HomeButton` widget for returning to the default view of the current scene mode.
- Added `Command.beforeExecute` and `Command.afterExecute` events to enable additional processing when a command is executed.
- Added rotation parameter to `Polygon.configureExtent`.
- Added camera flight to extents. See new methods `CameraController.getExtentCameraCoordinates` and `CameraFlightPath.createAnimationExtent`.
- Improved the load ordering of terrain and imagery tiles, so that relevant detail is now more likely to be loaded first.
- Improved appearance of the Polyline arrow material.
- Fixed polyline clipping artifact. [#728](https://github.com/CesiumGS/cesium/issues/728).
- Fixed polygon crossing International Date Line for 2D and Columbus view. [#99](https://github.com/CesiumGS/cesium/issues/99).
- Fixed issue for camera flights when `frameState.mode === SceneMode.MORPHING`.
- Fixed ISO8601 date parsing when UTC offset is specified in the extended format, such as `2008-11-10T14:00:00+02:30`.

### b16 - 2013-05-01

- Breaking changes:

  - Removed the color, outline color, and outline width properties of polylines. Instead, use materials for polyline color and outline properties. Code that looked like:

           var polyline = polylineCollection.add({
               positions : positions,
               color : new Color(1.0, 1.0, 1.0, 1.0),
               outlineColor : new Color(1.0, 0.0, 0.0, 1.0),
               width : 1.0,
               outlineWidth : 3.0
           });

    should now look like:

           var outlineMaterial = Material.fromType(context, Material.PolylineOutlineType);
           outlineMaterial.uniforms.color = new Color(1.0, 1.0, 1.0, 1.0);
           outlineMaterial.uniforms.outlineColor = new Color(1.0, 0.0, 0.0, 1.0);
           outlineMaterial.uniforms.outlinewidth = 2.0;

           var polyline = polylineCollection.add({
               positions : positions,
               width : 3.0,
               material : outlineMaterial
           });

  - `CzmlCartographic` has been removed and all cartographic values are converted to Cartesian internally during CZML processing. This improves performance and fixes interpolation of cartographic source data. The Cartographic representation can still be retrieved if needed.
  - Removed `ComplexConicSensorVolume`, which was not documented and did not work on most platforms. It will be brought back in a future release. This does not affect CZML, which uses a custom sensor to approximate a complex conic.
  - Replaced `computeSunPosition` with `Simon1994PlanetaryPosition`, which has functions to calculate the position of the sun and the moon more accurately.
  - Removed `Context.createClearState`. These properties are now part of `ClearCommand`.
  - `RenderState` objects returned from `Context.createRenderState` are now immutable.
  - Removed `positionMC` from `czm_materialInput`. It is no longer used by any materials.

- Added wide polylines that work with and without ANGLE.
- Polylines now use materials to describe their surface appearance. See the [Fabric](https://github.com/CesiumGS/cesium/wiki/Fabric) wiki page for more details on how to create materials.
- Added new `PolylineOutline`, `PolylineGlow`, `PolylineArrow`, and `Fade` materials.
- Added `czm_pixelSizeInMeters` automatic GLSL uniform.
- Added `AnimationViewModel.snapToTicks`, which when set to true, causes the shuttle ring on the Animation widget to snap to the defined tick values, rather than interpolate between them.
- Added `Color.toRgba` and `Color.fromRgba` to convert to/from numeric unsigned 32-bit RGBA values.
- Added `GridImageryProvider` for custom rendering effects and debugging.
- Added new `Grid` material.
- Made `EllipsoidPrimitive` double-sided.
- Improved rendering performance by minimizing WebGL state calls.
- Fixed an error in Web Worker creation when loading Cesium.js from a different origin.
- Fixed `EllipsoidPrimitive` picking and picking objects with materials that have transparent parts.
- Fixed imagery smearing artifacts on mobile devices and other devices without high-precision fragment shaders.

### b15 - 2013-04-01

- Breaking changes:
  - `Billboard.computeScreenSpacePosition` now takes `Context` and `FrameState` arguments instead of a `UniformState` argument.
  - Removed `clampToPixel` property from `BillboardCollection` and `LabelCollection`. This option is no longer needed due to overall LabelCollection visualization improvements.
  - Removed `Widgets/Dojo/CesiumWidget` and replaced it with `Widgets/CesiumWidget`, which has no Dojo dependancies.
  - `destroyObject` no longer deletes properties from the object being destroyed.
  - `darker.css` files have been deleted and the `darker` theme is now the default style for widgets. The original theme is now known as `lighter` and is in corresponding `lighter.css` files.
  - CSS class names have been standardized to avoid potential collisions. All widgets now follow the same pattern, `cesium-<widget>-<className>`.
  - Removed `view2D`, `view3D`, and `viewColumbus` properties from `CesiumViewerWidget`. Use the `sceneTransitioner` property instead.
- Added `BoundingSphere.fromCornerPoints`.
- Added `fromArray` and `distance` functions to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
- Added `DynamicPath.resolution` property for setting the maximum step size, in seconds, to take when sampling a position for path visualization.
- Added `TileCoordinatesImageryProvider` that renders imagery with tile X, Y, Level coordinates on the surface of the globe. This is mostly useful for debugging.
- Added `DynamicEllipse` and `DynamicObject.ellipse` property to render CZML ellipses on the globe.
- Added `sampleTerrain` function to sample the terrain height of a list of `Cartographic` positions.
- Added `DynamicObjectCollection.removeObject` and handling of the new CZML `delete` property.
- Imagery layers with an `alpha` of exactly 0.0 are no longer rendered. Previously these invisible layers were rendered normally, which was a waste of resources. Unlike the `show` property, imagery tiles in a layer with an `alpha` of 0.0 are still downloaded, so the layer will become visible more quickly when its `alpha` is increased.
- Added `onTransitionStart` and `onTransitionComplete` events to `SceneModeTransitioner`.
- Added `SceneModePicker`; a new widget for morphing between scene modes.
- Added `BaseLayerPicker`; a new widget for switching among pre-configured base layer imagery providers.

### b14 - 2013-03-01

- Breaking changes:
  - Major refactoring of both animation and widgets systems as we move to an MVVM-like architecture for user interfaces.
    - New `Animation` widget for controlling playback.
    - AnimationController.js has been deleted.
    - `ClockStep.SYSTEM_CLOCK_DEPENDENT` was renamed to `ClockStep.SYSTEM_CLOCK_MULTIPLIER`.
    - `ClockStep.SYSTEM_CLOCK` was added to have the clock always match the system time.
    - `ClockRange.LOOP` was renamed to `ClockRange.LOOP_STOP` and now only loops in the forward direction.
    - `Clock.reverseTick` was removed, simply negate `Clock.multiplier` and pass it to `Clock.tick`.
    - `Clock.shouldAnimate` was added to indicate if `Clock.tick` should actually advance time.
    - The Timeline widget was moved into the Widgets/Timeline subdirectory.
    - `Dojo/TimelineWidget` was removed. You should use the non-toolkit specific Timeline widget directly.
  - Removed `CesiumViewerWidget.fullScreenElement`, instead use the `CesiumViewerWidget.fullscreen.viewModel.fullScreenElement` observable property.
  - `IntersectionTests.rayPlane` now takes the new `Plane` type instead of separate `planeNormal` and `planeD` arguments.
  - Renamed `ImageryProviderError` to `TileProviderError`.
- Added support for global terrain visualization via `CesiumTerrainProvider`, `ArcGisImageServerTerrainProvider`, and `VRTheWorldTerrainProvider`. See the [Terrain Tutorial](http://cesiumjs.org/2013/02/15/Cesium-Terrain-Tutorial/) for more information.
- Added `FullscreenWidget` which is a simple, single-button widget that toggles fullscreen mode of the specified element.
- Added interactive extent drawing to the `Picking` Sandcastle example.
- Added `HeightmapTessellator` to create a mesh from a heightmap.
- Added `JulianDate.equals`.
- Added `Plane` for representing the equation of a plane.
- Added a line segment-plane intersection test to `IntersectionTests`.
- Improved the lighting used in 2D and Columbus View modes. In general, the surface lighting in these modes should look just like it does in 3D.
- Fixed an issue where a `PolylineCollection` with a model matrix other than the identity would be incorrectly rendered in 2D and Columbus view.
- Fixed an issue in the `ScreenSpaceCameraController` where disabled mouse events can cause the camera to be moved after being re-enabled.

### b13 - 2013-02-01

- Breaking changes:
  - The combined `Cesium.js` file and other required files are now created in `Build/Cesium` and `Build/CesiumUnminified` folders.
  - The Web Worker files needed when using the combined `Cesium.js` file are now in a `Workers` subdirectory.
  - Removed `erosion` property from `Polygon`, `ComplexConicSensorVolume`, `RectangularPyramidSensorVolume`, and `ComplexConicSensorVolume`. Use the new `Erosion` material. See the Sandbox Animation example.
  - Removed `setRectangle` and `getRectangle` methods from `ViewportQuad`. Use the new `rectangle` property.
  - Removed `time` parameter from `Scene.initializeFrame`. Instead, pass the time to `Scene.render`.
- Added new `RimLighting` and `Erosion` materials. See the [Fabric](https://github.com/CesiumGS/cesium/wiki/Fabric) wiki page.
- Added `hue` and `saturation` properties to `ImageryLayer`.
- Added `czm_hue` and `czm_saturation` to adjust the hue and saturation of RGB colors.
- Added `JulianDate.getDaysDifference` method.
- Added `Transforms.computeIcrfToFixedMatrix` and `computeFixedToIcrfMatrix`.
- Added `EarthOrientationParameters`, `EarthOrientationParametersSample`, `Iau2006XysData`, and `Iau2006XysDataSample` classes to `Core`.
- CZML now supports the ability to specify positions in the International Celestial Reference Frame (ICRF), and inertial reference frame.
- Fixed globe rendering on the Nexus 4 running Google Chrome Beta.
- `ViewportQuad` now supports the material system. See the [Fabric](https://github.com/CesiumGS/cesium/wiki/Fabric) wiki page.
- Fixed rendering artifacts in `EllipsoidPrimitive`.
- Fixed an issue where streaming CZML would fail when changing material types.
- Updated Dojo from 1.7.2 to 1.8.4. Reminder: Cesium does not depend on Dojo but uses it for reference applications.

### b12a - 2013-01-18

- Breaking changes:

  - Renamed the `server` property to `url` when constructing a `BingMapsImageryProvider`. Likewise, renamed `BingMapsImageryProvider.getServer` to `BingMapsImageryProvider.getUrl`. Code that looked like

           var bing = new BingMapsImageryProvider({
               server : 'dev.virtualearth.net'
           });

    should now look like:

           var bing = new BingMapsImageryProvider({
               url : 'http://dev.virtualearth.net'
           });

  - Renamed `toCSSColor` to `toCssColorString`.
  - Moved `minimumZoomDistance` and `maximumZoomDistance` from the `CameraController` to the `ScreenSpaceCameraController`.

- Added `fromCssColorString` to `Color` to create a `Color` instance from any CSS value.
- Added `fromHsl` to `Color` to create a `Color` instance from H, S, L values.
- Added `Scene.backgroundColor`.
- Added `textureRotationAngle` parameter to `Polygon.setPositions` and `Polygon.configureFromPolygonHierarchy` to rotate textures on polygons.
- Added `Matrix3.fromRotationX`, `Matrix3.fromRotationY`, `Matrix3.fromRotationZ`, and `Matrix2.fromRotation`.
- Added `fromUniformScale` to `Matrix2`, `Matrix3`, and `Matrix4`.
- Added `fromScale` to `Matrix2`.
- Added `multiplyByUniformScale` to `Matrix4`.
- Added `flipY` property when calling `Context.createTexture2D` and `Context.createCubeMap`.
- Added `MeshFilters.encodePosition` and `EncodedCartesian3.encode`.
- Fixed jitter artifacts with polygons.
- Fixed camera tilt close to the `minimumZoomDistance`.
- Fixed a bug that could lead to blue tiles when zoomed in close to the North and South poles.
- Fixed a bug where removing labels would remove the wrong label and ultimately cause a crash.
- Worked around a bug in Firefox 18 preventing typed arrays from being transferred to or from Web Workers.
- Upgraded RequireJS to version 2.1.2, and Almond to 0.2.3.
- Updated the default Bing Maps API key.

### b12 - 2013-01-03

- Breaking changes:
  - Renamed `EventHandler` to `ScreenSpaceEventHandler`.
  - Renamed `MouseEventType` to `ScreenSpaceEventType`.
  - Renamed `MouseEventType.MOVE` to `ScreenSpaceEventType.MOUSE_MOVE`.
  - Renamed `CameraEventHandler` to `CameraEventAggregator`.
  - Renamed all `*MouseAction` to `*InputAction` (including get, set, remove, etc).
  - Removed `Camera2DController`, `CameraCentralBodyController`, `CameraColumbusViewController`, `CameraFlightController`, `CameraFreeLookController`, `CameraSpindleController`, and `CameraControllerCollection`. Common ways to modify the camera are through the `CameraController` object of the `Camera` and will work in all scene modes. The default camera handler is the `ScreenSpaceCameraController` object on the `Scene`.
  - Changed default Natural Earth imagery to a 2K version of [Natural Earth II with Shaded Relief, Water, and Drainages](http://www.naturalearthdata.com/downloads/10m-raster-data/10m-natural-earth-2/). The previously used version did not include lakes and rivers. This replaced `Source/Assets/Textures/NE2_50M_SR_W_2048.jpg` with `Source/Assets/Textures/NE2_LR_LC_SR_W_DR_2048.jpg`.
- Added pinch-zoom, pinch-twist, and pinch-tilt for touch-enabled browsers (particularly mobile browsers).
- Improved rendering support on Nexus 4 and Nexus 7 using Firefox.
- Improved camera flights.
- Added Sandbox example using NASA's new [Black Marble](http://www.nasa.gov/mission_pages/NPP/news/earth-at-night.html) night imagery.
- Added constrained z-axis by default to the Cesium widgets.
- Upgraded Jasmine from version 1.1.0 to 1.3.0.
- Added `JulianDate.toIso8601`, which creates an ISO8601 compliant representation of a JulianDate.
- The `Timeline` widget now properly displays leap seconds.

### b11 - 2012-12-03

- Breaking changes:
  - Widget render loop now started by default. Startup code changed, see Sandcastle examples.
  - Changed `Timeline.makeLabel` to take a `JulianDate` instead of a JavaScript date parameter.
  - Default Earth imagery has been moved to a new package `Assets`. Images used by `Sandcastle` examples have been moved to the Sandcastle folder, and images used by the Dojo widgets are now self-contained in the `Widgets` package.
  - `positionToEyeEC` in `czm_materialInput` is no longer normalized by default.
  - `FullScreen` and related functions have been renamed to `Fullscreen` to match the W3C standard name.
  - `Fullscreen.isFullscreenEnabled` was incorrectly implemented in certain browsers. `isFullscreenEnabled` now correctly determines whether the browser will allow an element to go fullscreen. A new `isFullscreen` function is available to determine if the browser is currently in fullscreen mode.
  - `Fullscreen.getFullScreenChangeEventName` and `Fullscreen.getFullScreenChangeEventName` now return the proper event name, suitable for use with the `addEventListener` API, instead prefixing them with "on".
  - Removed `Scene.setSunPosition` and `Scene.getSunPosition`. The sun position used for lighting is automatically computed based on the scene's time.
  - Removed a number of rendering options from `CentralBody`, including the ground atmosphere, night texture, specular map, cloud map, cloud shadows, and bump map. These features weren't really production ready and had a disproportionate cost in terms of shader complexity and compilation time. They may return in a more polished form in a future release.
  - Removed `affectedByLighting` property from `Polygon`, `EllipsoidPrimitive`, `RectangularPyramidSensorVolume`, `CustomSensorVolume`, and `ComplexConicSensorVolume`.
  - Removed `DistanceIntervalMaterial`. This was not documented.
  - `Matrix2.getElementIndex`, `Matrix3.getElementIndex`, and `Matrix4.getElementIndex` functions have had their parameters swapped and now take row first and column second. This is consistent with other class constants, such as Matrix2.COLUMN1ROW2.
  - Replaced `CentralBody.showSkyAtmosphere` with `Scene.skyAtmosphere` and `SkyAtmosphere`. This has no impact for those using the Cesium widget.
- Improved lighting in Columbus view and on polygons, ellipsoids, and sensors.
- Fixed atmosphere rendering artifacts and improved Columbus view transition.
- Fixed jitter artifacts with billboards and polylines.
- Added `TileMapServiceImageryProvider`. See the Imagery Layers `Sandcastle` example.
- Added `Water` material. See the Materials `Sandcastle` example.
- Added `SkyBox` to draw stars. Added `CesiumWidget.showSkyBox` and `CesiumViewerWidget.showSkyBox`.
- Added new `Matrix4` functions: `Matrix4.multiplyByTranslation`, `multiplyByPoint`, and `Matrix4.fromScale`. Added `Matrix3.fromScale`.
- Added `EncodedCartesian3`, which is used to eliminate jitter when drawing primitives.
- Added new automatic GLSL uniforms: `czm_frameNumber`, `czm_temeToPseudoFixed`, `czm_entireFrustum`, `czm_inverseModel`, `czm_modelViewRelativeToEye`, `czm_modelViewProjectionRelativeToEye`, `czm_encodedCameraPositionMCHigh`, and `czm_encodedCameraPositionMCLow`.
- Added `czm_translateRelativeToEye` and `czm_luminance` GLSL functions.
- Added `shininess` to `czm_materialInput`.
- Added `QuadraticRealPolynomial`, `CubicRealPolynomial`, and `QuarticRealPolynomial` for finding the roots of quadratic, cubic, and quartic polynomials.
- Added `IntersectionTests.grazingAltitudeLocation` for finding a point on a ray nearest to an ellipsoid.
- Added `mostOrthogonalAxis` function to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
- Changed CesiumViewerWidget default behavior so that zooming to an object now requires a single left-click, rather than a double-click.
- Updated third-party [Tween.js](https://github.com/sole/tween.js/).

### b10 - 2012-11-02

- Breaking changes:
  - Renamed `Texture2DPool` to `TexturePool`.
  - Renamed `BingMapsTileProvider` to `BingMapsImageryProvider`.
  - Renamed `SingleTileProvider` to `SingleTileImageryProvider`.
  - Renamed `ArcGISTileProvider` to `ArcGisMapServerImageryProvider`.
  - Renamed `EquidistantCylindrdicalProjection` to `GeographicProjection`.
  - Renamed `MercatorProjection` to `WebMercatorProjection`.
  - `CentralBody.dayTileProvider` has been removed. Instead, add one or more imagery providers to the collection returned by `CentralBody.getImageryLayers()`.
  - The `description.generateTextureCoords` parameter passed to `ExtentTessellator.compute` is now called `description.generateTextureCoordinates`.
  - Renamed `bringForward`, `sendBackward`, `bringToFront`, and `sendToBack` methods on `CompositePrimitive` to `raise`, `lower`, `raiseToTop`, and `lowerToBottom`, respectively.
  - `Cache` and `CachePolicy` are no longer used and have been removed.
  - Fixed problem with Dojo widget startup, and removed "postSetup" callback in the process. See Sandcastle examples and update your startup code.
- `CentralBody` now allows imagery from multiple sources to be layered and alpha blended on the globe. See the new `Imagery Layers` and `Map Projections` Sandcastle examples.
- Added `WebMapServiceImageryProvider`.
- Improved middle mouse click behavior to always tilt in the same direction.
- Added `getElementIndex` to `Matrix2`, `Matrix3`, and `Matrix4`.

### b9 - 2012-10-01

- Breaking changes:
  - Removed the `render` and `renderForPick` functions of primitives. The primitive `update` function updates a list of commands for the renderer. For more details, see the [Data Driven Renderer](https://github.com/CesiumGS/cesium/wiki/Data-Driven-Renderer-Details).
  - Removed `Context.getViewport` and `Context.setViewport`. The viewport defaults to the size of the canvas if a primitive does not override the viewport property in the render state.
  - `shallowEquals` has been removed.
  - Passing `undefined` to any of the set functions on `Billboard` now throws an exception.
  - Passing `undefined` to any of the set functions on `Polyline` now throws an exception.
  - `PolygonPipeline.scaleToGeodeticHeight` now takes ellipsoid as the last parameter, instead of the first. It also now defaults to `Ellipsoid.WGS84` if no parameter is provided.
- The new Sandcastle live editor and demo gallery replace the Sandbox and Skeleton examples.
- Improved picking performance and accuracy.
- Added EllipsoidPrimitive for visualizing ellipsoids and spheres. Currently, this is only supported in 3D, not 2D or Columbus view.
- Added `DynamicEllipsoid` and `DynamicEllipsoidVisualizer` which use the new `EllipsoidPrimitive` to implement ellipsoids in CZML.
- `Extent` functions now take optional result parameters. Also added `getCenter`, `intersectWith`, and `contains` functions.
- Add new utility class, `DynamicObjectView` for tracking a DynamicObject with the camera across scene modes; also hooked up CesiumViewerWidget to use it.
- Added `enableTranslate`, `enableZoom`, and `enableRotate` properties to `Camera2DController` to selectively toggle camera behavior. All values default to `true`.
- Added `Camera2DController.setPositionCartographic` to simplify moving the camera programmatically when in 2D mode.
- Improved near/far plane distances and eliminated z-fighting.
- Added `Matrix4.multiplyByTranslation`, `Matrix4.fromScale`, and `Matrix3.fromScale`.

### b8 - 2012-09-05

- Breaking changes:

  - Materials are now created through a centralized Material class using a JSON schema called [Fabric](https://github.com/CesiumGS/cesium/wiki/Fabric). For example, change:

          polygon.material = new BlobMaterial({repeat : 10.0});

    to:

          polygon.material = Material.fromType(context, 'Blob');
          polygon.material.repeat = 10.0;

    or:

          polygon.material = new Material({
              context : context,
              fabric : {
                  type : 'Blob',
                  uniforms : {
                      repeat : 10.0
                  }
              }
          });

  - `Label.computeScreenSpacePosition` now requires the current scene state as a parameter.
  - Passing `undefined` to any of the set functions on `Label` now throws an exception.
  - Renamed `agi_` prefix on GLSL identifiers to `czm_`.
  - Replaced `ViewportQuad` properties `vertexShader` and `fragmentShader` with optional constructor arguments.
  - Changed the GLSL automatic uniform `czm_viewport` from an `ivec4` to a `vec4` to reduce casting.
  - `Billboard` now defaults to an image index of `-1` indicating no texture, previously billboards defaulted to `0` indicating the first texture in the atlas. For example, change:

          billboards.add({
              position : { x : 1.0, y : 2.0, z : 3.0 },
          });

    to:

          billboards.add({
              position : { x : 1.0, y : 2.0, z : 3.0 },
              imageIndex : 0
          });

  - Renamed `SceneState` to `FrameState`.
  - `SunPosition` was changed from a static object to a function `computeSunPosition`; which now returns a `Cartesian3` with the computed position. It was also optimized for performance and memory pressure. For example, change:

          var result = SunPosition.compute(date);
          var position = result.position;

        to:

          var position = computeSunPosition(date);

- All `Quaternion` operations now have static versions that work with any objects exposing `x`, `y`, `z` and `w` properties.
- Added support for nested polygons with holes. See `Polygon.configureFromPolygonHierarchy`.
- Added support to the renderer for view frustum and central body occlusion culling. All built-in primitives, such as `BillboardCollection`, `Polygon`, `PolylineCollection`, etc., can be culled. See the advanced examples in the Sandbox for details.
- Added `writeTextToCanvas` function which handles sizing the resulting canvas to fit the desired text.
- Added support for CZML path visualization via the `DynamicPath` and `DynamicPathVisualizer` objects. See the [CZML wiki](https://github.com/CesiumGS/cesium/wiki/CZML-Guide) for more details.
- Added support for [WEBGL_depth_texture](http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/). See `Framebuffer.setDepthTexture`.
- Added `CesiumMath.isPowerOfTwo`.
- Added `affectedByLighting` to `ComplexConicSensorVolume`, `CustomSensorVolume`, and `RectangularPyramidSensorVolume` to turn lighting on/off for these objects.
- CZML `Polygon`, `Cone`, and `Pyramid` objects are no longer affected by lighting.
- Added `czm_viewRotation` and `czm_viewInverseRotation` automatic GLSL uniforms.
- Added a `clampToPixel` property to `BillboardCollection` and `LabelCollection`. When true, it aligns all billboards and text to a pixel in screen space, providing a crisper image at the cost of jumpier motion.
- `Ellipsoid` functions now take optional result parameters.

### b7 - 2012-08-01

- Breaking changes:

  - Removed keyboard input handling from `EventHandler`.
  - `TextureAtlas` takes an object literal in its constructor instead of separate parameters. Code that previously looked like:

          context.createTextureAtlas(images, pixelFormat, borderWidthInPixels);

    should now look like:

          context.createTextureAtlas({images : images, pixelFormat : pixelFormat, borderWidthInPixels : borderWidthInPixels});

  - `Camera.pickEllipsoid` returns the picked position in world coordinates and the ellipsoid parameter is optional. Prefer the new `Scene.pickEllipsoid` method. For example, change

          var position = camera.pickEllipsoid(ellipsoid, windowPosition);

    to:

          var position = scene.pickEllipsoid(windowPosition, ellipsoid);

  - `Camera.getPickRay` now returns the new `Ray` type instead of an object with position and direction properties.
  - `Camera.viewExtent` now takes an `Extent` argument instead of west, south, east and north arguments. Prefer `Scene.viewExtent` over `Camera.viewExtent`. `Scene.viewExtent` will work in any `SceneMode`. For example, change

          camera.viewExtent(ellipsoid, west, south, east, north);

    to:

          scene.viewExtent(extent, ellipsoid);

  - `CameraSpindleController.mouseConstrainedZAxis` has been removed. Instead, use `CameraSpindleController.constrainedAxis`. Code that previously looked like:

          spindleController.mouseConstrainedZAxis = true;

    should now look like:

          spindleController.constrainedAxis = Cartesian3.UNIT_Z;

  - The `Camera2DController` constructor and `CameraControllerCollection.add2D` now require a projection instead of an ellipsoid.
  - `Chain` has been removed. `when` is now included as a more complete CommonJS Promises/A implementation.
  - `Jobs.downloadImage` was replaced with `loadImage` to provide a promise that will asynchronously load an image.
  - `jsonp` now returns a promise for the requested data, removing the need for a callback parameter.
  - JulianDate.getTimeStandard() has been removed, dates are now always stored internally as TAI.
  - LeapSeconds.setLeapSeconds now takes an array of LeapSecond instances instead of JSON.
  - TimeStandard.convertUtcToTai and TimeStandard.convertTaiToUtc have been removed as they are no longer needed.
  - `Cartesian3.prototype.getXY()` was replaced with `Cartesian2.fromCartesian3`. Code that previously looked like `cartesian3.getXY();` should now look like `Cartesian2.fromCartesian3(cartesian3);`.
  - `Cartesian4.prototype.getXY()` was replaced with `Cartesian2.fromCartesian4`. Code that previously looked like `cartesian4.getXY();` should now look like `Cartesian2.fromCartesian4(cartesian4);`.
  - `Cartesian4.prototype.getXYZ()` was replaced with `Cartesian3.fromCartesian4`. Code that previously looked like `cartesian4.getXYZ();` should now look like `Cartesian3.fromCartesian4(cartesian4);`.
  - `Math.angleBetween` was removed because it was a duplicate of `Cartesian3.angleBetween`. Simply replace calls of the former to the later.
  - `Cartographic3` was renamed to `Cartographic`.
  - `Cartographic2` was removed; use `Cartographic` instead.
  - `Ellipsoid.toCartesian` was renamed to `Ellipsoid.cartographicToCartesian`.
  - `Ellipsoid.toCartesians` was renamed to `Ellipsoid.cartographicArrayToCartesianArray`.
  - `Ellipsoid.toCartographic2` was renamed to `Ellipsoid.cartesianToCartographic`.
  - `Ellipsoid.toCartographic2s` was renamed to `Ellipsoid.cartesianArrayToCartographicArray`.
  - `Ellipsoid.toCartographic3` was renamed to `Ellipsoid.cartesianToCartographic`.
  - `Ellipsoid.toCartographic3s` was renamed to `Ellipsoid.cartesianArrayToCartographicArray`.
  - `Ellipsoid.cartographicDegreesToCartesian` was removed. Code that previously looked like `ellipsoid.cartographicDegreesToCartesian(new Cartographic(45, 50, 10))` should now look like `ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(45, 50, 10))`.
  - `Math.cartographic3ToRadians`, `Math.cartographic2ToRadians`, `Math.cartographic2ToDegrees`, and `Math.cartographic3ToDegrees` were removed. These functions are no longer needed because Cartographic instances are always represented in radians.
  - All functions starting with `multiplyWith` now start with `multiplyBy` to be consistent with functions starting with `divideBy`.
  - The `multiplyWithMatrix` function on each `Matrix` type was renamed to `multiply`.
  - All three Matrix classes have been largely re-written for consistency and performance. The `values` property has been eliminated and Matrices are no longer immutable. Code that previously looked like `matrix = matrix.setColumn0Row0(12);` now looks like `matrix[Matrix2.COLUMN0ROW0] = 12;`. Code that previously looked like `matrix.setColumn3(cartesian3);` now looked like `matrix.setColumn(3, cartesian3, matrix)`.
  - 'Polyline' is no longer externally creatable. To create a 'Polyline' use the 'PolylineCollection.add' method.

          Polyline polyline = new Polyline();

    to

          PolylineCollection polylineCollection = new PolylineCollection();
          Polyline polyline = polylineCollection.add();

- All `Cartesian2` operations now have static versions that work with any objects exposing `x` and `y` properties.
- All `Cartesian3` operations now have static versions that work with any objects exposing `x`, `y`, and `z` properties.
- All `Cartesian4` operations now have static versions that work with any objects exposing `x`, `y`, `z` and `w` properties.
- All `Cartographic` operations now have static versions that work with any objects exposing `longitude`, `latitude`, and `height` properties.
- All `Matrix` classes are now indexable like arrays.
- All `Matrix` operations now have static versions of all prototype functions and anywhere we take a Matrix instance as input can now also take an Array or TypedArray.
- All `Matrix`, `Cartesian`, and `Cartographic` operations now take an optional result parameter for object re-use to reduce memory pressure.
- Added `Cartographic.fromDegrees` to make creating Cartographic instances from values in degrees easier.
- Added `addImage` to `TextureAtlas` so images can be added to a texture atlas after it is constructed.
- Added `Scene.pickEllipsoid`, which picks either the ellipsoid or the map depending on the current `SceneMode`.
- Added `Event`, a new utility class which makes it easy for objects to expose event properties.
- Added `TextureAtlasBuilder`, a new utility class which makes it easy to build a TextureAtlas asynchronously.
- Added `Clock`, a simple clock for keeping track of simulated time.
- Added `LagrangePolynomialApproximation`, `HermitePolynomialApproximation`, and `LinearApproximation` interpolation algorithms.
- Added `CoordinateConversions`, a new static class where most coordinate conversion methods will be stored.
- Added `Spherical` coordinate type
- Added a new DynamicScene layer for time-dynamic, data-driven visualization. This include CZML processing. For more details see https://github.com/CesiumGS/cesium/wiki/Architecture and https://github.com/CesiumGS/cesium/wiki/CZML-in-Cesium.
- Added a new application, Cesium Viewer, for viewing CZML files and otherwise exploring the globe.
- Added a new Widgets directory, to contain common re-usable Cesium related controls.
- Added a new Timeline widget to the Widgets directory.
- Added a new Widgets/Dojo directory, to contain dojo-specific widgets.
- Added new Timeline and Cesium dojo widgets.
- Added `CameraCentralBodyController` as the new default controller to handle mouse input.
  - The left mouse button rotates around the central body.
  - The right mouse button and mouse wheel zoom in and out.
  - The middle mouse button rotates around the point clicked on the central body.
- Added `computeTemeToPseudoFixedMatrix` function to `Transforms`.
- Added 'PolylineCollection' to manage numerous polylines. 'PolylineCollection' dramatically improves rendering speed when using polylines.

### b6a - 2012-06-20

- Breaking changes:
  - Changed `Tipsify.tipsify` and `Tipsify.calculateACMR` to accept an object literal instead of three separate arguments. Supplying a maximum index and cache size is now optional.
  - `CentralBody` no longer requires a camera as the first parameter.
- Added `CentralBody.northPoleColor` and `CentralBody.southPoleColor` to fill in the poles if they are not covered by a texture.
- Added `Polygon.configureExtent` to create a polygon defined by west, south, east, and north values.
- Added functions to `Camera` to provide position and directions in world coordinates.
- Added `showThroughEllipsoid` to `CustomSensorVolume` and `RectangularPyramidSensorVolume` to allow sensors to draw through Earth.
- Added `affectedByLighting` to `CentralBody` and `Polygon` to turn lighting on/off for these objects.

### b5 - 2012-05-15

- Breaking changes:

  - Renamed Geoscope to Cesium. To update your code, change all `Geoscope.*` references to `Cesium.*`, and reference Cesium.js instead of Geoscope.js.
  - `CompositePrimitive.addGround` was removed; use `CompositePrimitive.add` instead. For example, change

          primitives.addGround(polygon);

    to:

          primitives.add(polygon);

  - Moved `eastNorthUpToFixedFrame` and `northEastDownToFixedFrame` functions from `Ellipsoid` to a new `Transforms` object. For example, change

          var m = ellipsoid.eastNorthUpToFixedFrame(p);

    to:

          var m = Cesium.Transforms.eastNorthUpToFixedFrame(p, ellipsoid);

  - Label properties `fillStyle` and `strokeStyle` were renamed to `fillColor` and `outlineColor`; they are also now color objects instead of strings. The label `Color` property has been removed.

    For example, change

          label.setFillStyle("red");
          label.setStrokeStyle("#FFFFFFFF");

    to:

          label.setFillColor({ red : 1.0, blue : 0.0, green : 0.0, alpha : 1.0 });
          label.setOutlineColor({ red : 1.0, blue : 1.0, green : 1.0, alpha : 1.0 });

  - Renamed `Tipsify.Tipsify` to `Tipsify.tipsify`.
  - Renamed `Tipsify.CalculateACMR` to `Tipsify.calculateACMR`.
  - Renamed `LeapSecond.CompareLeapSecondDate` to `LeapSecond.compareLeapSecondDate`.
  - `Geoscope.JSONP.get` is now `Cesium.jsonp`. `Cesium.jsonp` now takes a url, a callback function, and an options object. The previous 2nd and 4th parameters are now specified using the options object.
  - `TWEEN` is no longer globally defined, and is instead available as `Cesium.Tween`.
  - Chain.js functions such as `run` are now moved to `Cesium.Chain.run`, etc.
  - `Geoscope.CollectionAlgorithms.binarySearch` is now `Cesium.binarySearch`.
  - `Geoscope.ContainmentTests.pointInsideTriangle2D` is now `Cesium.pointInsideTriangle2D`.
  - Static constructor methods prefixed with "createFrom", now start with "from":

          Matrix2.createfromColumnMajorArray

    becomes

          Matrix2.fromColumnMajorArray

  - The `JulianDate` constructor no longer takes a `Date` object, use the new from methods instead:

          new JulianDate(new Date());

    becomes

          JulianDate.fromDate(new Date("January 1, 2011 12:00:00 EST"));
          JulianDate.fromIso8601("2012-04-24T18:08Z");
          JulianDate.fromTotalDays(23452.23);

  - `JulianDate.getDate` is now `JulianDate.toDate()` and returns a new instance each time.
  - `CentralBody.logoOffsetX` and `logoOffsetY` have been replaced with `CentralBody.logoOffset`, a `Cartesian2`.
  - TileProviders now take a proxy object instead of a string, to allow more control over how proxy URLs are built. Construct a DefaultProxy, passing the previous proxy URL, to get the previous behavior.
  - `Ellipsoid.getScaledWgs84()` has been removed since it is not needed.
  - `getXXX()` methods which returned a new instance of what should really be a constant are now exposed as frozen properties instead. This should improve performance and memory pressure.

    - `Cartsian2/3/4.getUnitX()` -> `Cartsian2/3/4.UNIT_X`
    - `Cartsian2/3/4.getUnitY()` -> `Cartsian2/3/4.UNIT_Y`
    - `Cartsian2/3/4.getUnitZ()` -> `Cartsian3/4.UNIT_Z`
    - `Cartsian2/3/4.getUnitW()` -> `Cartsian4.UNIT_W`
    - `Matrix/2/3/4.getIdentity()` -> `Matrix/2/3/4.IDENTITY`
    - `Quaternion.getIdentity()` -> `Quaternion.IDENTITY`
    - `Ellipsoid.getWgs84()` -> `Ellipsoid.WGS84`
    - `Ellipsoid.getUnitSphere()` -> `Ellipsoid.UNIT_SPHERE`
    - `Cartesian2/3/4/Cartographic.getZero()` -> `Cartesian2/3/4/Cartographic.ZERO`

- Added `PerformanceDisplay` which can be added to a scene to display frames per second (FPS).
- Labels now correctly allow specifying fonts by non-pixel CSS units such as points, ems, etc.
- Added `Shapes.computeEllipseBoundary` and updated `Shapes.computeCircleBoundary` to compute boundaries using arc-distance.
- Added `fileExtension` and `credit` properties to `OpenStreetMapTileProvider` construction.
- Night lights no longer disappear when `CentralBody.showGroundAtmosphere` is `true`.

### b4 - 2012-03-01

- Breaking changes:

  - Replaced `Geoscope.SkyFromSpace` object with `CentralBody.showSkyAtmosphere` property.
  - For mouse click and double click events, replaced `event.x` and `event.y` with `event.position`.
  - For mouse move events, replaced `movement.startX` and `startY` with `movement.startPosition`. Replaced `movement.endX` and `movement.endY` with `movement.endPosition`.
  - `Scene.Pick` now takes a `Cartesian2` with the origin at the upper-left corner of the canvas. For example, code that looked like:

          scene.pick(movement.endX, scene.getCanvas().clientHeight - movement.endY);

    becomes:

          scene.pick(movement.endPosition);

- Added `SceneTransitioner` to switch between 2D and 3D views. See the new Skeleton 2D example.
- Added `CentralBody.showGroundAtmosphere` to show an atmosphere on the ground.
- Added `Camera.pickEllipsoid` to get the point on the globe under the mouse cursor.
- Added `Polygon.height` to draw polygons at a constant altitude above the ellipsoid.

### b3 - 2012-02-06

- Breaking changes:
  - Replaced `Geoscope.Constants` and `Geoscope.Trig` with `Geoscope.Math`.
  - `Polygon`
    - Replaced `setColor` and `getColor` with a `material.color` property.
    - Replaced `setEllipsoid` and `getEllipsoid` with an `ellipsoid` property.
    - Replaced `setGranularity` and `getGranularity` with a `granularity` property.
  - `Polyline`
    - Replaced `setColor`/`getColor` and `setOutlineColor`/`getOutlineColor` with `color` and `outline` properties.
    - Replaced `setWidth`/`getWidth` and `setOutlineWidth`/`getOutlineWidth` with `width` and `outlineWidth` properties.
  - Removed `Geoscope.BillboardCollection.bufferUsage`. It is now automatically determined.
  - Removed `Geoscope.Label` set/get functions for `shadowOffset`, `shadowBlur`, `shadowColor`. These are no longer supported.
  - Renamed `Scene.getTransitions` to `Scene.getAnimations`.
  - Renamed `SensorCollection` to `SensorVolumeCollection`.
  - Replaced `ComplexConicSensorVolume.material` with separate materials for each surface: `outerMaterial`, `innerMaterial`, and `capMaterial`.
  - Material renames
    - `TranslucentSensorVolumeMaterial` to `ColorMaterial`.
    - `DistanceIntervalSensorVolumeMaterial` to `DistanceIntervalMaterial`.
    - `TieDyeSensorVolumeMaterial` to `TieDyeMaterial`.
    - `CheckerboardSensorVolumeMaterial` to `CheckerboardMaterial`.
    - `PolkaDotSensorVolumeMaterial` to `DotMaterial`.
    - `FacetSensorVolumeMaterial` to `FacetMaterial`.
    - `BlobSensorVolumeMaterial` to `BlobMaterial`.
  - Added new materials:
    - `VerticalStripeMaterial`
    - `HorizontalStripeMaterial`
    - `DistanceIntervalMaterial`
  - Added polygon material support via the new `Polygon.material` property.
  - Added clock angle support to `ConicSensorVolume` via the new `maximumClockAngle` and `minimumClockAngle` properties.
  - Added a rectangular sensor, `RectangularPyramidSensorVolume`.
  - Changed custom sensor to connect direction points using the sensor's radius; previously, points were connected with a line.
  - Improved performance and memory usage of `BillboardCollection` and `LabelCollection`.
  - Added more mouse events.
  - Added Sandbox examples for new features.

### b2 - 2011-12-01

- Added complex conic and custom sensor volumes, and various materials to change their appearance. See the new Sensor folder in the Sandbox.
- Added modelMatrix property to primitives to render them in a local reference frame. See the polyline example in the Sandbox.
- Added eastNorthUpToFixedFrame() and northEastDownToFixedFrame() to Ellipsoid to create local reference frames.
- Added CameraFlightController to zoom smoothly from one point to another. See the new camera examples in the Sandbox.
- Added row and column assessors to Matrix2, Matrix3, and Matrix4.
- Added Scene, which reduces the amount of code required to use Geoscope. See the Skeleton. We recommend using this instead of explicitly calling update() and render() for individual or composite primitives. Existing code will need minor changes:

  - Calls to Context.pick() should be replaced with Scene.pick().
  - Primitive constructors no longer require a context argument.
  - Primitive update() and render() functions now require a context argument. However, when using the new Scene object, these functions do not need to be called directly.
  - TextureAtlas should no longer be created directly; instead, call Scene.getContext().createTextureAtlas().
  - Other breaking changes:

    - Camera get/set functions, e.g., getPosition/setPosition were replaced with properties, e.g., position.
    - Replaced CompositePrimitive, Polygon, and Polyline getShow/setShow functions with a show property.
    - Replaced Polyline, Polygon, BillboardCollection, and LabelCollection getBufferUsage/setBufferUsage functions with a bufferUsage property.
    - Changed colors used by billboards, labels, polylines, and polygons. Previously, components were named r, g, b, and a. They are now red, green, blue, and alpha. Previously, each component's range was [0, 255]. The range is now [0, 1] floating point. For example,

            color : { r : 0, g : 255, b : 0, a : 255 }

      becomes:

            color : { red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 }

### b1 - 2011-09-19

- Added `Shapes.computeCircleBoundary` to compute circles. See the Sandbox.
- Changed the `EventHandler` constructor function to take the Geoscope canvas, which ensures the mouse position is correct regardless of the canvas' position on the page. Code that previously looked like:

        var handler = new Geoscope.EventHandler();

  should now look like:

        var handler = new Geoscope.EventHandler(canvas);

- Context.Pick no longer requires clamping the x and y arguments. Code that previously looked like:

        var pickedObject = context.pick(primitives, us, Math.max(x, 0.0),
            Math.max(context.getCanvas().clientHeight - y, 0.0));

  can now look like:

        var pickedObject = context.pick(primitives, us, x, context.getCanvas().clientHeight - y);

- Changed Polyline.setWidth and Polyline.setOutlineWidth to clamp the width to the WebGL implementation limit instead of throwing an exception. Code that previously looked like:

        var maxWidth = context.getMaximumAliasedLineWidth();
        polyline.setWidth(Math.min(5, maxWidth));
        polyline.setOutlineWidth(Math.min(10, maxWidth));

  can now look like:

        polyline.setWidth(5);
        polyline.setOutlineWidth(10);

- Improved the Sandbox:
  - Code in the editor is now evaluated as you type for quick prototyping.
  - Highlighting a Geoscope type in the editor and clicking the doc button in the toolbar now brings up the reference help for that type.
- BREAKING CHANGE: The `Context` constructor-function now takes an element instead of an ID. Code that previously looked like:

        var context = new Geoscope.Context("glCanvas");
        var canvas = context.getCanvas();

  should now look like:

        var canvas = document.getElementById("glCanvas");
        var context = new Geoscope.Context(canvas);

### b0 - 2011-08-31

- Added new Sandbox and Skeleton examples. The sandbox contains example code for common tasks. The skeleton is a bare-bones application for building upon. Most sandbox code examples can be copy and pasted directly into the skeleton.
- Added `Geoscope.Polygon` for drawing polygons on the globe.
- Added `Context.pick` to pick objects in one line of code.
- Added `bringForward`, `bringToFront`, `sendBackward`, and `sendToBack` functions to `CompositePrimitive` to control the render-order for ground primitives.
- Added `getShow`/`setShow` functions to `Polyline` and `CompositePrimitive`.
- Added new camera control and event types including `CameraFreeLookEventHandler`, `CameraSpindleEventHandler`, and `EventHandler`.
- Replaced `Ellipsoid.toCartesian3` with `Ellipsoid.toCartesian`.
- update and `updateForPick` functions no longer require a `UniformState` argument.

## Alpha Releases

### a6 - 2011-08-05

- Added support for lines using `Geoscope.Polyline`. See the Sandbox example.
- Made `CompositePrimitive`, `LabelCollection`, and `BillboardCollection` have consistent function names, including a new `contains()` function.
- Improved reference documentation layout.

### a5 - 2011-07-22

- Flushed out `CompositePrimitive`, `TimeStandard`, and `LeapSecond` types.
- Improved support for browsers using ANGLE (Windows Only).

### a4 - 2011-07-15

- Added `Geoscope.TimeStandard` for handling TAI and UTC time standards.
- Added `Geoscope.Quaternion`, which is a foundation for future camera control.
- Added initial version of `Geoscope.PrimitiveCollection` to simplify rendering.
- Prevented billboards/labels near the surface from getting cut off by the globe.
- See the Sandbox for example code.
- Added more reference documentation for labels.

### a3 - 2011-07-08

- Added `Geoscope.LabelCollection` for drawing text.
- Added `Geoscope.JulianDate` and `Geoscope.TimeConstants` for proper time handling.
- See the Sandbox example for how to use the new labels and Julian date.

### a2 - 2011-07-01

- Added `Geoscope.ViewportQuad` and `Geoscope.Rectangle` (foundations for 2D map).
- Improved the visual quality of cloud shadows.

### a1 - 2011-06-24

- Added `SunPosition` type to compute the sun position for a julian date.
- Simplified picking. See the mouse move event in the Sandbox example.
- `Cartographic2` and `Cartographic3` are now mutable types.
- Added reference documentation for billboards.

### a0 - 2011-06-17

- Initial Release.
