Change Log
==========

Beta Releases
-------------
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
* Added wide polylines that work with and without ANGLE.
* Polylines now use materials to describe their surface appearance. See the [Fabric](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric) wiki page for more details on how to create materials.
* Added new `PolylineOutline`, `PolylineArrow`, and `Fade` materials.
* Added `czm_pixelSizeInMeters` automatic GLSL uniform.
* Added `AnimationViewModel.snapToTicks`, which when set to true, causes the shuttle ring on the Animation widget to snap to the defined tick values, rather than interpolate between them.
* Added new `Grid` material.
* Made `EllipsoidPrimitive` double-sided.

### b15 - 2013-04-01

* Breaking changes:
   * `Billboard.computeScreenSpacePosition` now takes `Context` and `FrameState` arguments instead of a `UniformState` argument.
   * Removed `clampToPixel` property from `BillboardCollection` and `LabelCollection`.  This options is no longer be needed due to overall LabelCollection visualization improvements.
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
      * `ClockStep.SYSTEM_CLOCK_DEPENDENT` was renamed to `ClockStep.SYSTEM_CLOCK_MULTIPLIER`
      * `ClockStep.SYSTEM_CLOCK` was added to have the clock always match the system time.
      * `ClockRange.LOOP` was renamed to `ClockRange.LOOP_STOP` and now only loops in the forward direction.
      * `Clock.reverseTick` was removed, simply negate `Clock.multiplier` and pass it to `Clock.tick`.
      * `Clock.shouldAnimate` was added to indicate if `Clock.tick` should actually advance time.
      * The Timeline widget was moved into the Widgets/Timeline subdirectory. 
      * `Dojo/TimelineWidget` was removed.  You should use the non-toolkit specific Timeline widget directly.
   * Removed `CesiumViewerWidget.fullScreenElement`, instead use the `CesiumViewerWidget.fullscreen.viewModel.fullScreenElement` observable property.
   * `IntersectionTests.rayPlane` now takes the new `Plane` type instead of separate `planeNormal` and `planeD` arguments.
   * Renamed `ImageryProviderError` to `TileProviderError`.
* Added support for global terrain visualization via `CesiumTerrainProvider`, `ArcGisImageServerTerrainProvider`, and `VRTheWorldTerrainProvider`.  See the [Terrain Tutorial](http://cesium.agi.com/2013/02/15/Cesium-Terrain-Tutorial/) for more information.
* Added `FullscreenWidget` which is a simple, single-button widget that toggles fullscreen mode of the specified element.
* Added interactive extent drawing to the `Picking` Sandcastle example.
* Added `HeightmapTessellator` to create a mesh from a heightmap.
* Added `JulianDate.equals`
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
