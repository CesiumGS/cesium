import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../../Source/Cesium.js";
import { Globe } from "../../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { OrthographicOffCenterFrustum } from "../../Source/Cesium.js";
import { CameraFlightPath } from "../../Source/Cesium.js";
import { SceneMode } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

describe(
  "Scene/CameraFlightPath",
  function () {
    var scene;

    beforeEach(function () {
      scene = createScene();
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    function createOrthographicFrustum() {
      var current = scene.camera.frustum;
      var f = new OrthographicOffCenterFrustum();
      f.near = current.near;
      f.far = current.far;

      var tanTheta = Math.tan(0.5 * current.fovy);
      f.top = f.near * tanTheta;
      f.bottom = -f.top;
      f.right = current.aspectRatio * f.top;
      f.left = -f.right;

      return f;
    }

    it("create animation throws without a scene", function () {
      expect(function () {
        CameraFlightPath.createTween(undefined, {
          destination: new Cartesian3(1e9, 1e9, 1e9),
        });
      }).toThrowDeveloperError();
    });

    it("create animation throws without a destination", function () {
      expect(function () {
        CameraFlightPath.createTween(scene, {});
      }).toThrowDeveloperError();
    });

    it("creates an animation", function () {
      var destination = new Cartesian3(1e9, 1e9, 1e9);
      var duration = 5.0;
      var complete = function () {};
      var cancel = function () {};

      var flight = CameraFlightPath.createTween(scene, {
        destination: destination,
        duration: duration,
        complete: complete,
        cancel: cancel,
      });

      expect(flight.duration).toEqual(duration);
      expect(typeof flight.complete).toEqual("function");
      expect(typeof flight.cancel).toEqual("function");
      expect(typeof flight.update).toEqual("function");
      expect(flight.startObject).toBeDefined();
      expect(flight.stopObject).toBeDefined();
      expect(flight.easingFunction).toBeDefined();
    });

    it("creates an animation in 3d", function () {
      var camera = scene.camera;

      var startPosition = Cartesian3.clone(camera.position);
      var startHeading = camera.heading;
      var startPitch = camera.pitch;
      var startRoll = camera.roll;

      var endPosition = Cartesian3.negate(startPosition, new Cartesian3());
      var endHeading = CesiumMath.toRadians(20.0);
      var endPitch = CesiumMath.toRadians(-45.0);
      var endRoll = CesiumMath.TWO_PI;

      var duration = 5.0;
      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        heading: endHeading,
        pitch: endPitch,
        roll: endRoll,
        duration: duration,
      });

      flight.update({ time: 0.0 });
      expect(camera.position).toEqualEpsilon(
        startPosition,
        CesiumMath.EPSILON12
      );
      expect(camera.heading).toEqualEpsilon(startHeading, CesiumMath.EPSILON12);
      expect(camera.pitch).toEqualEpsilon(startPitch, CesiumMath.EPSILON12);
      expect(camera.roll).toEqualEpsilon(startRoll, CesiumMath.EPSILON12);

      flight.update({ time: duration });
      expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
      expect(camera.heading).toEqualEpsilon(endHeading, CesiumMath.EPSILON12);
      expect(camera.pitch).toEqualEpsilon(endPitch, CesiumMath.EPSILON12);
      expect(camera.roll).toEqualEpsilon(endRoll, CesiumMath.EPSILON12);
    });

    it("creates an animation in 3d using custom ellipsoid", function () {
      var ellipsoid = new Ellipsoid(1737400, 1737400, 1737400);
      var mapProjection = new GeographicProjection(ellipsoid);
      scene = createScene({
        mapProjection: mapProjection,
      });
      scene.globe = new Globe(ellipsoid);

      var camera = scene.camera;

      var startPosition = Cartesian3.clone(camera.position);
      var endPosition = Cartesian3.fromDegrees(0.0, 0.0, 100.0, ellipsoid);

      var duration = 1.0;
      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
      });

      flight.update({ time: 0.0 });
      expect(camera.position).toEqualEpsilon(
        startPosition,
        CesiumMath.EPSILON12
      );

      flight.update({ time: duration });
      expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON7);
    });

    it("creates an animation in Columbus view", function () {
      scene._mode = SceneMode.COLUMBUS_VIEW;
      var camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );

      var startPosition = Cartesian3.clone(camera.position);

      var projection = scene.mapProjection;
      var destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e5 * Math.PI, 6e5 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      var endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      var duration = 5.0;
      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
      });

      flight.update({ time: 0.0 });
      expect(camera.position).toEqualEpsilon(
        startPosition,
        CesiumMath.EPSILON12
      );

      flight.update({ time: duration });
      expect(camera.position).toEqualEpsilon(destination, CesiumMath.EPSILON4);
    });

    it("creates an animation in 2D", function () {
      scene._mode = SceneMode.SCENE2D;
      var camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );
      camera.frustum = createOrthographicFrustum();

      var startHeight = camera.frustum.right - camera.frustum.left;
      var startPosition = Cartesian3.clone(camera.position);

      var projection = scene.mapProjection;
      var destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      var endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      var duration = 5.0;
      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
      });

      flight.update({ time: 0.0 });
      expect(camera.position).toEqualEpsilon(
        startPosition,
        CesiumMath.EPSILON12
      );
      expect(camera.frustum.right - camera.frustum.left).toEqualEpsilon(
        startHeight,
        CesiumMath.EPSILON7
      );

      flight.update({ time: duration });
      expect(camera.position.x).toEqualEpsilon(
        destination.x,
        CesiumMath.EPSILON7
      );
      expect(camera.position.y).toEqualEpsilon(
        destination.y,
        CesiumMath.EPSILON7
      );
      expect(camera.position.z).toEqualEpsilon(
        startPosition.z,
        CesiumMath.EPSILON7
      );
      expect(camera.frustum.right - camera.frustum.left).toEqualEpsilon(
        destination.z,
        CesiumMath.EPSILON7
      );
    });

    it("creates a path where the start and end points only differ in height", function () {
      var camera = scene.camera;
      var start = Cartesian3.clone(camera.position);
      var mag = Cartesian3.magnitude(start);
      var end = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(start, new Cartesian3()),
        mag - 1000000.0,
        new Cartesian3()
      );

      var duration = 3.0;
      var flight = CameraFlightPath.createTween(scene, {
        destination: end,
        duration: duration,
      });

      flight.update({ time: 0.0 });
      expect(camera.position).toEqualEpsilon(start, CesiumMath.EPSILON12);

      flight.update({ time: duration });
      expect(camera.position).toEqualEpsilon(end, CesiumMath.EPSILON12);
    });

    it("does not create a path to the same point", function () {
      var camera = scene.camera;
      camera.position = new Cartesian3(7000000.0, 0.0, 0.0);

      var startPosition = Cartesian3.clone(camera.position);
      var startHeading = camera.heading;
      var startPitch = camera.pitch;
      var startRoll = camera.roll;

      var duration = 3.0;
      var flight = CameraFlightPath.createTween(scene, {
        destination: startPosition,
        heading: startHeading,
        pitch: startPitch,
        roll: startRoll,
        duration: duration,
      });

      expect(flight.duration).toEqual(0);
      expect(camera.position).toEqual(startPosition);
      expect(camera.heading).toEqual(startHeading);
      expect(camera.pitch).toEqual(startPitch);
      expect(camera.roll).toEqual(startRoll);
    });

    it("creates an animation with 0 duration", function () {
      var destination = new Cartesian3(1e9, 1e9, 1e9);
      var duration = 0.0;
      var complete = function () {
        return true;
      };

      var flight = CameraFlightPath.createTween(scene, {
        destination: destination,
        duration: duration,
        complete: complete,
      });

      expect(flight.duration).toEqual(duration);
      expect(flight.complete).not.toEqual(complete);
      expect(flight.update).toBeUndefined();
      expect(scene.camera.position).not.toEqual(destination);
      flight.complete();
      expect(scene.camera.position).toEqualEpsilon(
        destination,
        CesiumMath.EPSILON14
      );
    });

    it("duration is 0 when destination is the same as camera position in 2D", function () {
      scene._mode = SceneMode.SCENE2D;
      var camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );
      camera.frustum = createOrthographicFrustum();
      camera.update(scene.mode);
      var frustum = camera.frustum;
      var destination = Cartesian3.clone(camera.position);
      destination.z = Math.max(
        frustum.right - frustum.left,
        frustum.top - frustum.bottom
      );

      var projection = scene.mapProjection;
      var endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
      });

      expect(flight.duration).toEqual(0.0);
    });

    it("duration is 0 when destination is the same as camera position in 3D", function () {
      scene._mode = SceneMode.SCENE3D;
      var camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.setView({
        orientation: {
          heading: 0,
          pitch: -CesiumMath.PI_OVER_TWO,
          roll: 0,
        },
      });
      camera.frustum = createOrthographicFrustum();

      var flight = CameraFlightPath.createTween(scene, {
        destination: camera.position,
      });

      expect(flight.duration).toEqual(0.0);
    });

    it("duration is 0 when destination is the same as camera position in CV", function () {
      scene._mode = SceneMode.COLUMBUS_VIEW;
      var camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.setView({
        orientation: {
          heading: 0,
          pitch: -CesiumMath.PI_OVER_TWO,
          roll: 0,
        },
      });

      var projection = scene.mapProjection;
      var endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(camera.position)
      );

      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
      });

      expect(flight.duration).toEqual(0.0);
    });

    it("creates an animation in 2D 0 duration", function () {
      scene._mode = SceneMode.SCENE2D;
      var camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );
      camera.frustum = createOrthographicFrustum();

      camera.update(scene.mode);

      var startPosition = Cartesian3.clone(camera.position);

      var projection = scene.mapProjection;
      var destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e5 * Math.PI, 6e5 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      var endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 0.0,
      });

      expect(typeof flight.complete).toEqual("function");
      flight.complete();
      expect(camera.position.x).toEqualEpsilon(
        destination.x,
        CesiumMath.EPSILON7
      );
      expect(camera.position.y).toEqualEpsilon(
        destination.y,
        CesiumMath.EPSILON7
      );
      expect(camera.frustum.right - camera.frustum.left).toEqualEpsilon(
        destination.z,
        CesiumMath.EPSILON7
      );
    });

    it("creates an animation in Columbus view 0 duration", function () {
      scene._mode = SceneMode.COLUMBUS_VIEW;
      var camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );

      var startPosition = Cartesian3.clone(camera.position);

      var projection = scene.mapProjection;
      var destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      var endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 0.0,
      });

      expect(typeof flight.complete).toEqual("function");
      flight.complete();
      expect(camera.position).toEqualEpsilon(destination, CesiumMath.EPSILON8);
    });

    it("creates an animation in 3d 0 duration", function () {
      var camera = scene.camera;

      var startPosition = Cartesian3.clone(camera.position);
      var endPosition = Cartesian3.negate(startPosition, new Cartesian3());

      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 0.0,
      });

      expect(typeof flight.complete).toEqual("function");
      flight.complete();
      expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
    });

    it("creates animation to hit flyOverLongitude", function () {
      var camera = scene.camera;
      var projection = scene.mapProjection;
      var position = new Cartographic();

      camera.position = Cartesian3.fromDegrees(10.0, 45.0, 1000.0);

      var endPosition = Cartesian3.fromDegrees(20.0, 45.0, 1000.0);

      var overLonFlight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
        flyOverLongitude: CesiumMath.toRadians(0.0),
      });

      var directFlight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
      });

      expect(typeof overLonFlight.update).toEqual("function");
      expect(typeof directFlight.update).toEqual("function");

      overLonFlight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      var lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeLessThan(10.0);

      directFlight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeGreaterThan(10.0);
      expect(lon).toBeLessThan(20.0);
    });

    it("uses flyOverLongitudeWeight", function () {
      var camera = scene.camera;
      var projection = scene.mapProjection;
      var position = new Cartographic();

      camera.position = Cartesian3.fromDegrees(10.0, 45.0, 1000.0);

      var endPosition = Cartesian3.fromDegrees(50.0, 45.0, 1000.0);

      var overLonFlightSmallWeight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
        flyOverLongitude: CesiumMath.toRadians(0.0),
        flyOverLongitudeWeight: 2,
      });

      var overLonFlightBigWeight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
        flyOverLongitude: CesiumMath.toRadians(0.0),
        flyOverLongitudeWeight: 20,
      });

      overLonFlightBigWeight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      var lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeLessThan(10.0);

      overLonFlightSmallWeight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeGreaterThan(10.0);
      expect(lon).toBeLessThan(50.0);
    });

    it("adjust pitch if camera flyes higher than pitchAdjustHeight", function () {
      var camera = scene.camera;
      var duration = 5.0;

      camera.setView({
        destination: Cartesian3.fromDegrees(-20.0, 0.0, 1000.0),
        orientation: {
          heading: CesiumMath.toRadians(0.0),
          pitch: CesiumMath.toRadians(-15.0),
          roll: 0.0,
        },
      });

      var startPitch = camera.pitch;
      var endPitch = CesiumMath.toRadians(-45.0);

      var flight = CameraFlightPath.createTween(scene, {
        destination: Cartesian3.fromDegrees(60.0, 0.0, 2000.0),
        pitch: endPitch,
        duration: duration,
        pitchAdjustHeight: 2000,
      });

      flight.update({ time: 0.0 });
      expect(camera.pitch).toEqualEpsilon(startPitch, CesiumMath.EPSILON6);

      flight.update({ time: duration });
      expect(camera.pitch).toEqualEpsilon(endPitch, CesiumMath.EPSILON6);

      flight.update({ time: duration / 2.0 });
      expect(camera.pitch).toEqualEpsilon(
        -CesiumMath.PI_OVER_TWO,
        CesiumMath.EPSILON4
      );
    });

    it("animation with flyOverLongitude is smooth over two pi", function () {
      var camera = scene.camera;
      var duration = 100.0;
      var projection = scene.mapProjection;
      var position = new Cartographic();

      var startLonDegrees = 10.0;
      var endLonDegrees = 20.0;

      camera.position = Cartesian3.fromDegrees(startLonDegrees, 45.0, 1000.0);
      var endPosition = Cartesian3.fromDegrees(endLonDegrees, 45.0, 1000.0);

      var outsideTwoPiFlight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
        flyOverLongitude: CesiumMath.toRadians(0.0),
      });

      var prevLon = startLonDegrees;
      var crossedDateChangesLine = 0;
      for (var t = 1; t < duration; t++) {
        outsideTwoPiFlight.update({ time: t });
        projection.ellipsoid.cartesianToCartographic(camera.position, position);
        var lon = CesiumMath.toDegrees(position.longitude);
        var d = lon - prevLon;
        if (d > 0) {
          expect(prevLon).toBeLessThan(-90);
          crossedDateChangesLine++;
          d -= 360;
        }
        prevLon = lon;
        expect(d).toBeLessThan(0);
      }

      expect(crossedDateChangesLine).toEqual(1);
    });

    it("animation with flyOverLongitude is smooth", function () {
      var camera = scene.camera;
      var duration = 100.0;
      var projection = scene.mapProjection;
      var position = new Cartographic();

      var startLonDegrees = -100.0;
      var endLonDegrees = 100.0;

      camera.position = Cartesian3.fromDegrees(startLonDegrees, 45.0, 1000.0);
      var endPosition = Cartesian3.fromDegrees(endLonDegrees, 45.0, 1000.0);

      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
        flyOverLongitude: CesiumMath.toRadians(0.0),
      });

      var prevLon = startLonDegrees;
      for (var t = 1; t < duration; t++) {
        flight.update({ time: t });
        projection.ellipsoid.cartesianToCartographic(camera.position, position);
        var lon = CesiumMath.toDegrees(position.longitude);
        var d = lon - prevLon;
        prevLon = lon;
        expect(d).toBeGreaterThan(0);
      }
    });

    it("does not go above the maximum height", function () {
      var camera = scene.camera;

      var startPosition = Cartesian3.fromDegrees(0.0, 0.0, 1000.0);
      var endPosition = Cartesian3.fromDegrees(10.0, 0.0, 1000.0);
      var duration = 5.0;

      camera.setView({
        destination: startPosition,
      });

      var flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
      });

      var maximumHeight = Number.NEGATIVE_INFINITY;
      var i;
      for (i = 0; i <= duration; ++i) {
        flight.update({ time: i });
        maximumHeight = Math.max(
          maximumHeight,
          camera.positionCartographic.height
        );
      }

      maximumHeight *= 0.5;

      camera.setView({
        destination: startPosition,
      });

      flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
        maximumHeight: maximumHeight,
      });

      for (i = 0; i <= duration; ++i) {
        flight.update({ time: i });
        expect(camera.positionCartographic.height).toBeLessThan(maximumHeight);
      }
    });
  },
  "WebGL"
);
