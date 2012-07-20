Change Log
==========

Beta Releases
-------------

### b7 - xx/xx/2012

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
   * `CameraSpindleController.mouseConstrainedZAxis` has been removed. Instead, use `CameraSpindleController.constrainedAxis`. Code that previously looked like:
            
            spindleController.mouseConstrainedZAxis = true;
            
     should now look like:
     
            spindleController.constrainedAxis = Cartesian3.UNIT_Z;
   
   * The free look feature has been removed from `CameraColumbusViewController` in favor of rotating about the point clicked on the map with the middle mouse button.
   * The `Camera2DController` constructor and `CameraControllerCollection.add2D` now require a projection instead of an ellipsoid.
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
   * The `multiplyWithMatrix` function on each `Matrix` type was renamed to `multiply`. 
   * All functions starting with `multiplyWith` now start with `multiplyBy` to be consistent with functions starting with `divideBy`. 
* All `Cartesian2` operations now have static versions that work with any objects exposing `x` and `y` properties.
* All `Cartesian2` operations now have static versions that work with any objects exposing `x`, `y`, and `z` properties.
* All `Cartesian3` operations now have static versions that work with any objects exposing `x`, `y`, `z` and `w` properties.
* All `Cartographic` operations now have static versions that work with any objects exposing `longitude`, `latitude`, and `height` properties.
* Added `Cartographic.fromDegrees` make creating Cartographic instances from values in degrees easier. 
* Added `addImage` to `TextureAtlas` so images can be added to a texture atlas after it is constructed.
* Added `Scene.pickEllipsoid`, which picks either the ellipsoid or the map depending on the current `SceneMode`.
* Added `Event`, a new utility class which makes it easy for objects to expose event properties.
* Added `TextureAtlasBuilder`,a new utility class which makes it easy to build a TextureAtlas asynchronously.
* Added `Clock`, a simple clock for keeping track of simulated time.
* Added `LagrangePolynomialApproximation`, `HermitePolynomialApproximation`, and `LinearApproximation` interpolation algorithms.
* Added `CoordinateConversions`, a new static class where most coordinate conversion methods will be stored.
* Added `Spherical` coordinate type
* Added a new DynamicScene layer for time-dynamic, data-driven visualization.  This include CZML processing.  For more details see https://github.com/AnalyticalGraphicsInc/cesium/wiki/Architecture and https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-in-Cesium.
* Added a new application, Cesium Viewer, for viewing CZML files and otherwise exploring the globe.
* Added a new Widgets directory, to contain common re-usable Cesium related controls.
* Added a new Timeline control to the widgets directory.
* Added a new DojoWidgets directory, to contain dojo-specific widgets.
* Added new Timeline and Cesium dojo widgets.
* Added `CameraCentralBodyController` as the new default controller to handle mouse input.
    * The left mouse button rotates around the central body.
    * The right mouse button and mouse wheel zoom in and out.
    * The middle mouse button rotates around the point clicked on the central body.

### b6a - 06/20/2012

* Breaking changes:
    * Changed `Tipsify.tipsify` and `Tipsify.calculateACMR` to accept an object literal instead of three separate arguments. Supplying a maximum index and cache size is now optional.
    * `CentralBody` no longer requires a camera as the first parameter.
* Added `CentralBody.northPoleColor` and `CentralBody.southPoleColor` to fill in the poles if they are not covered by a texture.
* Added `Polygon.configureExtent` to create a polygon defined by west, south, east, and north values.
* Added functions to `Camera` to provide position and directions in world coordinates.
* Added `showThroughEllipsoid` to `CustomSensorVolume` and `RectangularPyramidSensorVolume` to allow sensors to draw through Earth.
* Added `affectedByLighting` to `CentralBody` and `Polygon` to turn lighting on/off for these objects.

### b5 - 05/15/2012

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

### b4 - 03/01/2012

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

### b3 - 02/06/2012

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

### b2 - 12/01/2011

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

    becomes

        color : { red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 }

### b1 - 09/19/2011

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

### b0 - 08/31/2011

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

### a6 - 08/05/2011

* Added support for lines using `Geoscope.Polyline`.  See the Sandbox example.
* Made `CompositePrimitive`, `LabelCollection`, and `BillboardCollection` have consistent function names, including a new `contains()` function.
* Improved reference documentation layout.

### a5 - 07/22/2011

* Flushed out `CompositePrimitive`, `TimeStandard`, and `LeapSecond` types.
* Improved support for browsers using ANGLE (Windows Only).

### a4 - 07/15/2011

* Added `Geoscope.TimeStandard` for handling TAI and UTC time standards.
* Added `Geoscope.Quaternion`, which is a foundation for future camera control.
* Added initial version of `Geoscope.PrimitiveCollection` to simplify rendering.
* Prevented billboards/labels near the surface from getting cut off by the globe.
* See the Sandbox for example code.
* Added more reference documentation for labels.

### a3 - 07/08/2011

* Added `Geoscope.LabelCollection` for drawing text.
* Added `Geoscope.JulianDate` and `Geoscope.TimeConstants` for proper time handling.
* See the Sandbox example for how to use the new labels and Julian date.

### a2 - 07/01/2011

* Added `Geoscope.ViewportQuad` and `Geoscope.Rectangle` (foundations for 2D map).
* Improved the visual quality of cloud shadows.

### a1 - 06/24/2011

* Added `SunPosition` type to compute the sun position for a julian date.
* Simplified picking.  See the mouse move event in the Sandbox example.
* `Cartographic2` and `Cartographic3` are now mutable types.
* Added reference documentation for billboards.

### a0 - 06/17/2011

* Initial Release.
