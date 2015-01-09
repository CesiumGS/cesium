Change Log
==========

### 1.6 - 2015-02-02

* Breaking changes
  * `Rectangle.intersectWith` was deprecated in Cesium 1.5. Use `Rectangle.intersection`, which is the same but returns `undefined` when two rectangles do not intersect.
  * `Rectangle.isEmpty` was deprecated in Cesium 1.5.
  * The `sourceUri` parameter to `GeoJsonDatasource.load` was deprecated in Cesium 1.4 and has been removed. Use options.sourceUri instead.
  * `PolygonGraphics.positions` created by `GeoJSONDataSource` now evaluate to a `PolygonHierarchy` object instead of an array of positions.
* Deprecated
  * `PolygonGraphics.positions` was deprecated and replaced with `PolygonGraphics.hierarchy`, whose value is a `PolygonHierarchy` instead of an array of positions.  `PolygonGraphics.positions` will be removed in Cesium 1.8.
* Improved performance of asynchronous geometry creation (as much as 20% faster in some use cases). [#2342](https://github.com/AnalyticalGraphicsInc/cesium/issues/2342)
* Added `PolylineVolumeGraphics` and `Entity.polylineVolume`
* Added `BillboardGraphics.imageSubRegion`, to enable custom texture atlas use for `Entity` instances.
* Added `CheckerboardMaterialProperty` to enable use of the checkerboard material with the entity API.
* Added `PolygonHierarchy` to make defining polygons with holes clearer.
* Added `PolygonGraphics.hierarchy` for supporting polygons with holes via data sources.
* `GeoJsonDataSource` now supports polygons with holes.
* `ConstantProperty` can now hold any value; previously it was limited to values that implemented `equals` and `clones` functions, as well as a few special cases.
* Fixed a bug in `EllipsoidGeodesic` that caused it to modify the `height` of the positions passed to the constructor or to to `setEndPoints`.
* Instead of throwing an exception when there are not enough unique positions to define a geometry, creating a `Primitive` will succeed, but not render. [#2375](https://github.com/AnalyticalGraphicsInc/cesium/issues/2375)

### 1.5 - 2015-01-05

* Breaking changes
  * Removed `GeometryPipeline.wrapLongitude`, which was deprecated in 1.4.  Use `GeometryPipeline.splitLongitude` instead.
  * Removed `GeometryPipeline.combine`, which was deprecated in 1.4.  Use `GeometryPipeline.combineInstances` instead.
* Deprecated
  * `viewerEntityMixin` was deprecated. It will be removed in Cesium 1.6. Its functionality is now directly part of the `Viewer` widget.
  * `Rectangle.intersectWith` was deprecated. It will be removed in Cesium 1.6. Use `Rectangle.intersection`, which is the same but returns `undefined` when two rectangles do not intersect.
  * `Rectangle.isEmpty` was deprecated. It will be removed in Cesium 1.6.
* Improved GeoJSON, TopoJSON, and general polygon loading performance.
* Added caching to `Model` to save memory and improve loading speed when several models with the same url are created.
* Added `ModelNode.show` for per-node show/hide.
* Added the following properties to `Viewer` and `CesiumWidget`: `imageryLayers`, `terrainProvider`, and `camera`.  This avoids the need to access `viewer.scene` in some cases.
* Dramatically improved the quality of font outlines.
* Added `BoxGraphics` and `Entity.box`.
* Added `CorridorGraphics` and `Entity.corridor`.
* Added `CylinderGraphics` and `Entity.cylinder`.
* Fixed imagery providers whose rectangle crosses the IDL. Added `Rectangle.computeWidth`, `Rectangle.computeHeight`, `Rectangle.width`, and `Rectangle.height`. [#2195](https://github.com/AnalyticalGraphicsInc/cesium/issues/2195)
* `ConstantProperty` now accepts `HTMLElement` instances as valid values.
* `BillboardGraphics.image` and `ImageMaterialProperty.image` now accept `Property` instances that represent an `Image` or `Canvas` in addition to a url.
* Fixed a bug in `PolylineGeometry` that would cause gaps in the line. [#2136](https://github.com/AnalyticalGraphicsInc/cesium/issues/2136)
* Fixed `upsampleQuantizedTerrainMesh` rounding errors that had occasionally led to missing terrain skirt geometry in upsampled tiles.
* Added `Math.mod` which computes `m % n` but also works when `m` is negative.

### 1.4 - 2014-12-01

* Breaking changes
  * Types implementing `TerrainProvider` are now required to implement the `getTileDataAvailable` function.  Backwards compatibility for this was deprecated in Cesium 1.2.
* Deprecated
    * The `sourceUri` parameter to `GeoJsonDatasource.load` was deprecated and will be removed in Cesium 1.6 on February 3, 2015 ([#2257](https://github.com/AnalyticalGraphicsInc/cesium/issues/2257)).  Use `options.sourceUri` instead.
    * `GeometryPipeline.wrapLongitude` was deprecated. It will be removed in Cesium 1.5 on January 2, 2015. Use `GeometryPipeline.splitLongitude`. ([#2272](https://github.com/AnalyticalGraphicsInc/cesium/issues/2272))
    * `GeometryPipeline.combine` was deprecated. It will be removed in Cesium 1.5. Use `GeometryPipeline.combineInstances`.
* Added support for touch events on Internet Explorer 11 using the [Pointer Events API](http://www.w3.org/TR/pointerevents/).
* Added geometry outline width support to the `DataSource` layer.  This is exposed via the new `outlineWidth` property on `EllipseGraphics`, `EllipsoidGraphics`, `PolygonGraphics`, `RectangleGraphics`, and `WallGraphics`.
* Added `outlineWidth` support to CZML geometry packets.
* Added `stroke-width` support to the GeoJSON simple-style implementation.
* Added the ability to specify global GeoJSON default styling.  See the [documentation](http://cesiumjs.org/Cesium/Build/Documentation/GeoJsonDataSource.html) for details.
* Added `CallbackProperty` to support lazy property evaluation as well as make custom properties easier to create.
* Added an options parameter to `GeoJsonDataSource.load`, `GeoJsonDataSource.loadUrl`, and `GeoJsonDataSource.fromUrl` to allow for basic per-instance styling. [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20and%20TopoJSON.html&label=Showcases).
* Improved GeoJSON loading performance.
* Improved point visualization performance for all DataSources.
* Improved the performance and memory usage of `EllipseGeometry`, `EllipseOutlineGeometry`, `CircleGeometry`, and `CircleOutlineGeometry`.
* Added `tileMatrixLabels` option to `WebMapTileServiceImageryProvider`.
* Fixed a bug in `PolylineGeometry` that would cause the geometry to be split across the IDL for 3D only scenes. [#1197](https://github.com/AnalyticalGraphicsInc/cesium/issues/1197)
* Added `modelMatrix` and `cull` options to `Primitive` constructor.
* The `translation` parameter to `Matrix4.fromRotationTranslation` now defaults to `Cartesian3.ZERO`.
* Fixed `ModelNode.matrix` when a node is targeted for animation.
* `Camera.tilt` now clamps to [-pi / 2, pi / 2] instead of [0, pi / 2].
* Fixed an issue that could lead to poor performance on lower-end GPUs like the Intel HD 3000.
* Added `distanceSquared` to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
* Added `Matrix4.multiplyByMatrix3`.
* Fixed a bug in `Model` where the WebGL shader optimizer in Linux was causing mesh loading to fail.

### 1.3 - 2014-11-03

* Worked around a shader compilation regression in Firefox 33 and 34 by falling back to a less precise shader on those browsers. [#2197](https://github.com/AnalyticalGraphicsInc/cesium/issues/2197)
* Added support to the `CesiumTerrainProvider` for terrain tiles with more than 64K vertices, which is common for sub-meter terrain.
* Added `Primitive.compressVertices`. When true (default), geometry vertices are compressed to save GPU memory.
* Added `culture` option to `BingMapsImageryProvider` constructor.
* Reduced the amount of GPU memory used by billboards and labels.
* Fixed a bug that caused non-base imagery layers with a limited `rectangle` to be stretched to the edges of imagery tiles. [#416](https://github.com/AnalyticalGraphicsInc/cesium/issues/416)
* Fixed rendering polylines with duplicate positions. [#898](https://github.com/AnalyticalGraphicsInc/cesium/issues/898)
* Fixed a bug in `Globe.pick` that caused it to return incorrect results when using terrain data with vertex normals.  The bug manifested itself as strange behavior when navigating around the surface with the mouse as well as incorrect results when using `Camera.viewRectangle`.
* Fixed a bug in `sampleTerrain` that could cause it to produce undefined heights when sampling for a position very near the edge of a tile.
* `ReferenceProperty` instances now retain their last value if the entity being referenced is removed from the target collection.  The reference will be automatically reattached if the target is reintroduced.
* Upgraded topojson from 1.6.8 to 1.6.18.
* Upgraded Knockout from version 3.1.0 to 3.2.0.
* Upgraded CodeMirror, used by SandCastle, from 2.24 to 4.6.

### 1.2 - 2014-10-01

* Deprecated
  * Types implementing the `TerrainProvider` interface should now include the new `getTileDataAvailable` function.  The function will be required starting in Cesium 1.4.
* Fixed model orientations to follow the same Z-up convention used throughout Cesium. There was also an orientation issue fixed in the [online model converter](http://cesiumjs.org/convertmodel.html). If you are having orientation issues after updating, try reconverting your models.
* Fixed a bug in `Model` where the wrong animations could be used when the model was created from glTF JSON instead of a url to a glTF file.  [#2078](https://github.com/AnalyticalGraphicsInc/cesium/issues/2078)
* Fixed a bug in `GeoJsonDataSource` which was causing polygons with height values to be drawn onto the surface.
* Fixed a bug that could cause a crash when quickly adding and removing imagery layers.
* Eliminated imagery artifacts at some zoom levels due to Mercator reprojection.
* Added support for the GeoJSON [simplestyle specification](https://github.com/mapbox/simplestyle-spec). ([Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20simplestyle.html))
* Added `GeoJsonDataSource.fromUrl` to make it easy to add a data source in less code.
* Added `PinBuilder` class for easy creation of map pins. ([Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=PinBuilder.html))
* Added `Color.brighten` and `Color.darken` to make it easy to brighten or darker a color instance.
* Added a constructor option to `Scene`, `CesiumWidget`, and `Viewer` to disable order independent translucency.
* Added support for WKID 102113 (equivalent to 102100) to `ArcGisMapServerImageryProvider`.
* Added `TerrainProvider.getTileDataAvailable` to improve tile loading performance when camera starts near globe.
* Added `Globe.showWaterEffect` to enable/disable the water effect for supported terrain providers.
* Added `Globe.baseColor` to set the color of the globe when no imagery is available.
* Changed default `GeoJSON` Point feature graphics to use `BillboardGraphics` with a blue map pin instead of color `PointGraphics`.
* Cesium now ships with a version of the [maki icon set](https://www.mapbox.com/maki/) for use with `PinBuilder` and GeoJSON simplestyle support.
* Cesium now ships with a default web.config file to simplify IIS deployment.

### 1.1 - 2014-09-02

* Added a new imagery provider, `WebMapTileServiceImageryProvider`, for accessing tiles on a WMTS 1.0.0 server.
* Added an optional `pickFeatures` function to the `ImageryProvider` interface.  With supporting imagery providers, such as `WebMapServiceImageryProvider`, it can be used to determine the rasterized features under a particular location.
* Added `ImageryLayerCollection.pickImageryLayerFeatures`.  It determines the rasterized imagery layer features intersected by a given pick ray by querying supporting layers using `ImageryProvider.pickFeatures`.
* Added `tileWidth`, `tileHeight`, `minimumLevel`, and `tilingScheme` parameters to the `WebMapServiceImageryProvider` constructor.
* Added `id` property to `Scene` which is a readonly unique identifier associated with each instance.
* Added `FeatureDetection.supportsWebWorkers`.
* Greatly improved the performance of time-varying polylines when using DataSources.
* `viewerEntityMixin` now automatically queries for imagery layer features on click and shows their properties in the `InfoBox` panel.
* Fixed a bug in terrain and imagery loading that could cause an inconsistent frame rate when moving around the globe, especially on a faster internet connection.
* Fixed a bug that caused `SceneTransforms.wgs84ToWindowCoordinates` to incorrectly return `undefined` when in 2D.
* Fixed a bug in `ImageryLayer` that caused layer images to be rendered twice for each terrain tile that existed prior to adding the imagery layer.
* Fixed a bug in `Camera.pickEllipsoid` that caused it to return the back side of the ellipsoid when near the surface.
* Fixed a bug which prevented `loadWithXhr` from working with older browsers, such as Internet Explorer 9.

### 1.0 - 2014-08-01

* Breaking changes ([why so many?](https://groups.google.com/forum/#!topic/cesium-dev/Y_mG11IZD9k))
  * All `Matrix2`, `Matrix3`, `Matrix4` and `Quaternion` functions that take a `result` parameter now require the parameter, except functions starting with `from`.
  * Removed `Billboard.imageIndex` and `BillboardCollection.textureAtlas`. Instead, use `Billboard.image`.
    * Code that looked like:

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

    * should now look like:

            var billboards = new Cesium.BillboardCollection();
            billboards.add({
                image : '../images/Cesium_Logo_overlay.png',
                position : //...
            });

  * Updated the [Model Converter](http://cesiumjs.org/convertmodel.html) and `Model` to support [glTF 0.8](https://github.com/KhronosGroup/glTF/blob/schema-8/specification/README.md).  See the [forum post](https://groups.google.com/forum/#!topic/cesium-dev/KNl2K3Cazno) for full details.
  * `Model` primitives are now rotated to be `Z`-up to match Cesium convention; glTF stores models with `Y` up.
  * `SimplePolylineGeometry` and `PolylineGeometry` now curve to follow the ellipsoid surface by default. To disable this behavior, set the option `followSurface` to `false`.
  * Renamed `DynamicScene` layer to `DataSources`.  The following types were also renamed:
    * `DynamicBillboard` -> `BillboardGraphics`
    * `DynamicBillboardVisualizer` -> `BillboardVisualizer`
    * `CompositeDynamicObjectCollection` -> `CompositeEntityCollection`
    * `DynamicClock` -> `DataSourceClock`
    * `DynamicEllipse` -> `EllipseGraphics`
    * `DynamicEllipsoid` -> `EllipsoidGraphics`
    * `DynamicObject` -> `Entity`
    * `DynamicObjectCollection` -> `EntityCollection`
    * `DynamicObjectView` -> `EntityView`
    * `DynamicLabel` -> `LabelGraphics`
    * `DynamicLabelVisualizer` -> `LabelVisualizer`
    * `DynamicModel` -> `ModelGraphics`
    * `DynamicModelVisualizer` -> `ModelVisualizer`
    * `DynamicPath` -> `PathGraphics`
    * `DynamicPathVisualizer` -> `PathVisualizer`
    * `DynamicPoint` -> `PointGraphics`
    * `DynamicPointVisualizer` -> `PointVisualizer`
    * `DynamicPolygon` -> `PolygonGraphics`
    * `DynamicPolyline` -> `PolylineGraphics`
    * `DynamicRectangle` -> `RectangleGraphics`
    * `DynamicWall` -> `WallGraphics`
    * `viewerDynamicObjectMixin` -> `viewerEntityMixin`
  * Removed `DynamicVector` and `DynamicVectorVisualizer`.
  * Renamed `DataSource.dynamicObjects` to `DataSource.entities`.
  * `EntityCollection.getObjects()` and `CompositeEntityCollection.getObjects()` are now properties named `EntityCollection.entities` and `CompositeEntityCollection.entities`.
  * Renamed `Viewer.trackedObject` and `Viewer.selectedObject` to `Viewer.trackedEntity` and `Viewer.selectedEntity` when using the `viewerEntityMixin`.
  * Renamed functions for consistency:
    * `BoundingSphere.getPlaneDistances` -> `BoundingSphere.computePlaneDistances`
    * `Cartesian[2,3,4].getMaximumComponent` -> `Cartesian[2,3,4].maximumComponent`
    * `Cartesian[2,3,4].getMinimumComponent` -> `Cartesian[2,3,4].minimumComponent`
    * `Cartesian[2,3,4].getMaximumByComponent` -> `Cartesian[2,3,4].maximumByComponent`
    * `Cartesian[2,3,4].getMinimumByComponent` -> `Cartesian[2,3,4].minimumByComponent`
    * `CubicRealPolynomial.realRoots` -> `CubicRealPolynomial.computeRealRoots`
    * `CubicRealPolynomial.discriminant` -> `CubicRealPolynomial.computeDiscriminant`
    * `JulianDate.getTotalDays` -> `JulianDate.totalDyas`
    * `JulianDate.getSecondsDifference` -> `JulianDate.secondsDifference`
    * `JulianDate.getDaysDifference` -> `JulianDate.daysDifference`
    * `JulianDate.getTaiMinusUtc` -> `JulianDate.computeTaiMinusUtc`
    * `Matrix3.getEigenDecompostion` -> `Matrix3.computeEigenDecomposition`
    * `Occluder.getVisibility` -> `Occluder.computeVisibility`
    * `Occluder.getOccludeePoint` -> `Occluder.computerOccludeePoint`
    * `QuadraticRealPolynomial.discriminant` -> `QuadraticRealPolynomial.computeDiscriminant`
    * `QuadraticRealPolynomial.realRoots` -> `QuadraticRealPolynomial.computeRealRoots`
    * `QuarticRealPolynomial.discriminant` -> `QuarticRealPolynomial.computeDiscriminant`
    * `QuarticRealPolynomial.realRoots` -> `QuarticRealPolynomial.computeRealRoots`
    * `Quaternion.getAxis` -> `Quaternion.computeAxis`
    * `Quaternion.getAngle` -> `Quaternion.computeAngle`
    * `Quaternion.innerQuadrangle` -> `Quaternion.computeInnerQuadrangle`
    * `Rectangle.getSouthwest` -> `Rectangle.southwest`
    * `Rectangle.getNorthwest` -> `Rectangle.northwest`
    * `Rectangle.getSoutheast` -> `Rectangle.southeast`
    * `Rectangle.getNortheast` -> `Rectangle.northeast`
    * `Rectangle.getCenter` -> `Rectangle.center`
    * `CullingVolume.getVisibility` -> `CullingVolume.computeVisibility`
  * Replaced `PerspectiveFrustum.fovy` with `PerspectiveFrustum.fov` which will change the field of view angle in either the `X` or `Y` direction depending on the aspect ratio.
  * Removed the following from the Cesium API: `Transforms.earthOrientationParameters`, `EarthOrientationParameters`, `EarthOrientationParametersSample`, `Transforms.iau2006XysData`, `Iau2006XysData`, `Iau2006XysSample`, `IauOrientationAxes`, `TimeConstants`, `Scene.frameState`, `FrameState`, `EncodedCartesian3`, `EllipsoidalOccluder`, `TextureAtlas`, and `FAR`.  These are still available but are not part of the official API and may change in future versions.
  * Removed `DynamicObject.vertexPositions`.  Use `DynamicWall.positions`, `DynamicPolygon.positions`, and `DynamicPolyline.positions` instead.
  * Removed `defaultPoint`, `defaultLine`, and `defaultPolygon` from `GeoJsonDataSource`.
  * Removed `Primitive.allow3DOnly`. Set the `Scene` constructor option `scene3DOnly` instead.
  * `SampledProperty` and `SampledPositionProperty` no longer extrapolate outside of their sample data time range by default.
  * Changed the following functions to properties:
    * `TerrainProvider.hasWaterMask`
    * `CesiumTerrainProvider.hasWaterMask`
    * `ArcGisImageServerTerrainProvider.hasWaterMask`
    * `EllipsoidTerrainProvider.hasWaterMask`
    * `VRTheWorldTerrainProvider.hasWaterMask`
  * Removed `ScreenSpaceCameraController.ellipsoid`. The behavior that depended on the ellipsoid is now determined based on the scene state.
  * Sandcastle examples now automatically wrap the example code in RequireJS boilerplate.  To upgrade any custom examples, copy the code into an existing example (such as Hello World) and save a new file.
  * Removed `CustomSensorVolume`, `RectangularPyramidSensorVolume`, `DynamicCone`, `DynamicConeVisualizerUsingCustomSensor`, `DynamicPyramid` and `DynamicPyramidVisualizer`.  This will be moved to a plugin in early August.  [#1887](https://github.com/AnalyticalGraphicsInc/cesium/issues/1887)
  * If `Primitive.modelMatrix` is changed after creation, it only affects primitives with one instance and only in 3D mode.
  * `ImageryLayer` properties `alpha`, `brightness`, `contrast`, `hue`, `saturation`, and `gamma` may no longer be functions.  If you need to change these values each frame, consider moving your logic to an event handler for `Scene.preRender`.
  * Removed `closeTop` and `closeBottom` options from `RectangleGeometry`.
  * CZML changes:
    * CZML is now versioned using the <major>.<minor> scheme.  For example, any CZML 1.0 implementation will be able to load any 1.<minor> document (with graceful degradation).  Major version number increases will be reserved for breaking changes.  We fully expect these major version increases to happen, as CZML is still in development, but we wanted to give developers a stable target to work with.
    * A `"1.0"` version string is required to be on the document packet, which is required to be the first packet in a CZML file.  Previously the `document` packet was optional; it is now mandatory.  The simplest document packet is:
      ```
      {
        "id":"document",
        "version":"1.0"
      }
      ```
    * The `vertexPositions` property has been removed.  There is now a `positions` property directly on objects that use it, currently `polyline`, `polygon`, and `wall`.
    * `cone`, `pyramid`, and `vector` have been removed from the core CZML schema.  They are now treated as extensions maintained by Analytical Graphics and have been renamed to `agi_conicSensor`, `agi_customPatternSensor`, and `agi_vector` respectively.
    * The `orientation` property has been changed to match Cesium convention.  To update existing CZML documents, conjugate the quaternion values.
    * `pixelOffset` now uses the top-left of the screen as the origin; previously it was the bottom-left.  To update existing documents, negate the `y` value.
    * Removed `color`, `outlineColor`, and `outlineWidth` properties from `polyline` and `path`.  There is a new `material` property that allows you to specify a variety of materials, such as `solidColor`, `polylineOutline` and `polylineGlow`.
    * See the [CZML Schema](https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-Content) for more details.  We plan on greatly improving this document in the coming weeks.
* Added camera collision detection with terrain to the default mouse interaction.
* Modified the default camera tilt mouse behavior to tilt about the point clicked, taking into account terrain.
* Modified the default camera mouse behavior to look about the camera's position when the sky is clicked.
* Cesium can now render an unlimited number of imagery layers, no matter how few texture units are supported by the hardware.
* Added support for rendering terrain lighting with oct-encoded per-vertex normals.  Added `CesiumTerrainProvider.requestVertexNormals` to request per vertex normals.  Added `hasVertexNormals` property to all terrain providers to indicate whether or not vertex normals are included in the requested terrain tiles.
* Added `Globe.getHeight` and `Globe.pick` for finding the terrain height at a given Cartographic coordinate and picking the terrain with a ray.
* Added `scene3DOnly` options to `Viewer`, `CesiumWidget`, and `Scene` constructors. This setting optimizes memory usage and performance for 3D mode at the cost of losing the ability to use 2D or Columbus View.
* Added `forwardExtrapolationType`, `forwardExtrapolationDuration`, `backwardExtrapolationType`, and `backwardExtrapolationDuration` to `SampledProperty` and `SampledPositionProperty` which allows the user to specify how a property calculates its value when outside the range of its sample data.
* Prevent primitives from flashing off and on when modifying static DataSources.
* Added the following methods to `IntersectionTests`: `rayTriangle`, `lineSegmentTriangle`, `raySphere`, and `lineSegmentSphere`.
* Matrix types now have `add` and `subtract` functions.
* `Matrix3` type now has a `fromCrossProduct` function.
* Added `CesiumMath.signNotZero`, `CesiumMath.toSNorm` and `CesiumMath.fromSNorm` functions.
* DataSource & CZML models now default to North-East-Down orientation if none is provided.
* `TileMapServiceImageryProvider` now works with tilesets created by tools that better conform to the TMS specification.  In particular, a profile of `global-geodetic` or `global-mercator` is now supported (in addition to the previous `geodetic` and `mercator`) and in these profiles it is assumed that the X coordinates of the bounding box correspond to the longitude direction.
* `EntityCollection` and `CompositeEntityCollection` now include the array of modified entities as the last parameter to their `onCollectionChanged` event.
* `RectangleGeometry`, `RectangleOutlineGeometry` and `RectanglePrimitive` can cross the international date line.

Beta Releases
-------------

### b30 - 2014-07-01

* Breaking changes ([why so many?](https://groups.google.com/forum/#!topic/cesium-dev/Y_mG11IZD9k))
  * CZML property references now use a `#` symbol to separate identifier from property path. `objectId.position` should now be `objectId#position`.
  * All `Cartesian2`, `Cartesian3`, `Cartesian4`, `TimeInterval`, and `JulianDate` functions that take a `result` parameter now require the parameter (except for functions starting with `from`).
  * Modified `Transforms.pointToWindowCoordinates` and `SceneTransforms.wgs84ToWindowCoordinates` to return window coordinates with origin at the top left corner.
  * `Billboard.pixelOffset` and `Label.pixelOffset` now have their origin at the top left corner.
  * Replaced `CameraFlightPath.createAnimation` with `Camera.flyTo` and replaced `CameraFlightPath.createAnimationRectangle` with `Camera.flyToRectangle`.  Code that looked like:

            scene.animations.add(Cesium.CameraFlightPath.createAnimation(scene, {
                destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
            }));

    should now look like:

            scene.camera.flyTo({
                destination : Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)
            });

  * In `Camera.flyTo` and `Camera.flyToRectangle`:
    * `options.duration` is now in seconds, not milliseconds.
    * Renamed `options.endReferenceFrame` to `options.endTransform`.
    * Renamed `options.onComplete` to `options.complete`.
    * Renamed `options.onCancel` to `options.cancel`.
  * The following are now in seconds, not milliseconds.
    * `Scene.morphToColumbusView`, `Scene.morphTo2D`, and `Scene.morphTo3D` parameter `duration`.
    * `HomeButton` constructor parameter `options.duration`, `HomeButtonViewModel` constructor parameter `duration`, and `HomeButtonViewModel.duration`.
    * `SceneModePicker` constructor parameter `duration`, `SceneModePickerViewModel` constructor parameter `duration`, and `SceneModePickerViewModel.duration`.
    * `Geocoder` and `GeocoderViewModel` constructor parameter `options.flightDuration` and `GeocoderViewModel.flightDuration`.
    * `ScreenSpaceCameraController.bounceAnimationTime`.
    * `FrameRateMonitor` constructor parameter `options.samplingWindow`, `options.quietPeriod`, and `options.warmupPeriod`.
  * Refactored `JulianDate` to be in line with other Core types.
    * Most functions now take result parameters.
    * The default constructor no longer creates a date at the current time, use `JulianDate.now()` instead.
    * Removed `JulianDate.getJulianTimeFraction` and `JulianDate.compareTo`
    * `new JulianDate()` -> `JulianDate.now()`
    * `date.getJulianDayNumber()` -> `date.dayNumber`
    * `date.getSecondsOfDay()` -> `secondsOfDay`
    * `date.getTotalDays()` -> `JulianDate.getTotalDays(date)`
    * `date.getSecondsDifference(arg1, arg2)` -> `JulianDate.getSecondsDifference(arg2, arg1)` (Note, order of arguments flipped)
    * `date.getDaysDifference(arg1, arg2)` -> `JulianDate.getDaysDifference(arg2, arg1)` (Note, order of arguments flipped)
    * `date.getTaiMinusUtc()` -> `JulianDate.getTaiMinusUtc(date)`
    * `date.addSeconds(seconds)` -> `JulianDate.addSeconds(date, seconds)`
    * `date.addMinutes(minutes)` -> `JulianDate.addMinutes(date, minutes)`
    * `date.addHours(hours)` -> `JulianDate.addHours(date, hours)`
    * `date.addDays(days)` -> `JulianDate.addDays(date, days)`
    * `date.lessThan(right)` -> `JulianDate.lessThan(left, right)`
    * `date.lessThanOrEquals(right)` -> `JulianDate.lessThanOrEquals(left, right)`
    * `date.greaterThan(right)` -> `JulianDate.greaterThan(left, right)`
    * `date.greaterThanOrEquals(right)` -> `JulianDate.greaterThanOrEquals(left, right)`
  * Refactored `TimeInterval` to be in line with other Core types.
    * The constructor no longer requires parameters and now takes a single options parameter. Code that looked like:

            new TimeInterval(startTime, stopTime, true, true, data);

    should now look like:

            new TimeInterval({
                start : startTime,
                stop : stopTime,
                isStartIncluded : true,
                isStopIncluded : true,
                data : data
            });

    * `TimeInterval.fromIso8601` now takes a single options parameter. Code that looked like:

            TimeInterval.fromIso8601(intervalString, true, true, data);

    should now look like:

            TimeInterval.fromIso8601({
                iso8601 : intervalString,
                isStartIncluded : true,
                isStopIncluded : true,
                data : data
            });

    * `interval.intersect(otherInterval)` -> `TimeInterval.intersect(interval, otherInterval)`
    * `interval.contains(date)` -> `TimeInterval.contains(interval, date)`
  * Removed `TimeIntervalCollection.intersectInterval`.
  * `TimeIntervalCollection.findInterval` now takes a single options parameter instead of individual parameters.  Code that looked like:

            intervalCollection.findInterval(startTime, stopTime, false, true);

    should now look like:

            intervalCollection.findInterval({
                start : startTime,
                stop : stopTime,
                isStartIncluded : false,
                isStopIncluded : true
            });

  * `TimeIntervalCollection.empty` was renamed to `TimeIntervalCollection.isEmpty`
  * Removed `Scene.animations` and `AnimationCollection` from the public Cesium API.
  * Replaced `color`, `outlineColor`, and `outlineWidth` in `DynamicPath` with a `material` property.
  * `ModelAnimationCollection.add` and `ModelAnimationCollection.addAll` renamed `options.startOffset` to `options.delay`.  Also renamed `ModelAnimation.startOffset` to `ModelAnimation.delay`.
  * Replaced `Scene.scene2D.projection` property with read-only `Scene.mapProjection`.  Set this with the `mapProjection` option for the `Viewer`, `CesiumWidget`, or `Scene` constructors.
  * Moved Fresnel, Reflection, and Refraction materials to the [Materials Pack Plugin](https://github.com/AnalyticalGraphicsInc/cesium-materials-pack).
  * Renamed `Simon1994PlanetaryPositions` functions `ComputeSunPositionInEarthInertialFrame` and `ComputeMoonPositionInEarthInertialFrame` to `computeSunPositionInEarthInertialFrame` and `computeMoonPositionInEarthInertialFrame`, respectively.
  * `Scene` constructor function now takes an `options` parameter instead of individual parameters.
  * `CesiumWidget.showErrorPanel` now takes a `message` parameter in between the previous `title` and `error` parameters.
  * Removed `Camera.createCorrectPositionAnimation`.
  * Moved `LeapSecond.leapSeconds` to `JulianDate.leapSeconds`.
  * `Event.removeEventListener` no longer throws `DeveloperError` if the `listener` does not exist; it now returns `false`.
  * Enumeration values of `SceneMode` have better correspondence with mode names to help with debugging.
  * The build process now requires [Node.js](http://nodejs.org/) to be installed on the system.
* Cesium now supports Internet Explorer 11.0.9 on desktops.  For the best results, use the new [IE Developer Channel](http://devchannel.modern.ie/) for development.
* `ReferenceProperty` can now handle sub-properties, for example, `myObject#billboard.scale`.
* `DynamicObject.id` can now include period characters.
* Added `PolylineGlowMaterialProperty` which enables data sources to use the PolylineGlow material.
* Fixed support for embedded resources in glTF models.
* Added `HermitePolynomialApproximation.interpolate` for performing interpolation when derivative information is available.
* `SampledProperty` and `SampledPositionProperty` can now store derivative information for each sample value. This allows for more accurate interpolation when using `HermitePolynomialApproximation`.
* Added `FrameRateMonitor` to monitor the frame rate achieved by a `Scene` and to raise a `lowFrameRate` event when it falls below a configurable threshold.
* Added `PerformanceWatchdog` widget and `viewerPerformanceWatchdogMixin`.
* `Viewer` and `CesiumWidget` now provide more user-friendly error messages when an initialization or rendering error occurs.
* `Viewer` and `CesiumWidget` now take a new optional parameter, `creditContainer`.
* `Viewer` can now optionally be constructed with a `DataSourceCollection`.  Previously, it always created one itself internally.
* Fixed a problem that could rarely lead to the camera's `tilt` property being `NaN`.
* `GeoJsonDataSource` no longer uses the `name` or `title` property of the feature as the dynamic object's name if the value of the property is null.
* Added `TimeIntervalCollection.isStartIncluded` and `TimeIntervalCollection.isStopIncluded`.
* Added `Cesium.VERSION` to the combined `Cesium.js` file.
* Made general improvements to the [reference documentation](http://cesiumjs.org/refdoc.html).
* Updated third-party [Tween.js](https://github.com/sole/tween.js/) from r7 to r13.
* Updated third-party JSDoc 3.3.0-alpha5 to 3.3.0-alpha9.
* The development web server has been rewritten in Node.js, and is now included as part of each release.

### b29 - 2014-06-02

* Breaking changes ([why so many?](https://groups.google.com/forum/#!topic/cesium-dev/Y_mG11IZD9k))
  * Replaced `Scene.createTextureAtlas` with `new TextureAtlas`.
  * Removed `CameraFlightPath.createAnimationCartographic`. Code that looked like:

           var flight = CameraFlightPath.createAnimationCartographic(scene, {
               destination : cartographic
           });
           scene.animations.add(flight);

    should now look like:

           var flight = CameraFlightPath.createAnimation(scene, {
               destination : ellipsoid.cartographicToCartesian(cartographic)
           });
           scene.animations.add(flight);

  * Removed `CesiumWidget.onRenderLoopError` and `Viewer.renderLoopError`.  They have been replaced by `Scene.renderError`.
  * Renamed `CompositePrimitive` to `PrimitiveCollection` and added an `options` parameter to the constructor function.
  * Removed `Shapes.compute2DCircle`, `Shapes.computeCircleBoundary` and `Shapes.computeEllipseBoundary`.  Instead, use `CircleOutlineGeometry` and `EllipseOutlineGeometry`.  See the [tutorial](http://cesiumjs.org/2013/11/04/Geometry-and-Appearances/).
  * Removed `PolylinePipeline`, `PolygonPipeline`, `Tipsify`, `FrustumCommands`, and all `Renderer` types (except noted below) from the public Cesium API.  These are still available but are not part of the official API and may change in future versions.  `Renderer` types in particular are likely to change.
  * For AMD users only:
    * Moved `PixelFormat` from `Renderer` to `Core`.
    * Moved the following from `Renderer` to `Scene`: `TextureAtlas`, `TextureAtlasBuilder`, `BlendEquation`, `BlendFunction`, `BlendingState`, `CullFace`, `DepthFunction`, `StencilFunction`, and `StencilOperation`.
    * Moved the following from `Scene` to `Core`: `TerrainProvider`, `ArcGisImageServerTerrainProvider`,  `CesiumTerrainProvider`, `EllipsoidTerrainProvider`, `VRTheWorldTerrainProvider`, `TerrainData`, `HeightmapTerrainData`, `QuantizedMeshTerrainData`, `TerrainMesh`, `TilingScheme`, `GeographicTilingScheme`, `WebMercatorTilingScheme`, `sampleTerrain`, `TileProviderError`, `Credit`.
  * Removed `TilingScheme.createRectangleOfLevelZeroTiles`, `GeographicTilingScheme.createLevelZeroTiles` and `WebMercatorTilingScheme.createLevelZeroTiles`.
  * Removed `CameraColumbusViewMode`.
  * Removed `Enumeration`.
* Added new functions to `Cartesian3`: `fromDegrees`, `fromRadians`, `fromDegreesArray`, `fromRadiansArray`, `fromDegreesArray3D` and `fromRadiansArray3D`.  Added `fromRadians` to `Cartographic`.
* Fixed dark lighting in 3D and Columbus View when viewing a primitive edge on. ([#592](https://github.com/AnalyticalGraphicsInc/cesium/issues/592))
* Improved Internet Explorer 11.0.8 support including workarounds for rendering labels, billboards, and the sun.
* Improved terrain and imagery rendering performance when very close to the surface.
* Added `preRender` and `postRender` events to `Scene`.
* Added `Viewer.targetFrameRate` and `CesiumWidget.targetFrameRate` to allow for throttling of the requestAnimationFrame rate.
* Added `Viewer.resolutionScale` and `CesiumWidget.resolutionScale` to allow the scene to be rendered at a resolution other than the canvas size.
* `Camera.transform` now works consistently across scene modes.
* Fixed a bug that prevented `sampleTerrain` from working with STK World Terrain in Firefox.
* `sampleTerrain` no longer fails when used with a `TerrainProvider` that is not yet ready.
* Fixed problems that could occur when using `ArcGisMapServerImageryProvider` to access a tiled MapServer of non-global extent.
* Added `interleave` option to `Primitive` constructor.
* Upgraded JSDoc from 3.0 to 3.3.0-alpha5. The Cesium reference documentation now has a slightly different look and feel.
* Upgraded Dojo from 1.9.1 to 1.9.3. NOTE: Dojo is only used in Sandcastle and not required by Cesium.

### b28 - 2014-05-01

* Breaking changes ([why so many?](https://groups.google.com/forum/#!topic/cesium-dev/CQ0wCHjJ9x4)):
  * Renamed and moved `Scene.primitives.centralBody` moved to `Scene.globe`.
  * Removed `CesiumWidget.centralBody` and `Viewer.centralBody`.  Use `CesiumWidget.scene.globe` and `Viewer.scene.globe`.
  * Renamed `CentralBody` to `Globe`.
  * Replaced `Model.computeWorldBoundingSphere` with `Model.boundingSphere`.
  * Refactored visualizers, removing `setDynamicObjectCollection`, `getDynamicObjectCollection`, `getScene`, and `removeAllPrimitives` which are all superfluous after the introduction of `DataSourceDisplay`.  The affected classes are:
    * `DynamicBillboardVisualizer`
    * `DynamicConeVisualizerUsingCustomSensor`
    * `DynamicLabelVisualizer`
    * `DynamicModelVisualizer`
    * `DynamicPathVisualizer`
    * `DynamicPointVisualizer`
    * `DynamicPyramidVisualizer`
    * `DynamicVectorVisualizer`
    * `GeometryVisualizer`
  * Renamed Extent to Rectangle
    * `Extent` -> `Rectangle`
    * `ExtentGeometry` -> `RectangleGeomtry`
    * `ExtentGeometryOutline` -> `RectangleGeometryOutline`
    * `ExtentPrimitive` -> `RectanglePrimitive`
    * `BoundingRectangle.fromExtent` -> `BoundingRectangle.fromRectangle`
    * `BoundingSphere.fromExtent2D` -> `BoundingSphere.fromRectangle2D`
    * `BoundingSphere.fromExtentWithHeights2D` -> `BoundingSphere.fromRectangleWithHeights2D`
    * `BoundingSphere.fromExtent3D` -> `BoundingSphere.fromRectangle3D`
    * `EllipsoidalOccluder.computeHorizonCullingPointFromExtent` -> `EllipsoidalOccluder.computeHorizonCullingPointFromRectangle`
    * `Occluder.computeOccludeePointFromExtent` -> `Occluder.computeOccludeePointFromRectangle`
    * `Camera.getExtentCameraCoordinates` -> `Camera.getRectangleCameraCoordinates`
    * `Camera.viewExtent` -> `Camera.viewRectangle`
    * `CameraFlightPath.createAnimationExtent` -> `CameraFlightPath.createAnimationRectangle`
    * `TilingScheme.extentToNativeRectangle` -> `TilingScheme.rectangleToNativeRectangle`
    * `TilingScheme.tileXYToNativeExtent` -> `TilingScheme.tileXYToNativeRectangle`
    * `TilingScheme.tileXYToExtent` -> `TilingScheme.tileXYToRectangle`
  * Converted `DataSource` get methods into properties.
    * `getName` -> `name`
    * `getClock` -> `clock`
    * `getChangedEvent` -> `changedEvent`
    * `getDynamicObjectCollection` -> `dynamicObjects`
    * `getErrorEvent` -> `errorEvent`
  * `BaseLayerPicker` has been extended to support terrain selection ([#1607](https://github.com/AnalyticalGraphicsInc/cesium/pull/1607)).
    * The `BaseLayerPicker` constructor function now takes the container element and an options object instead of a CentralBody and ImageryLayerCollection.
    * The `BaseLayerPickerViewModel` constructor function now takes an options object instead of a `CentralBody` and `ImageryLayerCollection`.
    * `ImageryProviderViewModel` -> `ProviderViewModel`
    * `BaseLayerPickerViewModel.selectedName` -> `BaseLayerPickerViewModel.buttonTooltip`
    * `BaseLayerPickerViewModel.selectedIconUrl` -> `BaseLayerPickerViewModel.buttonImageUrl`
    * `BaseLayerPickerViewModel.selectedItem` -> `BaseLayerPickerViewModel.selectedImagery`
    * `BaseLayerPickerViewModel.imageryLayers`has been removed and replaced with `BaseLayerPickerViewModel.centralBody`
  * Renamed `TimeIntervalCollection.clear` to `TimeIntervalColection.removeAll`
  * `Context` is now private.
    * Removed `Scene.context`. Instead, use `Scene.drawingBufferWidth`, `Scene.drawingBufferHeight`, `Scene.maximumAliasedLineWidth`, and `Scene.createTextureAtlas`.
    * `Billboard.computeScreenSpacePosition`, `Label.computeScreenSpacePosition`, `SceneTransforms.clipToWindowCoordinates` and `SceneTransforms.clipToDrawingBufferCoordinates` take a `Scene` parameter instead of a `Context`.
    * `Camera` constructor takes `Scene` as parameter instead of `Context`
  * Types implementing the `ImageryProvider` interface arenow require a `hasAlphaChannel` property.
  * Removed `checkForChromeFrame` since Chrome Frame is no longer supported by Google.  See [Google's official announcement](http://blog.chromium.org/2013/06/retiring-chrome-frame.html).
  * Types implementing `DataSource` no longer need to implement `getIsTimeVarying`.
* Added a `NavigationHelpButton` widget that, when clicked, displays information about how to navigate around the globe with the mouse.  The new button is enabled by default in the `Viewer` widget.
* Added `Model.minimumPixelSize` property so models remain visible when the viewer zooms out.
* Added `DynamicRectangle` to support DataSource provided `RectangleGeometry`.
* Added `DynamicWall` to support DataSource provided `WallGeometry`.
* Improved texture upload performance and reduced memory usage when using `BingMapsImageryProvider` and other imagery providers that return false from `hasAlphaChannel`.
* Added the ability to offset the grid in the `GridMaterial`.
* `GeometryVisualizer` now creates geometry asynchronously to prevent locking up the browser.
* Add `Clock.canAnimate` to prevent time from advancing, even while the clock is animating.
* `Viewer` now prevents time from advancing if asynchronous geometry is being processed in order to avoid showing an incomplete picture.  This can be disabled via the `Viewer.allowDataSourcesToSuspendAnimation` settings.
* Added ability to modify glTF material parameters using `Model.getMaterial`, `ModelMaterial`, and `ModelMesh.material`.
* Added `asynchronous` and `ready` properties to `Model`.
* Added `Cartesian4.fromColor` and `Color.fromCartesian4`.
* Added `getScale` and `getMaximumScale` to `Matrix2`, `Matrix3`, and `Matrix4`.
* Upgraded Knockout from version 3.0.0 to 3.1.0.
* Upgraded TopoJSON from version 1.1.4 to 1.6.8.

### b27 - 2014-04-01

* Breaking changes:
  * All `CameraController` functions have been moved up to the `Camera`. Removed `CameraController`. For example, code that looked like:

           scene.camera.controller.viewExtent(extent);

    should now look like:

           scene.camera.viewExtent(extent);
  * Finished replacing getter/setter functions with properties:
    * `ImageryLayer`
      * `getImageryProvider` -> `imageryProvider`
      * `getExtent` -> `extent`
    * `Billboard`, `Label`
      * `getShow`, `setShow` -> `show`
      * `getPosition`, `setPosition` -> `position`
      * `getPixelOffset`, `setPixelOffset` -> `pixelOffset`
      * `getTranslucencyByDistance`, `setTranslucencyByDistance` -> `translucencyByDistance`
      * `getPixelOffsetScaleByDistance`, `setPixelOffsetScaleByDistance` -> `pixelOffsetScaleByDistance`
      * `getEyeOffset`, `setEyeOffset` -> `eyeOffset`
      * `getHorizontalOrigin`, `setHorizontalOrigin` -> `horizontalOrigin`
      * `getVerticalOrigin`, `setVerticalOrigin` -> `verticalOrigin`
      * `getScale`, `setScale` -> `scale`
      * `getId` -> `id`
    * `Billboard`
      * `getScaleByDistance`, `setScaleByDistance` -> `scaleByDistance`
      * `getImageIndex`, `setImageIndex` -> `imageIndex`
      * `getColor`, `setColor` -> `color`
      * `getRotation`, `setRotation` -> `rotation`
      * `getAlignedAxis`, `setAlignedAxis` -> `alignedAxis`
      * `getWidth`, `setWidth` -> `width`
      * `getHeight` `setHeight` -> `height`
    * `Label`
      * `getText`, `setText` -> `text`
      * `getFont`, `setFont` -> `font`
      * `getFillColor`, `setFillColor` -> `fillColor`
      * `getOutlineColor`, `setOutlineColor` -> `outlineColor`
      * `getOutlineWidth`, `setOutlineWidth` -> `outlineWidth`
      * `getStyle`, `setStyle` -> `style`
    * `Polygon`
      * `getPositions`, `setPositions` -> `positions`
    * `Polyline`
      * `getShow`, `setShow` -> `show`
      * `getPositions`, `setPositions` -> `positions`
      * `getMaterial`, `setMeterial` -> `material`
      * `getWidth`, `setWidth` -> `width`
      * `getLoop`, `setLoop` -> `loop`
      * `getId` -> `id`
    * `Occluder`
      * `getPosition` -> `position`
      * `getRadius` -> `radius`
      * `setCameraPosition` -> `cameraPosition`
    * `LeapSecond`
      * `getLeapSeconds`, `setLeapSeconds` -> `leapSeconds`
    * `Fullscreen`
      * `getFullscreenElement` -> `element`
      * `getFullscreenChangeEventName` -> `changeEventName`
      * `getFullscreenErrorEventName` -> `errorEventName`
      * `isFullscreenEnabled` -> `enabled`
      * `isFullscreen` -> `fullscreen`
    * `Event`
      * `getNumberOfListeners` -> `numberOfListeners`
    * `EllipsoidGeodesic`
      * `getSurfaceDistance` -> `surfaceDistance`
      * `getStart` -> `start`
      * `getEnd` -> `end`
      * `getStartHeading` -> `startHeading`
      * `getEndHeading` -> `endHeading`
    * `AnimationCollection`
      * `getAll` -> `all`
    * `CentralBodySurface`
      * `getTerrainProvider`, `setTerrainProvider` -> `terrainProvider`
    * `Credit`
      * `getText` -> `text`
      * `getImageUrl` -> `imageUrl`
      * `getLink` -> `link`
    * `TerrainData`, `HightmapTerrainData`, `QuanitzedMeshTerrainData`
      * `getWaterMask` -> `waterMask`
    * `Tile`
      * `getChildren` -> `children`
    * `Buffer`
      * `getSizeInBytes` -> `sizeInBytes`
      * `getUsage` -> `usage`
      * `getVertexArrayDestroyable`, `setVertexArrayDestroyable` -> `vertexArrayDestroyable`
    * `CubeMap`
      * `getPositiveX` -> `positiveX`
      * `getNegativeX` -> `negativeX`
      * `getPositiveY` -> `positiveY`
      * `getNegativeY` -> `negativeY`
      * `getPositiveZ` -> `positiveZ`
      * `getNegativeZ` -> `negativeZ`
    * `CubeMap`, `Texture`
      * `getSampler`, `setSampler` -> `sampler`
      * `getPixelFormat` -> `pixelFormat`
      * `getPixelDatatype` -> `pixelDatatype`
      * `getPreMultiplyAlpha` -> `preMultiplyAlpha`
      * `getFlipY` -> `flipY`
      * `getWidth` -> `width`
      * `getHeight` -> `height`
    * `CubeMapFace`
      * `getPixelFormat` -> `pixelFormat`
      * `getPixelDatatype` -> `pixelDatatype`
    * `Framebuffer`
      * `getNumberOfColorAttachments` -> `numberOfColorAttachments`
      * `getDepthTexture` -> `depthTexture`
      * `getDepthRenderbuffer` -> `depthRenderbuffer`
      * `getStencilRenderbuffer` -> `stencilRenderbuffer`
      * `getDepthStencilTexture` -> `depthStencilTexture`
      * `getDepthStencilRenderbuffer` -> `depthStencilRenderbuffer`
      * `hasDepthAttachment` -> `hasdepthAttachment`
    * `Renderbuffer`
      * `getFormat` -> `format`
      * `getWidth` -> `width`
      * `getHeight` -> `height`
    * `ShaderProgram`
      * `getVertexAttributes` -> `vertexAttributes`
      * `getNumberOfVertexAttributes` -> `numberOfVertexAttributes`
      * `getAllUniforms` -> `allUniforms`
      * `getManualUniforms` -> `manualUniforms`
    * `Texture`
      * `getDimensions` -> `dimensions`
    * `TextureAtlas`
      * `getBorderWidthInPixels` -> `borderWidthInPixels`
      * `getTextureCoordinates` -> `textureCoordinates`
      * `getTexture` -> `texture`
      * `getNumberOfImages` -> `numberOfImages`
      * `getGUID` -> `guid`
    * `VertexArray`
      * `getNumberOfAttributes` -> `numberOfAttributes`
      * `getIndexBuffer` -> `indexBuffer`
  * Finished removing prototype functions.  (Use 'static' versions of these functions instead):
    * `BoundingRectangle`
      * `union`, `expand`
    * `BoundingSphere`
      * `union`, `expand`, `getPlaneDistances`, `projectTo2D`
    * `Plane`
      * `getPointDistance`
    * `Ray`
      * `getPoint`
    * `Spherical`
      * `normalize`
    * `Extent`
      * `validate`, `getSouthwest`, `getNorthwest`, `getNortheast`, `getSoutheast`, `getCenter`, `intersectWith`, `contains`, `isEmpty`, `subsample`
  * `DataSource` now has additional required properties, `isLoading` and `loadingEvent` as well as a new optional `update` method which will be called each frame.
  * Renamed `Stripe` material uniforms `lightColor` and `darkColor` to `evenColor` and `oddColor`.
  * Replaced `SceneTransitioner` with new functions and properties on the `Scene`: `morphTo2D`, `morphToColumbusView`, `morphTo3D`, `completeMorphOnUserInput`, `morphStart`, `morphComplete`, and `completeMorph`.
  * Removed `TexturePool`.
* Improved visual quality for translucent objects with [Weighted Blended Order-Independent Transparency](http://cesiumjs.org/2014/03/14/Weighted-Blended-Order-Independent-Transparency/).
* Fixed extruded polygons rendered in the southern hemisphere. [#1490](https://github.com/AnalyticalGraphicsInc/cesium/issues/1490)
* Fixed Primitive picking that have a closed appearance drawn on the surface. [#1333](https://github.com/AnalyticalGraphicsInc/cesium/issues/1333)
* Added `StripeMaterialProperty` for supporting the `Stripe` material in DynamicScene.
* `loadArrayBuffer`, `loadBlob`, `loadJson`, `loadText`, and `loadXML` now support loading data from data URIs.
* The `debugShowBoundingVolume` property on primitives now works across all scene modes.
* Eliminated the use of a texture pool for Earth surface imagery textures.  The use of the pool was leading to mipmapping problems in current versions of Google Chrome where some tiles would show imagery from entirely unrelated parts of the globe.

### b26 - 2014-03-03

* Breaking changes:
  * Replaced getter/setter functions with properties:
    * `Scene`
      * `getCanvas` -> `canvas`
      * `getContext` -> `context`
      * `getPrimitives` -> `primitives`
      * `getCamera` -> `camera`
      * `getScreenSpaceCameraController`  -> `screenSpaceCameraController`
      * `getFrameState` -> `frameState`
      * `getAnimations` -> `animations`
    * `CompositePrimitive`
      * `getCentralBody`, `setCentralBody` -> `centralBody`
      * `getLength` -> `length`
    * `Ellipsoid`
      * `getRadii` -> `radii`
      * `getRadiiSquared` -> `radiiSquared`
      * `getRadiiToTheFourth` -> `radiiToTheFourth`
      * `getOneOverRadii` -> `oneOverRadii`
      * `getOneOverRadiiSquared` -> `oneOverRadiiSquared`
      * `getMinimumRadius` -> `minimumRadius`
      * `getMaximumRadius` -> `maximumRadius`
    * `CentralBody`
      * `getEllipsoid` -> `ellipsoid`
      * `getImageryLayers` -> `imageryLayers`
    * `EllipsoidalOccluder`
      * `getEllipsoid` -> `ellipsoid`
      * `getCameraPosition`, `setCameraPosition` -> `cameraPosition`
    * `EllipsoidTangentPlane`
      * `getEllipsoid` -> `ellipsoid`
      * `getOrigin` -> `origin`
    * `GeographicProjection`
      * `getEllipsoid` -> `ellipsoid`
    * `WebMercatorProjection`
      * `getEllipsoid` -> `ellipsoid`
    * `SceneTransitioner`
      * `getScene` -> `scene`
      * `getEllipsoid` -> `ellipsoid`
    * `ScreenSpaceCameraController`
      * `getEllipsoid`, `setEllipsoid` -> `ellipsoid`
    * `SkyAtmosphere`
      * `getEllipsoid` -> `ellipsoid`
    * `TilingScheme`, `GeographicTilingScheme`, `WebMercatorTilingSheme`
      * `getEllipsoid` -> `ellipsoid`
      * `getExtent` -> `extent`
      * `getProjection` -> `projection`
    * `ArcGisMapServerImageryProvider`, `BingMapsImageryProvider`, `GoogleEarthImageryProvider`, `GridImageryProvider`, `OpenStreetMapImageryProvider`, `SingleTileImageryProvider`, `TileCoordinatesImageryProvider`, `TileMapServiceImageryProvider`, `WebMapServiceImageryProvider`
      * `getProxy` -> `proxy`
      * `getTileWidth` -> `tileWidth`
      * `getTileHeight` -> `tileHeight`
      * `getMaximumLevel` -> `maximumLevel`
      * `getMinimumLevel` -> `minimumLevel`
      * `getTilingScheme` -> `tilingScheme`
      * `getExtent` -> `extent`
      * `getTileDiscardPolicy` -> `tileDiscardPolicy`
      * `getErrorEvent` -> `errorEvent`
      * `isReady` -> `ready`
      * `getCredit` -> `credit`
    * `ArcGisMapServerImageryProvider`, `BingMapsImageryProvider`, `GoogleEarthImageryProvider`, `OpenStreetMapImageryProvider`, `SingleTileImageryProvider`, `TileMapServiceImageryProvider`, `WebMapServiceImageryProvider`
      * `getUrl` -> `url`
    * `ArcGisMapServerImageryProvider`
      * `isUsingPrecachedTiles` - > `usingPrecachedTiles`
    * `BingMapsImageryProvider`
      * `getKey` -> `key`
      * `getMapStyle` -> `mapStyle`
    * `GoogleEarthImageryProvider`
      * `getPath` -> `path`
      * `getChannel` -> `channel`
      * `getVersion` -> `version`
      * `getRequestType` -> `requestType`
    * `WebMapServiceImageryProvider`
      * `getLayers` -> `layers`
    * `CesiumTerrainProvider`, `EllipsoidTerrainProvider`, `ArcGisImageServerTerrainProvider`, `VRTheWorldTerrainProvider`
      * `getErrorEvent` -> `errorEvent`
      * `getCredit` -> `credit`
      * `getTilingScheme` -> `tilingScheme`
      * `isReady` -> `ready`
    * `TimeIntervalCollection`
      * `getChangedEvent` -> `changedEvent`
      * `getStart` -> `start`
      * `getStop` -> `stop`
      * `getLength` -> `length`
      * `isEmpty` -> `empty`
    * `DataSourceCollection`, `ImageryLayerCollection`, `LabelCollection`, `PolylineCollection`, `SensorVolumeCollection`
      * `getLength` -> `length`
    * `BillboardCollection`
      * `getLength` -> `length`
      * `getTextureAtlas`, `setTextureAtlas` -> `textureAtlas`
      * `getDestroyTextureAtlas`, `setDestroyTextureAtlas` -> `destroyTextureAtlas`
  * Removed `Scene.getUniformState()`.  Use `scene.context.getUniformState()`.
  * Visualizers no longer create a `dynamicObject` property on the primitives they create.  Instead, they set the `id` property that is standard for all primitives.
  * The `propertyChanged` on DynamicScene objects has been renamed to `definitionChanged`.  Also, the event is now raised in the case of an existing property being modified as well as having a new property assigned (previously only property assignment would raise the event).
  * The `visualizerTypes` parameter to the `DataSouceDisplay` has been changed to a callback function that creates an array of visualizer instances.
  * `DynamicDirectionsProperty` and `DynamicVertexPositionsProperty` were both removed, they have been superseded by `PropertyArray` and `PropertyPositionArray`, which make it easy for DataSource implementations to create time-dynamic arrays.
  * `VisualizerCollection` has been removed.  It is superseded by `DataSourceDisplay`.
  * `DynamicEllipsoidVisualizer`, `DynamicPolygonVisualizer`, and `DynamicPolylineVisualizer` have been removed.  They are superseded by `GeometryVisualizer` and corresponding `GeometryUpdater` implementations; `EllipsoidGeometryUpdater`, `PolygonGeometryUpdater`, `PolylineGeometryUpdater`.
  * Modified `CameraFlightPath` functions to take place in the camera's current reference frame. The arguments to the function now need to be given in world coordinates and an optional reference frame can be given when the flight is completed.
  * `PixelDatatype` properties are now JavaScript numbers, not `Enumeration` instances.
  * `combine` now takes two objects instead of an array, and defaults to copying shallow references.  The `allowDuplicates` parameter has been removed.  In the event of duplicate properties, the first object's properties will be used.
  * Removed `FeatureDetection.supportsCrossOriginImagery`.  This check was only useful for very old versions of WebKit.
* Added `Model` for drawing 3D models using glTF.  See the [tutorial](http://cesiumjs.org/2014/03/03/Cesium-3D-Models-Tutorial/) and [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=3D%20Models.html&label=Showcases).
* DynamicScene now makes use of [Geometry and Appearances](http://cesiumjs.org/2013/11/04/Geometry-and-Appearances/), which provides a tremendous improvements to DataSource visualization (CZML, GeoJSON, etc..).  Extruded geometries are now supported and in many use cases performance is an order of magnitude faster.
* Added new `SelectionIndicator` and `InfoBox` widgets to `Viewer`, activated by `viewerDynamicObjectMixin`.
* `CesiumTerrainProvider` now supports mesh-based terrain like the tiles created by [STK Terrain Server](https://groups.google.com/forum/#!topic/cesium-dev/cP01iP7YOCU).
* Fixed rendering artifact on translucent objects when zooming in or out.
* Added `CesiumInspector` widget for graphics debugging.  In Cesium Viewer, it is enabled by using the query parameter `inspector=true`.  Also see the [Sandcastle example](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cesium%20Inspector.html&label=Showcases).
* Improved compatibility with Internet Explorer 11.
* `DynamicEllipse`, `DynamicPolygon`, and `DynamicEllipsoid` now have properties matching their geometry counterpart, i.e. `EllipseGeometry`, `EllipseOutlineGeometry`, etc. These properties are also available in CZML.
* Added a `definitionChanged` event to the `Property` interface as well as most `DynamicScene` objects.  This makes it easy for a client to observe when new data is loaded into a property or object.
* Added an `isConstant` property to the `Property` interface.  Constant properties do not change in regards to simulation time, i.e. `Property.getValue` will always return the same result for all times.
* `ConstantProperty` is now mutable; it's value can be updated via `ConstantProperty.setValue`.
* Improved the quality of imagery near the poles when the imagery source uses a `GeographicTilingScheme`.
* `OpenStreetMapImageryProvider` now supports imagery with a minimum level.
* `BingMapsImageryProvider` now uses HTTPS by default for metadata and tiles when the document is loaded over HTTPS.
* Added the ability for imagery providers to specify view-dependent attribution to be display in the `CreditDisplay`.
* View-dependent imagery source attribution is now added to the `CreditDisplay` by the `BingMapsImageryProvider`.
* Fixed viewing an extent. [#1431](https://github.com/AnalyticalGraphicsInc/cesium/issues/1431)
* Fixed camera tilt in ICRF. [#544](https://github.com/AnalyticalGraphicsInc/cesium/issues/544)
* Fixed developer error when zooming in 2D. If the zoom would create an invalid frustum, nothing is done. [#1432](https://github.com/AnalyticalGraphicsInc/cesium/issues/1432)
* Fixed `WallGeometry` bug that failed by removing positions that were less close together by less than 6 decimal places. [#1483](https://github.com/AnalyticalGraphicsInc/cesium/pull/1483)
* Fixed `EllipsoidGeometry` texture coordinates. [#1454](https://github.com/AnalyticalGraphicsInc/cesium/issues/1454)
* Added a loop property to `Polyline`s to join the first and last point. [#960](https://github.com/AnalyticalGraphicsInc/cesium/issues/960)
* Use `performance.now()` instead of `Date.now()`, when available, to limit time spent loading terrain and imagery tiles.  This results in more consistent frame rates while loading tiles on some systems.
* `RequestErrorEvent` now includes the headers that were returned with the error response.
* Added `AssociativeArray`, which is a helper class for maintaining a hash of objects that also needs to be iterated often.
* Added `TimeIntervalCollection.getChangedEvent` which returns an event that will be raised whenever intervals are updated.
* Added a second parameter to `Material.fromType` to override default uniforms. [#1522](https://github.com/AnalyticalGraphicsInc/cesium/pull/1522)
* Added `Intersections2D` class containing operations on 2D triangles.
* Added `czm_inverseViewProjection` and `czm_inverseModelViewProjection` automatic GLSL uniform.

### b25 - 2014-02-03

* Breaking changes:
  * The `Viewer` constructor argument `options.fullscreenElement` now matches the `FullscreenButton` default of `document.body`, it was previously the `Viewer` container itself.
  * Removed `Viewer.objectTracked` event; `Viewer.trackedObject` is now an ES5 Knockout observable that can be subscribed to directly.
  * Replaced `PerformanceDisplay` with `Scene.debugShowFramesPerSecond`.
  * `Asphalt`, `Blob`, `Brick`, `Cement`, `Erosion`, `Facet`, `Grass`, `TieDye`, and `Wood` materials were moved to the [Materials Pack Plugin](https://github.com/AnalyticalGraphicsInc/cesium-materials-pack).
  * Renamed `GeometryPipeline.createAttributeIndices` to `GeometryPipeline.createAttributeLocations`.
  * Renamed `attributeIndices` property to `attributeLocations` when calling `Context.createVertexArrayFromGeometry`.
  * `PerformanceDisplay` requires a DOM element as a parameter.
* Fixed globe rendering in the current Canary version of Google Chrome.
* `Viewer` now monitors the clock settings of the first added `DataSource` for changes, and also now has a constructor option `automaticallyTrackFirstDataSourceClock` which will turn off this behavior.
* The `DynamicObjectCollection` created by `CzmlDataSource` now sends a single `collectionChanged` event after CZML is loaded; previously it was sending an event every time an object was created or removed during the load process.
* Added `ScreenSpaceCameraController.enableInputs` to fix issue with inputs not being restored after overlapping camera flights.
* Fixed picking in 2D with rotated map. [#1337](https://github.com/AnalyticalGraphicsInc/cesium/issues/1337)
* `TileMapServiceImageryProvider` can now handle casing differences in tilemapresource.xml.
* `OpenStreetMapImageryProvider` now supports imagery with a minimum level.
* Added `Quaternion.fastSlerp` and `Quaternion.fastSquad`.
* Upgraded Tween.js to version r12.

### b24 - 2014-01-06

* Breaking changes:
  * Added `allowTextureFilterAnisotropic` (default: `true`) and `failIfMajorPerformanceCaveat` (default: `true`) properties to the `contextOptions` property passed to `Viewer`, `CesiumWidget`, and `Scene` constructors and moved the existing properties to a new `webgl` sub-property.  For example, code that looked like:

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
  * The read-only `Cartesian3` objects must now be cloned to camera properties instead of assigned. For example, code that looked like:

          camera.up = Cartesian3.UNIT_Z;

    should now look like:

          Cartesian3.clone(Cartesian3.UNIT_Z, camera.up);

  * The CSS files for individual widgets, e.g. `BaseLayerPicker.css`, no longer import other CSS files.  Most applications should import `widgets.css` (and optionally `lighter.css`).
  * `SvgPath` has been replaced by a Knockout binding: `cesiumSvgPath`.
  * `DynamicObject.availability` is now a `TimeIntervalCollection` instead of a `TimeInterval`.
  * Removed prototype version of `BoundingSphere.transform`.
  * `Matrix4.multiplyByPoint` now returns a `Cartesian3` instead of a `Cartesian4`.
* The minified, combined `Cesium.js` file now omits certain `DeveloperError` checks, to increase performance and reduce file size.  When developing your application, we recommend using the unminified version locally for early error detection, then deploying the minified version to production.
* Fixed disabling `CentralBody.enableLighting`.
* Fixed `Geocoder` flights when following an object.
* The `Viewer` widget now clears `Geocoder` input when the user clicks the home button.
* The `Geocoder` input type has been changed to `search`, which improves usability (particularly on mobile devices).  There were also some other minor styling improvements.
* Added `CentralBody.maximumScreenSpaceError`.
* Added `translateEventTypes`, `zoomEventTypes`, `rotateEventTypes`, `tiltEventTypes`, and `lookEventTypes` properties to `ScreenSpaceCameraController` to change the default mouse inputs.
* Added `Billboard.setPixelOffsetScaleByDistance`, `Label.setPixelOffsetScaleByDistance`, `DynamicBillboard.pixelOffsetScaleByDistance`, and `DynamicLabel.pixelOffsetScaleByDistance` to control minimum/maximum pixelOffset scaling based on camera distance.
* Added `BoundingSphere.transformsWithoutScale`.
* Added `fromArray` function to `Matrix2`, `Matrix3` and `Matrix4`.
* Added `Matrix4.multiplyTransformation`, `Matrix4.multiplyByPointAsVector`.

### b23 - 2013-12-02

* Breaking changes:
  * Changed the `CatmulRomSpline` and `HermiteSpline` constructors from taking an array of structures to a structure of arrays. For example, code that looked like:

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
  * `loadWithXhr` now takes an options object, and allows specifying HTTP method and data to send with the request.
  * Renamed `SceneTransitioner.onTransitionStart` to `SceneTransitioner.transitionStart`.
  * Renamed `SceneTransitioner.onTransitionComplete` to `SceneTransitioner.transitionComplete`.
  * Renamed `CesiumWidget.onRenderLoopError` to `CesiumWidget.renderLoopError`.
  * Renamed `SceneModePickerViewModel.onTransitionStart` to `SceneModePickerViewModel.transitionStart`.
  * Renamed `Viewer.onRenderLoopError` to `Viewer.renderLoopError`.
  * Renamed `Viewer.onDropError` to `Viewer.dropError`.
  * Renamed `CesiumViewer.onDropError` to `CesiumViewer.dropError`.
  * Renamed `viewerDragDropMixin.onDropError` to `viewerDragDropMixin.dropError`.
  * Renamed `viewerDynamicObjectMixin.onObjectTracked` to `viewerDynamicObjectMixin.objectTracked`.
  * `PixelFormat`, `PrimitiveType`, `IndexDatatype`, `TextureWrap`, `TextureMinificationFilter`, and `TextureMagnificationFilter` properties are now JavaScript numbers, not `Enumeration` instances.
  * Replaced `sizeInBytes` properties on `IndexDatatype` with `IndexDatatype.getSizeInBytes`.
* Added `perPositionHeight` option to `PolygonGeometry` and `PolygonOutlineGeometry`.
* Added `QuaternionSpline` and `LinearSpline`.
* Added `Quaternion.log`, `Quaternion.exp`, `Quaternion.innerQuadrangle`, and `Quaternion.squad`.
* Added `Matrix3.inverse` and `Matrix3.determinant`.
* Added `ObjectOrientedBoundingBox`.
* Added `Ellipsoid.transformPositionFromScaledSpace`.
* Added `Math.nextPowerOfTwo`.
* Renamed our main website from [cesium.agi.com](http://cesium.agi.com/) to [cesiumjs.org](http://cesiumjs.org/).

### b22 - 2013-11-01

* Breaking changes:
  * Reversed the rotation direction of `Matrix3.fromQuaternion` to be consistent with graphics conventions. Mirrored change in `Quaternion.fromRotationMatrix`.
  * The following prototype functions were removed:
    * From `Matrix2`, `Matrix3`, and `Matrix4`: `toArray`, `getColumn`, `setColumn`, `getRow`, `setRow`, `multiply`, `multiplyByVector`, `multiplyByScalar`, `negate`, and `transpose`.
    * From `Matrix4`: `getTranslation`, `getRotation`, `inverse`, `inverseTransformation`, `multiplyByTranslation`, `multiplyByUniformScale`, `multiplyByPoint`. For example, code that previously looked like `matrix.toArray();` should now look like `Matrix3.toArray(matrix);`.
  * Replaced `DynamicPolyline` `color`, `outlineColor`, and `outlineWidth` properties with a single `material` property.
  * Renamed `DynamicBillboard.nearFarScalar` to `DynamicBillboard.scaleByDistance`.
  * All data sources must now implement `DataSource.getName`, which returns a user-readable name for the data source.
  * CZML `document` objects are no longer added to the `DynamicObjectCollection` created by `CzmlDataSource`.  Use the `CzmlDataSource` interface to access the data instead.
  * `TimeInterval.equals`, and `TimeInterval.equalsEpsilon` now compare interval data as well.
  * All SVG files were deleted from `Widgets/Images` and replaced by a new `SvgPath` class.
  * The toolbar widgets (Home, SceneMode, BaseLayerPicker) and the fullscreen button now depend on `CesiumWidget.css` for global Cesium button styles.
  * The toolbar widgets expect their `container` to be the toolbar itself now, no need for separate containers for each widget on the bar.
  * `Property` implementations are now required to implement a prototype `equals` function.
  * `ConstantProperty` and `TimeIntervalCollectionProperty` no longer take a `clone` function and instead require objects to implement prototype `clone` and `equals` functions.
  * The `SkyBox` constructor now takes an `options` argument with a `sources` property, instead of directly taking `sources`.
  * Replaced `SkyBox.getSources` with `SkyBox.sources`.
  * The `bearing` property of `DynamicEllipse` is now called `rotation`.
  * CZML `ellipse.bearing` property is now `ellipse.rotation`.
* Added a `Geocoder` widget that allows users to enter an address or the name of a landmark and zoom to that location.  It is enabled by default in applications that use the `Viewer` widget.
* Added `GoogleEarthImageryProvider`.
* Added `Moon` for drawing the moon, and `IauOrientationAxes` for computing the Moon's orientation.
* Added `Material.translucent` property. Set this property or `Appearance.translucent` for correct rendering order. Translucent geometries are rendered after opaque geometries.
* Added `enableLighting`, `lightingFadeOutDistance`, and `lightingFadeInDistance` properties to `CentralBody` to configure lighting.
* Added `Billboard.setTranslucencyByDistance`, `Label.setTranslucencyByDistance`, `DynamicBillboard.translucencyByDistance`, and `DynamicLabel.translucencyByDistance` to control minimum/maximum translucency based on camera distance.
* Added `PolylineVolumeGeometry` and `PolylineVolumeGeometryOutline`.
* Added `Shapes.compute2DCircle`.
* Added `Appearances` tab to Sandcastle with an example for each geometry appearance.
* Added `Scene.drillPick` to return list of objects each containing 1 primitive at a screen space position.
* Added `PolylineOutlineMaterialProperty` for use with `DynamicPolyline.material`.
* Added the ability to use `Array` and `JulianDate` objects as custom CZML properties.
* Added `DynamicObject.name` and corresponding CZML support.  This is a non-unique, user-readable name for the object.
* Added `DynamicObject.parent` and corresponding CZML support.  This allows for `DataSource` objects to present data hierarchically.
* Added `DynamicPoint.scaleByDistance` to control minimum/maximum point size based on distance from the camera.
* The toolbar widgets (Home, SceneMode, BaseLayerPicker) and the fullscreen button can now be styled directly with user-supplied CSS.
* Added `skyBox` to the `CesiumWidget` and `Viewer` constructors for changing the default stars.
* Added `Matrix4.fromTranslationQuaternionRotationScale` and `Matrix4.multiplyByScale`.
* Added `Matrix3.getEigenDecomposition`.
* Added utility function `getFilenameFromUri`, which given a URI with or without query parameters, returns the last segment of the URL.
* Added prototype versions of `equals` and `equalsEpsilon` method back to `Cartesian2`, `Cartesian3`, `Cartesian4`, and `Quaternion`.
* Added prototype equals function to `NearFarScalar`, and `TimeIntervalCollection`.
* Added `FrameState.events`.
* Added `Primitive.allowPicking` to save memory when picking is not needed.
* Added `debugShowBoundingVolume`, for debugging primitive rendering, to `Primitive`, `Polygon`, `ExtentPrimitive`, `EllipsoidPrimitive`, `BillboardCollection`, `LabelCollection`, and `PolylineCollection`.
* Added `DebugModelMatrixPrimitive` for debugging primitive's `modelMatrix`.
* Added `options` argument to the `EllipsoidPrimitive` constructor.
* Upgraded Knockout from version 2.3.0 to 3.0.0.
* Upgraded RequireJS to version 2.1.9, and Almond to 0.2.6.
* Added a user-defined `id` to all primitives for use with picking.  For example:

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

* Breaking changes:
   * Cesium now prints a reminder to the console if your application uses Bing Maps imagery and you do not supply a Bing Maps key for your application.  This is a reminder that you should create a Bing Maps key for your application as soon as possible and prior to deployment.  You can generate a Bing Maps key by visiting [https://www.bingmapsportal.com/](https://www.bingmapsportal.com/).  Set the `BingMapsApi.defaultKey` property to the value of your application's key before constructing the `CesiumWidget` or any other types that use the Bing Maps API.

            BingMapsApi.defaultKey = 'my-key-generated-with-bingmapsportal.com';

   * `Scene.pick` now returns an object with a `primitive` property, not the primitive itself.  For example, code that looked like:

            var primitive = scene.pick(/* ... */);
            if (defined(primitive)) {
               // Use primitive
            }

      should now look like:

            var p = scene.pick(/* ... */);
            if (defined(p) && defined(p.primitive)) {
               // Use p.primitive
            }

   * Removed `getViewMatrix`, `getInverseViewMatrix`, `getInverseTransform`, `getPositionWC`, `getDirectionWC`, `getUpWC` and `getRightWC` from `Camera`. Instead, use the `viewMatrix`, `inverseViewMatrix`, `inverseTransform`, `positionWC`, `directionWC`, `upWC`, and `rightWC` properties.
   * Removed `getProjectionMatrix` and `getInfiniteProjectionMatrix` from `PerspectiveFrustum`, `PerspectiveOffCenterFrustum` and `OrthographicFrustum`. Instead, use the `projectionMatrix` and `infiniteProjectionMatrix` properties.
   * The following prototype functions were removed:
      * From `Quaternion`: `conjugate`, `magnitudeSquared`, `magnitude`, `normalize`, `inverse`, `add`, `subtract`, `negate`, `dot`, `multiply`, `multiplyByScalar`, `divideByScalar`, `getAxis`, `getAngle`, `lerp`, `slerp`, `equals`, `equalsEpsilon`
      * From `Cartesian2`, `Cartesian3`, and `Cartesian4`: `getMaximumComponent`, `getMinimumComponent`, `magnitudeSquared`, `magnitude`, `normalize`, `dot`, `multiplyComponents`, `add`, `subtract`, `multiplyByScalar`, `divideByScalar`, `negate`, `abs`, `lerp`, `angleBetween`, `mostOrthogonalAxis`, `equals`, and `equalsEpsilon`.
      * From `Cartesian3`: `cross`

      Code that previously looked like `quaternion.magnitude();` should now look like `Quaternion.magnitude(quaternion);`.
   * `DynamicObjectCollection` and `CompositeDynamicObjectCollection` have been largely re-written, see the documentation for complete details.  Highlights include:
      * `getObject` has been renamed `getById`.
      * `removeObject` has been renamed `removeById`.
      * `collectionChanged` event added for notification of objects being added or removed.
   * `DynamicScene` graphics object (`DynamicBillboard`, etc...) have had their static `mergeProperties` and `clean` functions removed.
   * `UniformState.update` now takes a context as its first parameter.
   * `Camera` constructor now takes a context instead of a canvas.
   * `SceneTransforms.clipToWindowCoordinates` now takes a context instead of a canvas.
   * Removed `canvasDimensions` from `FrameState`.
   * Removed `context` option from `Material` constructor and parameter from `Material.fromType`.
   * Renamed `TextureWrap.CLAMP` to `TextureWrap.CLAMP_TO_EDGE`.
* Added `Geometries` tab to Sandcastle with an example for each geometry type.
* Added `CorridorOutlineGeometry`.
* Added `PolylineGeometry`, `PolylineColorAppearance`, and `PolylineMaterialAppearance`.
* Added `colors` option to `SimplePolylineGeometry` for per vertex or per segment colors.
* Added proper support for browser zoom.
* Added `propertyChanged` event to `DynamicScene` graphics objects for receiving change notifications.
* Added prototype `clone` and `merge` functions to `DynamicScene` graphics objects.
* Added `width`, `height`, and `nearFarScalar` properties to `DynamicBillboard` for controlling the image size.
* Added `heading` and `tilt` properties to `CameraController`.
* Added `Scene.sunBloom` to enable/disable the bloom filter on the sun. The bloom filter should be disabled for better frame rates on mobile devices.
* Added `getDrawingBufferWidth` and `getDrawingBufferHeight` to `Context`.
* Added new built-in GLSL functions `czm_getLambertDiffuse` and `czm_getSpecular`.
* Added support for [EXT_frag_depth](http://www.khronos.org/registry/webgl/extensions/EXT_frag_depth/).
* Improved graphics performance.
    * An Everest terrain view went from 135-140 to over 150 frames per second.
    * Rendering over a thousand polylines in the same collection with different materials went from 20 to 40 frames per second.
* Improved runtime generation of GLSL shaders.
* Made sun size accurate.
* Fixed bug in triangulation that fails on complex polygons. Instead, it makes a best effort to render what it can. [#1121](https://github.com/AnalyticalGraphicsInc/cesium/issues/1121)
* Fixed geometries not closing completely. [#1093](https://github.com/AnalyticalGraphicsInc/cesium/issues/1093)
* Fixed `EllipsoidTangentPlane.projectPointOntoPlane` for tangent planes on an ellipsoid other than the unit sphere.
* `CompositePrimitive.add` now returns the added primitive. This allows us to write more concise code.

        var p = new Primitive(/* ... */);
        primitives.add(p);
        return p;

  becomes

        return primitives.add(new Primitive(/* ... */));

### b20 - 2013-09-03

_This releases fixes 2D and other issues with Chrome 29.0.1547.57 ([#1002](https://github.com/AnalyticalGraphicsInc/cesium/issues/1002) and [#1047](https://github.com/AnalyticalGraphicsInc/cesium/issues/1047))._

* Breaking changes:
    * The `CameraFlightPath` functions `createAnimation`, `createAnimationCartographic`, and `createAnimationExtent` now take `scene` as their first parameter instead of `frameState`.
    * Completely refactored the `DynamicScene` property system to vastly improve the API. See [#1080](https://github.com/AnalyticalGraphicsInc/cesium/pull/1080) for complete details.
       * Removed `CzmlBoolean`, `CzmlCartesian2`, `CzmlCartesian3`, `CzmlColor`, `CzmlDefaults`, `CzmlDirection`, `CzmlHorizontalOrigin`, `CzmlImage`, `CzmlLabelStyle`, `CzmlNumber`, `CzmlPosition`, `CzmlString`, `CzmlUnitCartesian3`, `CzmlUnitQuaternion`, `CzmlUnitSpherical`, and `CzmlVerticalOrigin` since they are no longer needed.
       * Removed `DynamicProperty`, `DynamicMaterialProperty`, `DynamicDirectionsProperty`, and `DynamicVertexPositionsProperty`; replacing them with an all new system of properties.
          * `Property` - base interface for all properties.
          * `CompositeProperty` - a property composed of other properties.
          * `ConstantProperty` - a property whose value never changes.
          * `SampledProperty` - a property whose value is interpolated from a set of samples.
          * `TimeIntervalCollectionProperty` - a property whose value changes based on time interval.
          * `MaterialProperty` - base interface for all material properties.
          * `CompositeMaterialProperty` - a `CompositeProperty` for materials.
          * `ColorMaterialProperty` - a property that maps to a color material. (replaces `DynamicColorMaterial`)
          * `GridMaterialProperty` - a property that maps to a grid material. (replaces `DynamicGridMaterial`)
          * `ImageMaterialProperty` - a property that maps to an image material. (replaces `DynamicImageMaterial`)
          * `PositionProperty`- base interface for all position properties.
          * `CompositePositionProperty` - a `CompositeProperty` for positions.
          * `ConstantPositionProperty` - a `PositionProperty` whose value does not change in respect to the `ReferenceFrame` in which is it defined.
          * `SampledPositionProperty` - a `SampledProperty` for positions.
          * `TimeIntervalCollectionPositionProperty` - A `TimeIntervalCollectionProperty` for positions.
    * Removed `processCzml`, use `CzmlDataSource` instead.
    * `Source/Widgets/Viewer/lighter.css` was deleted, use `Source/Widgets/lighter.css` instead.
    * Replaced `ExtentGeometry` parameters for extruded extent to make them consistent with other geometries.
      * `options.extrudedOptions.height` -> `options.extrudedHeight`
      * `options.extrudedOptions.closeTop` -> `options.closeBottom`
      * `options.extrudedOptions.closeBottom` -> `options.closeTop`
    * Geometry constructors no longer compute vertices or indices. Use the type's `createGeometry` method. For example, code that looked like:

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

    * Removed `createTypedArray` and `createArrayBufferView` from each of the `ComponentDatatype` enumerations. Instead, use `ComponentDatatype.createTypedArray` and `ComponentDatatype.createArrayBufferView`.
    * `DataSourceDisplay` now requires a `DataSourceCollection` to be passed into its constructor.
    * `DeveloperError` and `RuntimeError` no longer contain an `error` property.  Call `toString`, or check the `stack` property directly instead.
    * Replaced `createPickFragmentShaderSource` with `createShaderSource`.
    * Renamed `PolygonPipeline.earClip2D` to `PolygonPipeline.triangulate`.
* Added outline geometries.  [#1021](https://github.com/AnalyticalGraphicsInc/cesium/pull/1021).
* Added `CorridorGeometry`.
* Added `Billboard.scaleByDistance` and `NearFarScalar` to control billboard minimum/maximum scale based on camera distance.
* Added `EllipsoidGeodesic`.
* Added `PolylinePipeline.scaleToSurface`.
* Added `PolylinePipeline.scaleToGeodeticHeight`.
* Added the ability to specify a `minimumTerrainLevel` and `maximumTerrainLevel` when constructing an `ImageryLayer`.  The layer will only be shown for terrain tiles within the specified range.
* Added `Math.setRandomNumberSeed` and `Math.nextRandomNumber` for generating repeatable random numbers.
* Added `Color.fromRandom` to generate random and partially random colors.
* Added an `onCancel` callback to `CameraFlightPath` functions that will be executed if the flight is canceled.
* Added `Scene.debugShowFrustums` and `Scene.debugFrustumStatistics` for rendering debugging.
* Added `Packable` and `PackableForInterpolation` interfaces to aid interpolation and in-memory data storage.  Also made most core Cesium types implement them.
* Added `InterpolationAlgorithm` interface to codify the base interface already being used by `LagrangePolynomialApproximation`, `LinearApproximation`, and `HermitePolynomialApproximation`.
* Improved the performance of polygon triangulation using an O(n log n) algorithm.
* Improved geometry batching performance by moving work to a web worker.
* Improved `WallGeometry` to follow the curvature of the earth.
* Improved visual quality of closed translucent geometries.
* Optimized polyline bounding spheres.
* `Viewer` now automatically sets its clock to that of the first added `DataSource`, regardless of how it was added to the `DataSourceCollection`.  Previously, this was only done for dropped files by `viewerDragDropMixin`.
* `CesiumWidget` and `Viewer` now display an HTML error panel if an error occurs while rendering, which can be disabled with a constructor option.
* `CameraFlightPath` now automatically disables and restores mouse input for the flights it generates.
* Fixed broken surface rendering in Columbus View when using the `EllipsoidTerrainProvider`.
* Fixed triangulation for polygons that cross the international date line.
* Fixed `EllipsoidPrimitive` rendering for some oblate ellipsoids. [#1067](https://github.com/AnalyticalGraphicsInc/cesium/pull/1067).
* Fixed Cesium on Nexus 4 with Android 4.3.
* Upgraded Knockout from version 2.2.1 to 2.3.0.

### b19 - 2013-08-01

* Breaking changes:
   * Replaced tessellators and meshes with geometry.  In particular:
      * Replaced `CubeMapEllipsoidTessellator` with `EllipsoidGeometry`.
      * Replaced `BoxTessellator` with `BoxGeometry`.
      * Replaced `ExtentTessletaor` with `ExtentGeometry`.
      * Removed `PlaneTessellator`.  It was incomplete and not used.
      * Renamed `MeshFilters` to `GeometryPipeline`.
      * Renamed `MeshFilters.toWireframeInPlace` to `GeometryPipeline.toWireframe`.
      * Removed `MeshFilters.mapAttributeIndices`.  It was not used.
      * Renamed `Context.createVertexArrayFromMesh` to `Context.createVertexArrayFromGeometry`.  Likewise, renamed `mesh` constructor property to `geometry`.
   * Renamed `ComponentDatatype.*.toTypedArray` to `ComponentDatatype.*.createTypedArray`.
   * Removed `Polygon.configureExtent`.  Use `ExtentPrimitive` instead.
   * Removed `Polygon.bufferUsage`.  It is no longer needed.
   * Removed `height` and `textureRotationAngle` arguments from `Polygon` `setPositions` and `configureFromPolygonHierarchy` functions.  Use `Polygon` `height` and `textureRotationAngle` properties.
   * Renamed `PolygonPipeline.cleanUp` to `PolygonPipeline.removeDuplicates`.
   * Removed `PolygonPipeline.wrapLongitude`. Use `GeometryPipeline.wrapLongitude` instead.
   * Added `surfaceHeight` parameter to `BoundingSphere.fromExtent3D`.
   * Added `surfaceHeight` parameter to `Extent.subsample`.
   * Renamed `pointInsideTriangle2D` to `pointInsideTriangle`.
   * Renamed `getLogo` to `getCredit` for `ImageryProvider` and `TerrainProvider`.
* Added Geometry and Appearances [#911](https://github.com/AnalyticalGraphicsInc/cesium/pull/911).
* Added property `intersectionWidth` to `DynamicCone`, `DynamicPyramid`, `CustomSensorVolume`, and `RectangularPyramidSensorVolume`.
* Added `ExtentPrimitive`.
* Added `PolylinePipeline.removeDuplicates`.
* Added `barycentricCoordinates` to compute the barycentric coordinates of a point in a triangle.
* Added `BoundingSphere.fromEllipsoid`.
* Added `BoundingSphere.projectTo2D`.
* Added `Extent.fromDegrees`.
* Added `czm_tangentToEyeSpaceMatrix` built-in GLSL function.
* Added debugging aids for low-level rendering: `DrawCommand.debugShowBoundingVolume` and `Scene.debugCommandFilter`.
* Added extrusion to `ExtentGeometry`.
* Added `Credit` and `CreditDisplay` for displaying credits on the screen.
* Improved performance and visual quality of `CustomSensorVolume` and `RectangularPyramidSensorVolume`.
* Improved the performance of drawing polygons created with `configureFromPolygonHierarchy`.

### b18 - 2013-07-01

* Breaking changes:
   * Removed `CesiumViewerWidget` and replaced it with a new `Viewer` widget with mixin architecture. This new widget does not depend on Dojo and is part of the combined Cesium.js file. It is intended to be a flexible base widget for easily building robust applications. ([#838](https://github.com/AnalyticalGraphicsInc/cesium/pull/838))
   * Changed all widgets to use ECMAScript 5 properties.  All public observable properties now must be accessed and assigned as if they were normal properties, instead of being called as functions.  For example:
      * `clockViewModel.shouldAnimate()` -> `clockViewModel.shouldAnimate`
      * `clockViewModel.shouldAnimate(true);` -> `clockViewModel.shouldAnimate = true;`
   * `ImageryProviderViewModel.fromConstants` has been removed.  Use the `ImageryProviderViewModel` constructor directly.
   * Renamed the `transitioner` property on `CesiumWidget`, `HomeButton`, and `ScreenModePicker` to `sceneTrasitioner` to be consistent with property naming convention.
   * `ImageryProvider.loadImage` now requires that the calling imagery provider instance be passed as its first parameter.
   * Removed the Dojo-based `checkForChromeFrame` function, and replaced it with a new standalone version that returns a promise to signal when the asynchronous check has completed.
   * Removed `Assets/Textures/NE2_LR_LC_SR_W_DR_2048.jpg`.  If you were previously using this image with `SingleTileImageryProvider`, consider instead using `TileMapServiceImageryProvider` with a URL of `Assets/Textures/NaturalEarthII`.
   * The `Client CZML` SandCastle demo has been removed, largely because it is redundant with the Simple CZML demo.
   * The `Two Viewer Widgets` SandCastle demo has been removed. We will add back a multi-scene example when we have a good architecture for it in place.
   * Changed static `clone` functions in all objects such that if the object being cloned is undefined, the function will return undefined instead of throwing an exception.
* Fix resizing issues in `CesiumWidget` ([#608](https://github.com/AnalyticalGraphicsInc/cesium/issues/608), [#834](https://github.com/AnalyticalGraphicsInc/cesium/issues/834)).
* Added initial support for [GeoJSON](http://www.geojson.org/) and [TopoJSON](https://github.com/mbostock/topojson). ([#890](https://github.com/AnalyticalGraphicsInc/cesium/pull/890), [#906](https://github.com/AnalyticalGraphicsInc/cesium/pull/906))
* Added rotation, aligned axis, width, and height properties to `Billboard`s.
* Improved the performance of "missing tile" checking, especially for Bing imagery.
* Improved the performance of terrain and imagery refinement, especially when using a mixture of slow and fast imagery sources.
* `TileMapServiceImageryProvider` now supports imagery with a minimum level.  This improves compatibility with tile sets generated by MapTiler or gdal2tiles.py using their default settings.
* Added `Context.getAntialias`.
* Improved test robustness on Mac.
* Upgraded RequireJS to version 2.1.6, and Almond to 0.2.5.
* Fixed artifacts that showed up on the edges of imagery tiles on a number of GPUs.
* Fixed an issue in `BaseLayerPicker` where destroy wasn't properly cleaning everything up.
* Added the ability to unsubscribe to `Timeline` update event.
* Added a `screenSpaceEventHandler` property to `CesiumWidget`. Also added a `sceneMode` option to the constructor to set the initial scene mode.
* Added `useDefaultRenderLoop` property to `CesiumWidget` that allows the default render loop to be disabled so that a custom render loop can be used.
* Added `CesiumWidget.onRenderLoopError` which is an `Event` that is raised if an exception is generated inside of the default render loop.
* `ImageryProviderViewModel.creationCommand` can now return an array of ImageryProvider instances, which allows adding multiple layers when a single item is selected in the `BaseLayerPicker` widget.

### b17 - 2013-06-03

* Breaking changes:
   * Replaced `Uniform.getFrameNumber` and `Uniform.getTime` with `Uniform.getFrameState`, which returns the full frame state.
   * Renamed `Widgets/Fullscreen` folder to `Widgets/FullscreenButton` along with associated objects/files.
      * `FullscreenWidget` -> `FullscreenButton`
      * `FullscreenViewModel` -> `FullscreenButtonViewModel`
   * Removed `addAttribute`, `removeAttribute`, and `setIndexBuffer` from `VertexArray`.  They were not used.
* Added support for approximating local vertical, local horizontal (LVLH) reference frames when using `DynamicObjectView` in 3D.  The object automatically selects LVLH or EastNorthUp based on the object's velocity.
* Added support for CZML defined vectors via new `CzmlDirection`, `DynamicVector`, and `DynamicVectorVisualizer` objects.
* Added `SceneTransforms.wgs84ToWindowCoordinates`. [#746](https://github.com/AnalyticalGraphicsInc/cesium/issues/746).
* Added `fromElements` to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
* Added `DrawCommand.cull` to avoid redundant visibility checks.
* Added `czm_morphTime` automatic GLSL uniform.
* Added support for [OES_vertex_array_object](http://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/), which improves rendering performance.
* Added support for floating-point textures.
* Added `IntersectionTests.trianglePlaneIntersection`.
* Added `computeHorizonCullingPoint`, `computeHorizonCullingPointFromVertices`, and `computeHorizonCullingPointFromExtent` methods to `EllipsoidalOccluder` and used them to build a more accurate horizon occlusion test for terrain rendering.
* Added sun visualization. See `Sun` and `Scene.sun`.
* Added a new `HomeButton` widget for returning to the default view of the current scene mode.
* Added `Command.beforeExecute` and `Command.afterExecute` events to enable additional processing when a command is executed.
* Added rotation parameter to `Polygon.configureExtent`.
* Added camera flight to extents.  See new methods `CameraController.getExtentCameraCoordinates` and `CameraFlightPath.createAnimationExtent`.
* Improved the load ordering of terrain and imagery tiles, so that relevant detail is now more likely to be loaded first.
* Improved appearance of the Polyline arrow material.
* Fixed polyline clipping artifact. [#728](https://github.com/AnalyticalGraphicsInc/cesium/issues/728).
* Fixed polygon crossing International Date Line for 2D and Columbus view. [#99](https://github.com/AnalyticalGraphicsInc/cesium/issues/99).
* Fixed issue for camera flights when `frameState.mode === SceneMode.MORPHING`.
* Fixed ISO8601 date parsing when UTC offset is specified in the extended format, such as `2008-11-10T14:00:00+02:30`.

### b16 - 2013-05-01

* Breaking changes:
   * Removed the color, outline color, and outline width properties of polylines. Instead, use materials for polyline color and outline properties. Code that looked like:

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

   * `CzmlCartographic` has been removed and all cartographic values are converted to Cartesian internally during CZML processing.  This improves performance and fixes interpolation of cartographic source data.  The Cartographic representation can still be retrieved if needed.
   * Removed `ComplexConicSensorVolume`, which was not documented and did not work on most platforms.  It will be brought back in a future release.  This does not affect CZML, which uses a custom sensor to approximate a complex conic.
   * Replaced `computeSunPosition` with `Simon1994PlanetaryPosition`, which has functions to calculate the position of the sun and the moon more accurately.
   * Removed `Context.createClearState`.  These properties are now part of `ClearCommand`.
   * `RenderState` objects returned from `Context.createRenderState` are now immutable.
   * Removed `positionMC` from `czm_materialInput`.  It is no longer used by any materials.
* Added wide polylines that work with and without ANGLE.
* Polylines now use materials to describe their surface appearance. See the [Fabric](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric) wiki page for more details on how to create materials.
* Added new `PolylineOutline`, `PolylineGlow`, `PolylineArrow`, and `Fade` materials.
* Added `czm_pixelSizeInMeters` automatic GLSL uniform.
* Added `AnimationViewModel.snapToTicks`, which when set to true, causes the shuttle ring on the Animation widget to snap to the defined tick values, rather than interpolate between them.
* Added `Color.toRgba` and `Color.fromRgba` to convert to/from numeric unsigned 32-bit RGBA values.
* Added `GridImageryProvider` for custom rendering effects and debugging.
* Added new `Grid` material.
* Made `EllipsoidPrimitive` double-sided.
* Improved rendering performance by minimizing WebGL state calls.
* Fixed an error in Web Worker creation when loading Cesium.js from a different origin.
* Fixed `EllipsoidPrimitive` picking and picking objects with materials that have transparent parts.
* Fixed imagery smearing artifacts on mobile devices and other devices without high-precision fragment shaders.

### b15 - 2013-04-01

* Breaking changes:
   * `Billboard.computeScreenSpacePosition` now takes `Context` and `FrameState` arguments instead of a `UniformState` argument.
   * Removed `clampToPixel` property from `BillboardCollection` and `LabelCollection`.  This option is no longer needed due to overall LabelCollection visualization improvements.
   * Removed `Widgets/Dojo/CesiumWidget` and replaced it with `Widgets/CesiumWidget`, which has no Dojo dependancies.
   * `destroyObject` no longer deletes properties from the object being destroyed.
   * `darker.css` files have been deleted and the `darker` theme is now the default style for widgets.  The original theme is now known as `lighter` and is in corresponding `lighter.css` files.
   * CSS class names have been standardized to avoid potential collisions. All widgets now follow the same pattern, `cesium-<widget>-<className>`.
   * Removed `view2D`, `view3D`, and `viewColumbus` properties from `CesiumViewerWidget`.  Use the `sceneTransitioner` property instead.
* Added `BoundingSphere.fromCornerPoints`.
* Added `fromArray` and `distance` functions to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
* Added `DynamicPath.resolution` property for setting the maximum step size, in seconds, to take when sampling a position for path visualization.
* Added `TileCoordinatesImageryProvider` that renders imagery with tile X, Y, Level coordinates on the surface of the globe.  This is mostly useful for debugging.
* Added `DynamicEllipse` and `DynamicObject.ellipse` property to render CZML ellipses on the globe.
* Added `sampleTerrain` function to sample the terrain height of a list of `Cartographic` positions.
* Added `DynamicObjectCollection.removeObject` and handling of the new CZML `delete` property.
* Imagery layers with an `alpha` of exactly 0.0 are no longer rendered.  Previously these invisible layers were rendered normally, which was a waste of resources.  Unlike the `show` property, imagery tiles in a layer with an `alpha` of 0.0 are still downloaded, so the layer will become visible more quickly when its `alpha` is increased.
* Added `onTransitionStart` and `onTransitionComplete` events to `SceneModeTransitioner`.
* Added `SceneModePicker`; a new widget for morphing between scene modes.
* Added `BaseLayerPicker`; a new widget for switching among pre-configured base layer imagery providers.

### b14 - 2013-03-01

* Breaking changes:
   * Major refactoring of both animation and widgets systems as we move to an MVVM-like architecture for user interfaces.
      * New `Animation` widget for controlling playback.
      * AnimationController.js has been deleted.
      * `ClockStep.SYSTEM_CLOCK_DEPENDENT` was renamed to `ClockStep.SYSTEM_CLOCK_MULTIPLIER`.
      * `ClockStep.SYSTEM_CLOCK` was added to have the clock always match the system time.
      * `ClockRange.LOOP` was renamed to `ClockRange.LOOP_STOP` and now only loops in the forward direction.
      * `Clock.reverseTick` was removed, simply negate `Clock.multiplier` and pass it to `Clock.tick`.
      * `Clock.shouldAnimate` was added to indicate if `Clock.tick` should actually advance time.
      * The Timeline widget was moved into the Widgets/Timeline subdirectory.
      * `Dojo/TimelineWidget` was removed.  You should use the non-toolkit specific Timeline widget directly.
   * Removed `CesiumViewerWidget.fullScreenElement`, instead use the `CesiumViewerWidget.fullscreen.viewModel.fullScreenElement` observable property.
   * `IntersectionTests.rayPlane` now takes the new `Plane` type instead of separate `planeNormal` and `planeD` arguments.
   * Renamed `ImageryProviderError` to `TileProviderError`.
* Added support for global terrain visualization via `CesiumTerrainProvider`, `ArcGisImageServerTerrainProvider`, and `VRTheWorldTerrainProvider`.  See the [Terrain Tutorial](http://cesiumjs.org/2013/02/15/Cesium-Terrain-Tutorial/) for more information.
* Added `FullscreenWidget` which is a simple, single-button widget that toggles fullscreen mode of the specified element.
* Added interactive extent drawing to the `Picking` Sandcastle example.
* Added `HeightmapTessellator` to create a mesh from a heightmap.
* Added `JulianDate.equals`.
* Added `Plane` for representing the equation of a plane.
* Added a line segment-plane intersection test to `IntersectionTests`.
* Improved the lighting used in 2D and Columbus View modes.  In general, the surface lighting in these modes should look just like it does in 3D.
* Fixed an issue where a `PolylineCollection` with a model matrix other than the identity would be incorrectly rendered in 2D and Columbus view.
* Fixed an issue in the `ScreenSpaceCameraController` where disabled mouse events can cause the camera to be moved after being re-enabled.

### b13 - 2013-02-01

* Breaking changes:
   * The combined `Cesium.js` file and other required files are now created in `Build/Cesium` and `Build/CesiumUnminified` folders.
   * The Web Worker files needed when using the combined `Cesium.js` file are now in a `Workers` subdirectory.
   * Removed `erosion` property from `Polygon`, `ComplexConicSensorVolume`, `RectangularPyramidSensorVolume`, and `ComplexConicSensorVolume`.  Use the new `Erosion` material.  See the Sandbox Animation example.
   * Removed `setRectangle` and `getRectangle` methods from `ViewportQuad`. Use the new `rectangle` property.
   * Removed `time` parameter from `Scene.initializeFrame`. Instead, pass the time to `Scene.render`.
* Added new `RimLighting` and `Erosion` materials.  See the [Fabric](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric) wiki page.
* Added `hue` and `saturation` properties to `ImageryLayer`.
* Added `czm_hue` and `czm_saturation` to adjust the hue and saturation of RGB colors.
* Added `JulianDate.getDaysDifference` method.
* Added `Transforms.computeIcrfToFixedMatrix` and `computeFixedToIcrfMatrix`.
* Added `EarthOrientationParameters`, `EarthOrientationParametersSample`, `Iau2006XysData`, and `Iau2006XysDataSample` classes to `Core`.
* CZML now supports the ability to specify positions in the International Celestial Reference Frame (ICRF), and inertial reference frame.
* Fixed globe rendering on the Nexus 4 running Google Chrome Beta.
* `ViewportQuad` now supports the material system. See the [Fabric](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric) wiki page.
* Fixed rendering artifacts in `EllipsoidPrimitive`.
* Fixed an issue where streaming CZML would fail when changing material types.
* Updated Dojo from 1.7.2 to 1.8.4.  Reminder: Cesium does not depend on Dojo but uses it for reference applications.

### b12a - 2013-01-18

* Breaking changes:
   * Renamed the `server` property to `url` when constructing a `BingMapsImageryProvider`.  Likewise, renamed `BingMapsImageryProvider.getServer` to `BingMapsImageryProvider.getUrl`.  Code that looked like

            var bing = new BingMapsImageryProvider({
                server : 'dev.virtualearth.net'
            });

        should now look like:

            var bing = new BingMapsImageryProvider({
                url : 'http://dev.virtualearth.net'
            });

   * Renamed `toCSSColor` to `toCssColorString`.
   * Moved `minimumZoomDistance` and `maximumZoomDistance` from the `CameraController` to the `ScreenSpaceCameraController`.
* Added `fromCssColorString` to `Color` to create a `Color` instance from any CSS value.
* Added `fromHsl` to `Color` to create a `Color` instance from H, S, L values.
* Added `Scene.backgroundColor`.
* Added `textureRotationAngle` parameter to `Polygon.setPositions` and `Polygon.configureFromPolygonHierarchy` to rotate textures on polygons.
* Added `Matrix3.fromRotationX`, `Matrix3.fromRotationY`, `Matrix3.fromRotationZ`, and `Matrix2.fromRotation`.
* Added `fromUniformScale` to `Matrix2`, `Matrix3`, and `Matrix4`.
* Added `fromScale` to `Matrix2`.
* Added `multiplyByUniformScale` to `Matrix4`.
* Added `flipY` property when calling `Context.createTexture2D` and `Context.createCubeMap`.
* Added `MeshFilters.encodePosition` and `EncodedCartesian3.encode`.
* Fixed jitter artifacts with polygons.
* Fixed camera tilt close to the `minimumZoomDistance`.
* Fixed a bug that could lead to blue tiles when zoomed in close to the North and South poles.
* Fixed a bug where removing labels would remove the wrong label and ultimately cause a crash.
* Worked around a bug in Firefox 18 preventing typed arrays from being transferred to or from Web Workers.
* Upgraded RequireJS to version 2.1.2, and Almond to 0.2.3.
* Updated the default Bing Maps API key.

### b12 - 2013-01-03

* Breaking changes:
   * Renamed `EventHandler` to `ScreenSpaceEventHandler`.
   * Renamed `MouseEventType` to `ScreenSpaceEventType`.
   * Renamed `MouseEventType.MOVE` to `ScreenSpaceEventType.MOUSE_MOVE`.
   * Renamed `CameraEventHandler` to `CameraEventAggregator`.
   * Renamed all `*MouseAction` to `*InputAction` (including get, set, remove, etc).
   * Removed `Camera2DController`, `CameraCentralBodyController`, `CameraColumbusViewController`, `CameraFlightController`, `CameraFreeLookController`, `CameraSpindleController`, and `CameraControllerCollection`. Common ways to modify the camera are through the `CameraController` object of the `Camera` and will work in all scene modes. The default camera handler is the `ScreenSpaceCameraController` object on the `Scene`.
   * Changed default Natural Earth imagery to a 2K version of [Natural Earth II with Shaded Relief, Water, and Drainages](http://www.naturalearthdata.com/downloads/10m-raster-data/10m-natural-earth-2/).  The previously used version did not include lakes and rivers.  This replaced `Source/Assets/Textures/NE2_50M_SR_W_2048.jpg` with `Source/Assets/Textures/NE2_LR_LC_SR_W_DR_2048.jpg`.
* Added pinch-zoom, pinch-twist, and pinch-tilt for touch-enabled browsers (particularly mobile browsers).
* Improved rendering support on Nexus 4 and Nexus 7 using Firefox.
* Improved camera flights.
* Added Sandbox example using NASA's new [Black Marble](http://www.nasa.gov/mission_pages/NPP/news/earth-at-night.html) night imagery.
* Added constrained z-axis by default to the Cesium widgets.
* Upgraded Jasmine from version 1.1.0 to 1.3.0.
* Added `JulianDate.toIso8601`, which creates an ISO8601 compliant representation of a JulianDate.
* The `Timeline` widget now properly displays leap seconds.

### b11 - 2012-12-03

* Breaking changes:
   * Widget render loop now started by default.  Startup code changed, see Sandcastle examples.
   * Changed `Timeline.makeLabel` to take a `JulianDate` instead of a JavaScript date parameter.
   * Default Earth imagery has been moved to a new package `Assets`.  Images used by `Sandcastle` examples have been moved to the Sandcastle folder, and images used by the Dojo widgets are now self-contained in the `Widgets` package.
   * `positionToEyeEC` in `czm_materialInput` is no longer normalized by default.
   * `FullScreen` and related functions have been renamed to `Fullscreen` to match the W3C standard name.
   * `Fullscreen.isFullscreenEnabled` was incorrectly implemented in certain browsers.  `isFullscreenEnabled` now correctly determines whether the browser will allow an element to go fullscreen.  A new `isFullscreen` function is available to determine if the browser is currently in fullscreen mode.
   * `Fullscreen.getFullScreenChangeEventName` and `Fullscreen.getFullScreenChangeEventName` now return the proper event name, suitable for use with the `addEventListener` API, instead prefixing them with "on".
   * Removed `Scene.setSunPosition` and `Scene.getSunPosition`.  The sun position used for lighting is automatically computed based on the scene's time.
   * Removed a number of rendering options from `CentralBody`, including the ground atmosphere, night texture, specular map, cloud map, cloud shadows, and bump map.  These features weren't really production ready and had a disproportionate cost in terms of shader complexity and compilation time.  They may return in a more polished form in a future release.
   * Removed `affectedByLighting` property from `Polygon`, `EllipsoidPrimitive`, `RectangularPyramidSensorVolume`, `CustomSensorVolume`, and `ComplexConicSensorVolume`.
   * Removed `DistanceIntervalMaterial`.  This was not documented.
   * `Matrix2.getElementIndex`, `Matrix3.getElementIndex`, and `Matrix4.getElementIndex` functions have had their parameters swapped and now take row first and column second.  This is consistent with other class constants, such as Matrix2.COLUMN1ROW2.
   * Replaced `CentralBody.showSkyAtmosphere` with `Scene.skyAtmosphere` and `SkyAtmosphere`.  This has no impact for those using the Cesium widget.
* Improved lighting in Columbus view and on polygons, ellipsoids, and sensors.
* Fixed atmosphere rendering artifacts and improved Columbus view transition.
* Fixed jitter artifacts with billboards and polylines.
* Added `TileMapServiceImageryProvider`.  See the Imagery Layers `Sandcastle` example.
* Added `Water` material.  See the Materials `Sandcastle` example.
* Added `SkyBox` to draw stars.  Added `CesiumWidget.showSkyBox` and `CesiumViewerWidget.showSkyBox`.
* Added new `Matrix4` functions: `Matrix4.multiplyByTranslation`, `multiplyByPoint`, and `Matrix4.fromScale`. Added `Matrix3.fromScale`.
* Added `EncodedCartesian3`, which is used to eliminate jitter when drawing primitives.
* Added new automatic GLSL uniforms: `czm_frameNumber`, `czm_temeToPseudoFixed`, `czm_entireFrustum`, `czm_inverseModel`, `czm_modelViewRelativeToEye`, `czm_modelViewProjectionRelativeToEye`, `czm_encodedCameraPositionMCHigh`, and `czm_encodedCameraPositionMCLow`.
* Added `czm_translateRelativeToEye` and `czm_luminance` GLSL functions.
* Added `shininess` to `czm_materialInput`.
* Added `QuadraticRealPolynomial`, `CubicRealPolynomial`, and `QuarticRealPolynomial` for finding the roots of quadratic, cubic, and quartic polynomials.
* Added `IntersectionTests.grazingAltitudeLocation` for finding a point on a ray nearest to an ellipsoid.
* Added `mostOrthogonalAxis` function to `Cartesian2`, `Cartesian3`, and `Cartesian4`.
* Changed CesiumViewerWidget default behavior so that zooming to an object now requires a single left-click, rather than a double-click.
* Updated third-party [Tween.js](https://github.com/sole/tween.js/).

### b10 - 2012-11-02

* Breaking changes:
   * Renamed `Texture2DPool` to `TexturePool`.
   * Renamed `BingMapsTileProvider` to `BingMapsImageryProvider`.
   * Renamed `SingleTileProvider` to `SingleTileImageryProvider`.
   * Renamed `ArcGISTileProvider` to `ArcGisMapServerImageryProvider`.
   * Renamed `EquidistantCylindrdicalProjection` to `GeographicProjection`.
   * Renamed `MercatorProjection` to `WebMercatorProjection`.
   * `CentralBody.dayTileProvider` has been removed.  Instead, add one or more imagery providers to the collection returned by `CentralBody.getImageryLayers()`.
   * The `description.generateTextureCoords` parameter passed to `ExtentTessellator.compute` is now called `description.generateTextureCoordinates`.
   * Renamed `bringForward`, `sendBackward`, `bringToFront`, and `sendToBack` methods on `CompositePrimitive` to `raise`, `lower`, `raiseToTop`, and `lowerToBottom`, respectively.
   * `Cache` and `CachePolicy` are no longer used and have been removed.
   * Fixed problem with Dojo widget startup, and removed "postSetup" callback in the process.  See Sandcastle examples and update your startup code.
* `CentralBody` now allows imagery from multiple sources to be layered and alpha blended on the globe.  See the new `Imagery Layers` and `Map Projections` Sandcastle examples.
* Added `WebMapServiceImageryProvider`.
* Improved middle mouse click behavior to always tilt in the same direction.
* Added `getElementIndex` to `Matrix2`, `Matrix3`, and `Matrix4`.

### b9 - 2012-10-01

* Breaking changes:
   * Removed the `render` and `renderForPick` functions of primitives. The primitive `update` function updates a list of commands for the renderer. For more details, see the [Data Driven Renderer](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Data-Driven-Renderer-Details).
   * Removed `Context.getViewport` and `Context.setViewport`. The viewport defaults to the size of the canvas if a primitive does not override the viewport property in the render state.
   * `shallowEquals` has been removed.
   * Passing `undefined` to any of the set functions on `Billboard` now throws an exception.
   * Passing `undefined` to any of the set functions on `Polyline` now throws an exception.
   * `PolygonPipeline.scaleToGeodeticHeight` now takes ellipsoid as the last parameter, instead of the first.  It also now defaults to `Ellipsoid.WGS84` if no parameter is provided.
* The new Sandcastle live editor and demo gallery replace the Sandbox and Skeleton examples.
* Improved picking performance and accuracy.
* Added EllipsoidPrimitive for visualizing ellipsoids and spheres.  Currently, this is only supported in 3D, not 2D or Columbus view.
* Added `DynamicEllipsoid` and `DynamicEllipsoidVisualizer` which use the new `EllipsoidPrimitive` to implement ellipsoids in CZML.
* `Extent` functions now take optional result parameters.  Also added `getCenter`, `intersectWith`, and `contains` functions.
* Add new utility class, `DynamicObjectView` for tracking a DynamicObject with the camera across scene modes; also hooked up CesiumViewerWidget to use it.
* Added `enableTranslate`, `enableZoom`, and `enableRotate` properties to `Camera2DController` to selectively toggle camera behavior.  All values default to `true`.
* Added `Camera2DController.setPositionCartographic` to simplify moving the camera programmatically when in 2D mode.
* Improved near/far plane distances and eliminated z-fighting.
* Added `Matrix4.multiplyByTranslation`, `Matrix4.fromScale`, and `Matrix3.fromScale`.

### b8 - 2012-09-05

* Breaking changes:
    * Materials are now created through a centralized Material class using a JSON schema called [Fabric](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric). For example, change:

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
    * `Label.computeScreenSpacePosition` now requires the current scene state as a parameter.
    * Passing `undefined` to any of the set functions on `Label` now throws an exception.
    * Renamed `agi_` prefix on GLSL identifiers to `czm_`.
    * Replaced `ViewportQuad` properties `vertexShader` and `fragmentShader` with optional constructor arguments.
    * Changed the GLSL automatic uniform `czm_viewport` from an `ivec4` to a `vec4` to reduce casting.
    * `Billboard` now defaults to an image index of `-1` indicating no texture, previously billboards defaulted to `0` indicating the first texture in the atlas. For example, change:

            billboards.add({
                position : { x : 1.0, y : 2.0, z : 3.0 },
            });

         to:

            billboards.add({
                position : { x : 1.0, y : 2.0, z : 3.0 },
                imageIndex : 0
            });
    * Renamed `SceneState` to `FrameState`.
    * `SunPosition` was changed from a static object to a function `computeSunPosition`; which now returns a `Cartesian3` with the computed position.  It was also optimized for performance and memory pressure.  For example, change:

            var result = SunPosition.compute(date);
            var position = result.position;

          to:

            var position = computeSunPosition(date);

* All `Quaternion` operations now have static versions that work with any objects exposing `x`, `y`, `z` and `w` properties.
* Added support for nested polygons with holes. See `Polygon.configureFromPolygonHierarchy`.
* Added support to the renderer for view frustum and central body occlusion culling. All built-in primitives, such as `BillboardCollection`, `Polygon`, `PolylineCollection`, etc., can be culled. See the advanced examples in the Sandbox for details.
* Added `writeTextToCanvas` function which handles sizing the resulting canvas to fit the desired text.
* Added support for CZML path visualization via the `DynamicPath` and `DynamicPathVisualizer` objects.  See the [CZML wiki](https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-Guide) for more details.
* Added support for [WEBGL_depth_texture](http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/).  See `Framebuffer.setDepthTexture`.
* Added `CesiumMath.isPowerOfTwo`.
* Added `affectedByLighting` to `ComplexConicSensorVolume`, `CustomSensorVolume`, and `RectangularPyramidSensorVolume` to turn lighting on/off for these objects.
* CZML `Polygon`, `Cone`, and `Pyramid` objects are no longer affected by lighting.
* Added `czm_viewRotation` and `czm_viewInverseRotation` automatic GLSL uniforms.
* Added a `clampToPixel` property to `BillboardCollection` and `LabelCollection`.  When true, it aligns all billboards and text to a pixel in screen space, providing a crisper image at the cost of jumpier motion.
* `Ellipsoid` functions now take optional result parameters.

### b7 - 2012-08-01

* Breaking changes:
    * Removed keyboard input handling from `EventHandler`.
    * `TextureAtlas` takes an object literal in its constructor instead of separate parameters.  Code that previously looked like:

            context.createTextureAtlas(images, pixelFormat, borderWidthInPixels);

        should now look like:

            context.createTextureAtlas({images : images, pixelFormat : pixelFormat, borderWidthInPixels : borderWidthInPixels});

    * `Camera.pickEllipsoid` returns the picked position in world coordinates and the ellipsoid parameter is optional. Prefer the new `Scene.pickEllipsoid` method. For example, change

            var position = camera.pickEllipsoid(ellipsoid, windowPosition);

        to:

            var position = scene.pickEllipsoid(windowPosition, ellipsoid);

    * `Camera.getPickRay` now returns the new `Ray` type instead of an object with position and direction properties.
    * `Camera.viewExtent` now takes an `Extent` argument instead of west, south, east and north arguments. Prefer `Scene.viewExtent` over `Camera.viewExtent`. `Scene.viewExtent` will work in any `SceneMode`. For example, change

            camera.viewExtent(ellipsoid, west, south, east, north);

        to:

            scene.viewExtent(extent, ellipsoid);

    * `CameraSpindleController.mouseConstrainedZAxis` has been removed. Instead, use `CameraSpindleController.constrainedAxis`. Code that previously looked like:

            spindleController.mouseConstrainedZAxis = true;

        should now look like:

            spindleController.constrainedAxis = Cartesian3.UNIT_Z;

    * The `Camera2DController` constructor and `CameraControllerCollection.add2D` now require a projection instead of an ellipsoid.
    * `Chain` has been removed.  `when` is now included as a more complete CommonJS Promises/A implementation.
    * `Jobs.downloadImage` was replaced with `loadImage` to provide a promise that will asynchronously load an image.
    * `jsonp` now returns a promise for the requested data, removing the need for a callback parameter.
    * JulianDate.getTimeStandard() has been removed, dates are now always stored internally as TAI.
    * LeapSeconds.setLeapSeconds now takes an array of LeapSecond instances instead of JSON.
    * TimeStandard.convertUtcToTai and TimeStandard.convertTaiToUtc have been removed as they are no longer needed.
    * `Cartesian3.prototype.getXY()` was replaced with `Cartesian2.fromCartesian3`.  Code that previously looked like `cartesian3.getXY();` should now look like `Cartesian2.fromCartesian3(cartesian3);`.
    * `Cartesian4.prototype.getXY()` was replaced with `Cartesian2.fromCartesian4`.  Code that previously looked like `cartesian4.getXY();` should now look like `Cartesian2.fromCartesian4(cartesian4);`.
    * `Cartesian4.prototype.getXYZ()` was replaced with `Cartesian3.fromCartesian4`.  Code that previously looked like `cartesian4.getXYZ();` should now look like `Cartesian3.fromCartesian4(cartesian4);`.
    * `Math.angleBetween` was removed because it was a duplicate of `Cartesian3.angleBetween`.  Simply replace calls of the former to the later.
    * `Cartographic3` was renamed to `Cartographic`.
    * `Cartographic2` was removed; use `Cartographic` instead.
    * `Ellipsoid.toCartesian` was renamed to `Ellipsoid.cartographicToCartesian`.
    * `Ellipsoid.toCartesians` was renamed to `Ellipsoid.cartographicArrayToCartesianArray`.
    * `Ellipsoid.toCartographic2` was renamed to `Ellipsoid.cartesianToCartographic`.
    * `Ellipsoid.toCartographic2s` was renamed to `Ellipsoid.cartesianArrayToCartographicArray`.
    * `Ellipsoid.toCartographic3` was renamed to `Ellipsoid.cartesianToCartographic`.
    * `Ellipsoid.toCartographic3s` was renamed to `Ellipsoid.cartesianArrayToCartographicArray`.
    * `Ellipsoid.cartographicDegreesToCartesian` was removed.  Code that previously looked like `ellipsoid.cartographicDegreesToCartesian(new Cartographic(45, 50, 10))` should now look like `ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(45, 50, 10))`.
    * `Math.cartographic3ToRadians`, `Math.cartographic2ToRadians`, `Math.cartographic2ToDegrees`, and `Math.cartographic3ToDegrees` were removed.  These functions are no longer needed because Cartographic instances are always represented in radians.
    * All functions starting with `multiplyWith` now start with `multiplyBy` to be consistent with functions starting with `divideBy`.
    * The `multiplyWithMatrix` function on each `Matrix` type was renamed to `multiply`.
    * All three Matrix classes have been largely re-written for consistency and performance.  The `values` property has been eliminated and Matrices are no longer immutable.  Code that previously looked like `matrix = matrix.setColumn0Row0(12);` now looks like `matrix[Matrix2.COLUMN0ROW0] = 12;`.  Code that previously looked like `matrix.setColumn3(cartesian3);` now looked like `matrix.setColumn(3, cartesian3, matrix)`.
    * 'Polyline' is no longer externally creatable. To create a 'Polyline' use the 'PolylineCollection.add' method.

            Polyline polyline = new Polyline();

        to

            PolylineCollection polylineCollection = new PolylineCollection();
            Polyline polyline = polylineCollection.add();

* All `Cartesian2` operations now have static versions that work with any objects exposing `x` and `y` properties.
* All `Cartesian3` operations now have static versions that work with any objects exposing `x`, `y`, and `z` properties.
* All `Cartesian4` operations now have static versions that work with any objects exposing `x`, `y`, `z` and `w` properties.
* All `Cartographic` operations now have static versions that work with any objects exposing `longitude`, `latitude`, and `height` properties.
* All `Matrix` classes are now indexable like arrays.
* All `Matrix` operations now have static versions of all prototype functions and anywhere we take a Matrix instance as input can now also take an Array or TypedArray.
* All `Matrix`, `Cartesian`, and `Cartographic` operations now take an optional result parameter for object re-use to reduce memory pressure.
* Added `Cartographic.fromDegrees` to make creating Cartographic instances from values in degrees easier.
* Added `addImage` to `TextureAtlas` so images can be added to a texture atlas after it is constructed.
* Added `Scene.pickEllipsoid`, which picks either the ellipsoid or the map depending on the current `SceneMode`.
* Added `Event`, a new utility class which makes it easy for objects to expose event properties.
* Added `TextureAtlasBuilder`, a new utility class which makes it easy to build a TextureAtlas asynchronously.
* Added `Clock`, a simple clock for keeping track of simulated time.
* Added `LagrangePolynomialApproximation`, `HermitePolynomialApproximation`, and `LinearApproximation` interpolation algorithms.
* Added `CoordinateConversions`, a new static class where most coordinate conversion methods will be stored.
* Added `Spherical` coordinate type
* Added a new DynamicScene layer for time-dynamic, data-driven visualization.  This include CZML processing.  For more details see https://github.com/AnalyticalGraphicsInc/cesium/wiki/Architecture and https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-in-Cesium.
* Added a new application, Cesium Viewer, for viewing CZML files and otherwise exploring the globe.
* Added a new Widgets directory, to contain common re-usable Cesium related controls.
* Added a new Timeline widget to the Widgets directory.
* Added a new Widgets/Dojo directory, to contain dojo-specific widgets.
* Added new Timeline and Cesium dojo widgets.
* Added `CameraCentralBodyController` as the new default controller to handle mouse input.
    * The left mouse button rotates around the central body.
    * The right mouse button and mouse wheel zoom in and out.
    * The middle mouse button rotates around the point clicked on the central body.
* Added `computeTemeToPseudoFixedMatrix` function to `Transforms`.
* Added 'PolylineCollection' to manage numerous polylines. 'PolylineCollection' dramatically improves rendering speed when using polylines.

### b6a - 2012-06-20

* Breaking changes:
    * Changed `Tipsify.tipsify` and `Tipsify.calculateACMR` to accept an object literal instead of three separate arguments. Supplying a maximum index and cache size is now optional.
    * `CentralBody` no longer requires a camera as the first parameter.
* Added `CentralBody.northPoleColor` and `CentralBody.southPoleColor` to fill in the poles if they are not covered by a texture.
* Added `Polygon.configureExtent` to create a polygon defined by west, south, east, and north values.
* Added functions to `Camera` to provide position and directions in world coordinates.
* Added `showThroughEllipsoid` to `CustomSensorVolume` and `RectangularPyramidSensorVolume` to allow sensors to draw through Earth.
* Added `affectedByLighting` to `CentralBody` and `Polygon` to turn lighting on/off for these objects.

### b5 - 2012-05-15

* Breaking changes:
    * Renamed Geoscope to Cesium.  To update your code, change all `Geoscope.*` references to `Cesium.*`, and reference Cesium.js instead of Geoscope.js.
    * `CompositePrimitive.addGround` was removed; use `CompositePrimitive.add` instead.  For example, change

            primitives.addGround(polygon);

        to:

            primitives.add(polygon);

    * Moved `eastNorthUpToFixedFrame` and `northEastDownToFixedFrame` functions from `Ellipsoid` to a new `Transforms` object.  For example, change

            var m = ellipsoid.eastNorthUpToFixedFrame(p);

        to:

            var m = Cesium.Transforms.eastNorthUpToFixedFrame(p, ellipsoid);

    * Label properties `fillStyle` and `strokeStyle` were renamed to `fillColor` and `outlineColor`; they are also now color objects instead of strings.  The label `Color` property has been removed.

        For example, change

            label.setFillStyle("red");
            label.setStrokeStyle("#FFFFFFFF");

        to:

            label.setFillColor({ red : 1.0, blue : 0.0, green : 0.0, alpha : 1.0 });
            label.setOutlineColor({ red : 1.0, blue : 1.0, green : 1.0, alpha : 1.0 });

    * Renamed `Tipsify.Tipsify` to `Tipsify.tipsify`.
    * Renamed `Tipsify.CalculateACMR` to `Tipsify.calculateACMR`.
    * Renamed `LeapSecond.CompareLeapSecondDate` to `LeapSecond.compareLeapSecondDate`.
    * `Geoscope.JSONP.get` is now `Cesium.jsonp`.  `Cesium.jsonp` now takes a url, a callback function, and an options object.  The previous 2nd and 4th parameters are now specified using the options object.
    * `TWEEN` is no longer globally defined, and is instead available as `Cesium.Tween`.
    * Chain.js functions such as `run` are now moved to `Cesium.Chain.run`, etc.
    * `Geoscope.CollectionAlgorithms.binarySearch` is now `Cesium.binarySearch`.
    * `Geoscope.ContainmentTests.pointInsideTriangle2D` is now `Cesium.pointInsideTriangle2D`.
    * Static constructor methods prefixed with "createFrom", now start with "from":

            Matrix2.createfromColumnMajorArray

        becomes

            Matrix2.fromColumnMajorArray

    * The `JulianDate` constructor no longer takes a `Date` object, use the new from methods instead:

            new JulianDate(new Date());

        becomes

            JulianDate.fromDate(new Date("January 1, 2011 12:00:00 EST"));
            JulianDate.fromIso8601("2012-04-24T18:08Z");
            JulianDate.fromTotalDays(23452.23);

    * `JulianDate.getDate` is now `JulianDate.toDate()` and returns a new instance each time.
    * `CentralBody.logoOffsetX` and `logoOffsetY` have been replaced with `CentralBody.logoOffset`, a `Cartesian2`.
    * TileProviders now take a proxy object instead of a string, to allow more control over how proxy URLs are built.  Construct a DefaultProxy, passing the previous proxy URL, to get the previous behavior.
    * `Ellipsoid.getScaledWgs84()` has been removed since it is not needed.
    * `getXXX()` methods which returned a new instance of what should really be a constant are now exposed as frozen properties instead.  This should improve performance and memory pressure.

        * `Cartsian2/3/4.getUnitX()` -> `Cartsian2/3/4.UNIT_X`
        * `Cartsian2/3/4.getUnitY()` -> `Cartsian2/3/4.UNIT_Y`
        * `Cartsian2/3/4.getUnitZ()` -> `Cartsian3/4.UNIT_Z`
        * `Cartsian2/3/4.getUnitW()` -> `Cartsian4.UNIT_W`
        * `Matrix/2/3/4.getIdentity()` -> `Matrix/2/3/4.IDENTITY`
        * `Quaternion.getIdentity()` -> `Quaternion.IDENTITY`
        * `Ellipsoid.getWgs84()` -> `Ellipsoid.WGS84`
        * `Ellipsoid.getUnitSphere()` -> `Ellipsoid.UNIT_SPHERE`
        * `Cartesian2/3/4/Cartographic.getZero()` -> `Cartesian2/3/4/Cartographic.ZERO`

* Added `PerformanceDisplay` which can be added to a scene to display frames per second (FPS).
* Labels now correctly allow specifying fonts by non-pixel CSS units such as points, ems, etc.
* Added `Shapes.computeEllipseBoundary` and updated `Shapes.computeCircleBoundary` to compute boundaries using arc-distance.
* Added `fileExtension` and `credit` properties to `OpenStreetMapTileProvider` construction.
* Night lights no longer disappear when `CentralBody.showGroundAtmosphere` is `true`.

### b4 - 2012-03-01

* Breaking changes:
    * Replaced `Geoscope.SkyFromSpace` object with `CentralBody.showSkyAtmosphere` property.
    * For mouse click and double click events, replaced `event.x` and `event.y` with `event.position`.
    * For mouse move events, replaced `movement.startX` and `startY` with `movement.startPosition`.  Replaced `movement.endX` and `movement.endY` with `movement.endPosition`.
    * `Scene.Pick` now takes a `Cartesian2` with the origin at the upper-left corner of the canvas.  For example, code that looked like:

            scene.pick(movement.endX, scene.getCanvas().clientHeight - movement.endY);

        becomes:

            scene.pick(movement.endPosition);

* Added `SceneTransitioner` to switch between 2D and 3D views.  See the new Skeleton 2D example.
* Added `CentralBody.showGroundAtmosphere` to show an atmosphere on the ground.
* Added `Camera.pickEllipsoid` to get the point on the globe under the mouse cursor.
* Added `Polygon.height` to draw polygons at a constant altitude above the ellipsoid.

### b3 - 2012-02-06

* Breaking changes:
    * Replaced `Geoscope.Constants` and `Geoscope.Trig` with `Geoscope.Math`.
    * `Polygon`
        * Replaced `setColor` and `getColor` with a `material.color` property.
        * Replaced `setEllipsoid` and `getEllipsoid` with an `ellipsoid` property.
        * Replaced `setGranularity` and `getGranularity` with a `granularity` property.
    * `Polyline`
        * Replaced `setColor`/`getColor` and `setOutlineColor`/`getOutlineColor` with `color` and `outline` properties.
        * Replaced `setWidth`/`getWidth` and `setOutlineWidth`/`getOutlineWidth` with `width` and `outlineWidth` properties.
    * Removed `Geoscope.BillboardCollection.bufferUsage`.  It is now automatically determined.
    * Removed `Geoscope.Label` set/get functions for `shadowOffset`, `shadowBlur`, `shadowColor`.  These are no longer supported.
    * Renamed `Scene.getTransitions` to `Scene.getAnimations`.
    * Renamed `SensorCollection` to `SensorVolumeCollection`.
    * Replaced `ComplexConicSensorVolume.material` with separate materials for each surface: `outerMaterial`, `innerMaterial`, and `capMaterial`.
    * Material renames
        * `TranslucentSensorVolumeMaterial` to `ColorMaterial`.
        * `DistanceIntervalSensorVolumeMaterial` to `DistanceIntervalMaterial`.
        * `TieDyeSensorVolumeMaterial` to `TieDyeMaterial`.
        * `CheckerboardSensorVolumeMaterial` to `CheckerboardMaterial`.
        * `PolkaDotSensorVolumeMaterial` to `DotMaterial`.
        * `FacetSensorVolumeMaterial` to `FacetMaterial`.
        * `BlobSensorVolumeMaterial` to `BlobMaterial`.
    * Added new materials:
        * `VerticalStripeMaterial`
        * `HorizontalStripeMaterial`
        * `DistanceIntervalMaterial`
    * Added polygon material support via the new `Polygon.material` property.
    * Added clock angle support to `ConicSensorVolume` via the new `maximumClockAngle` and `minimumClockAngle` properties.
    * Added a rectangular sensor, `RectangularPyramidSensorVolume`.
    * Changed custom sensor to connect direction points using the sensor's radius; previously, points were connected with a line.
    * Improved performance and memory usage of `BillboardCollection` and `LabelCollection`.
    * Added more mouse events.
    * Added Sandbox examples for new features.

### b2 - 2011-12-01

* Added complex conic and custom sensor volumes, and various materials to change their appearance.  See the new Sensor folder in the Sandbox.
* Added modelMatrix property to primitives to render them in a local reference frame.  See the polyline example in the Sandbox.
* Added eastNorthUpToFixedFrame() and northEastDownToFixedFrame() to Ellipsoid to create local reference frames.
* Added CameraFlightController to zoom smoothly from one point to another.  See the new camera examples in the Sandbox.
* Added row and column assessors to Matrix2, Matrix3, and Matrix4.
* Added Scene, which reduces the amount of code required to use Geoscope.  See the Skeleton.  We recommend using this instead of  explicitly calling update() and render() for individual or composite  primitives.  Existing code will need minor changes:
    * Calls to Context.pick() should be replaced with Scene.pick().
    * Primitive constructors no longer require a context argument.
    * Primitive update() and render() functions now require a context argument.  However, when using the new Scene object, these functions do not need to be called directly.
    * TextureAtlas should no longer be created directly; instead, call Scene.getContext().createTextureAtlas().
    * Other breaking changes:
        * Camera get/set functions, e.g., getPosition/setPosition were  replaced with properties, e.g., position.
        * Replaced CompositePrimitive, Polygon, and Polyline getShow/setShow functions with a show property.
        * Replaced Polyline, Polygon, BillboardCollection, and LabelCollection getBufferUsage/setBufferUsage functions with a bufferUsage property.
        * Changed colors used by billboards, labels, polylines, and polygons.  Previously, components were named r, g, b, and a.  They are now red, green, blue, and alpha.  Previously, each component's range was [0, 255].  The range is now [0, 1] floating point.  For example,

                color : { r : 0, g : 255, b : 0, a : 255 }

            becomes:

                color : { red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 }

### b1 - 2011-09-19

* Added `Shapes.computeCircleBoundary` to compute circles.  See the Sandbox.
* Changed the `EventHandler` constructor function to take the Geoscope canvas, which ensures the mouse position is correct regardless of the canvas' position on the page.  Code that previously looked like:

        var handler = new Geoscope.EventHandler();

    should now look like:

        var handler = new Geoscope.EventHandler(canvas);

* Context.Pick no longer requires clamping the x and y arguments.  Code that previously looked like:

        var pickedObject = context.pick(primitives, us, Math.max(x, 0.0),
            Math.max(context.getCanvas().clientHeight - y, 0.0));

    can now look like:

        var pickedObject = context.pick(primitives, us, x, context.getCanvas().clientHeight - y);

* Changed Polyline.setWidth and Polyline.setOutlineWidth to clamp the width to the WebGL implementation limit instead of throwing an exception.  Code that previously looked like:

        var maxWidth = context.getMaximumAliasedLineWidth();
        polyline.setWidth(Math.min(5, maxWidth));
        polyline.setOutlineWidth(Math.min(10, maxWidth));

    can now look like:

        polyline.setWidth(5);
        polyline.setOutlineWidth(10);

* Improved the Sandbox:
    * Code in the editor is now evaluated as you type for quick prototyping.
    * Highlighting a Geoscope type in the editor and clicking the doc button in the toolbar now brings up the reference help for that type.
* BREAKING CHANGE:  The `Context` constructor-function now takes an element instead of an ID.  Code that previously looked like:

        var context = new Geoscope.Context("glCanvas");
        var canvas = context.getCanvas();

    should now look like:

        var canvas = document.getElementById("glCanvas");
        var context = new Geoscope.Context(canvas);

### b0 - 2011-08-31

* Added new Sandbox and Skeleton examples.  The sandbox contains example code for common tasks.  The skeleton is a bare-bones application for building upon.  Most sandbox code examples can be copy and pasted directly into the skeleton.
* Added `Geoscope.Polygon` for drawing polygons on the globe.
* Added `Context.pick` to pick objects in one line of code.
* Added `bringForward`, `bringToFront`, `sendBackward`, and `sendToBack` functions to `CompositePrimitive` to control the render-order for ground primitives.
* Added `getShow`/`setShow` functions to `Polyline` and `CompositePrimitive`.
* Added new camera control and event types including `CameraFreeLookEventHandler`, `CameraSpindleEventHandler`, and `EventHandler`.
* Replaced `Ellipsoid.toCartesian3` with `Ellipsoid.toCartesian`.
* update and `updateForPick` functions no longer require a `UniformState` argument.

Alpha Releases
--------------

### a6 - 2011-08-05

* Added support for lines using `Geoscope.Polyline`.  See the Sandbox example.
* Made `CompositePrimitive`, `LabelCollection`, and `BillboardCollection` have consistent function names, including a new `contains()` function.
* Improved reference documentation layout.

### a5 - 2011-07-22

* Flushed out `CompositePrimitive`, `TimeStandard`, and `LeapSecond` types.
* Improved support for browsers using ANGLE (Windows Only).

### a4 - 2011-07-15

* Added `Geoscope.TimeStandard` for handling TAI and UTC time standards.
* Added `Geoscope.Quaternion`, which is a foundation for future camera control.
* Added initial version of `Geoscope.PrimitiveCollection` to simplify rendering.
* Prevented billboards/labels near the surface from getting cut off by the globe.
* See the Sandbox for example code.
* Added more reference documentation for labels.

### a3 - 2011-07-08

* Added `Geoscope.LabelCollection` for drawing text.
* Added `Geoscope.JulianDate` and `Geoscope.TimeConstants` for proper time handling.
* See the Sandbox example for how to use the new labels and Julian date.

### a2 - 2011-07-01

* Added `Geoscope.ViewportQuad` and `Geoscope.Rectangle` (foundations for 2D map).
* Improved the visual quality of cloud shadows.

### a1 - 2011-06-24

* Added `SunPosition` type to compute the sun position for a julian date.
* Simplified picking.  See the mouse move event in the Sandbox example.
* `Cartographic2` and `Cartographic3` are now mutable types.
* Added reference documentation for billboards.

### a0 - 2011-06-17

* Initial Release.
