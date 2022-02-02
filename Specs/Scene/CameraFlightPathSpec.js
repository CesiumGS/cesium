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
    let scene;

    beforeEach(function () {
      scene = createScene();
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    function createOrthographicFrustum() {
      const current = scene.camera.frustum;
      const f = new OrthographicOffCenterFrustum();
      f.near = current.near;
      f.far = current.far;

      const tanTheta = Math.tan(0.5 * current.fovy);
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
      const destination = new Cartesian3(1e9, 1e9, 1e9);
      const duration = 5.0;
      const complete = function () {};
      const cancel = function () {};

      const flight = CameraFlightPath.createTween(scene, {
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
      const camera = scene.camera;

      const startPosition = Cartesian3.clone(camera.position);
      const startHeading = camera.heading;
      const startPitch = camera.pitch;
      const startRoll = camera.roll;

      const endPosition = Cartesian3.negate(startPosition, new Cartesian3());
      const endHeading = CesiumMath.toRadians(20.0);
      const endPitch = CesiumMath.toRadians(-45.0);
      const endRoll = CesiumMath.TWO_PI;

      const duration = 5.0;
      const flight = CameraFlightPath.createTween(scene, {
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
      const ellipsoid = new Ellipsoid(1737400, 1737400, 1737400);
      const mapProjection = new GeographicProjection(ellipsoid);
      scene = createScene({
        mapProjection: mapProjection,
      });
      scene.globe = new Globe(ellipsoid);

      const camera = scene.camera;

      const startPosition = Cartesian3.clone(camera.position);
      const endPosition = Cartesian3.fromDegrees(0.0, 0.0, 100.0, ellipsoid);

      const duration = 1.0;
      const flight = CameraFlightPath.createTween(scene, {
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
      const camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );

      const startPosition = Cartesian3.clone(camera.position);

      const projection = scene.mapProjection;
      const destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e5 * Math.PI, 6e5 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      const endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      const duration = 5.0;
      const flight = CameraFlightPath.createTween(scene, {
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
      const camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );
      camera.frustum = createOrthographicFrustum();

      const startHeight = camera.frustum.right - camera.frustum.left;
      const startPosition = Cartesian3.clone(camera.position);

      const projection = scene.mapProjection;
      const destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      const endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      const duration = 5.0;
      const flight = CameraFlightPath.createTween(scene, {
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
      const camera = scene.camera;
      const start = Cartesian3.clone(camera.position);
      const mag = Cartesian3.magnitude(start);
      const end = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(start, new Cartesian3()),
        mag - 1000000.0,
        new Cartesian3()
      );

      const duration = 3.0;
      const flight = CameraFlightPath.createTween(scene, {
        destination: end,
        duration: duration,
      });

      flight.update({ time: 0.0 });
      expect(camera.position).toEqualEpsilon(start, CesiumMath.EPSILON12);

      flight.update({ time: duration });
      expect(camera.position).toEqualEpsilon(end, CesiumMath.EPSILON12);
    });

    it("does not create a path to the same point", function () {
      const camera = scene.camera;
      camera.position = new Cartesian3(7000000.0, 0.0, 0.0);

      const startPosition = Cartesian3.clone(camera.position);
      const startHeading = camera.heading;
      const startPitch = camera.pitch;
      const startRoll = camera.roll;

      const duration = 3.0;
      const flight = CameraFlightPath.createTween(scene, {
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
      const destination = new Cartesian3(1e9, 1e9, 1e9);
      const duration = 0.0;
      const complete = function () {
        return true;
      };

      const flight = CameraFlightPath.createTween(scene, {
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
      const camera = scene.camera;

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
      const frustum = camera.frustum;
      const destination = Cartesian3.clone(camera.position);
      destination.z = Math.max(
        frustum.right - frustum.left,
        frustum.top - frustum.bottom
      );

      const projection = scene.mapProjection;
      const endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      const flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
      });

      expect(flight.duration).toEqual(0.0);
    });

    it("duration is 0 when destination is the same as camera position in 3D", function () {
      scene._mode = SceneMode.SCENE3D;
      const camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.setView({
        orientation: {
          heading: 0,
          pitch: -CesiumMath.PI_OVER_TWO,
          roll: 0,
        },
      });
      camera.frustum = createOrthographicFrustum();

      const flight = CameraFlightPath.createTween(scene, {
        destination: camera.position,
      });

      expect(flight.duration).toEqual(0.0);
    });

    it("duration is 0 when destination is the same as camera position in CV", function () {
      scene._mode = SceneMode.COLUMBUS_VIEW;
      const camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.setView({
        orientation: {
          heading: 0,
          pitch: -CesiumMath.PI_OVER_TWO,
          roll: 0,
        },
      });

      const projection = scene.mapProjection;
      const endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(camera.position)
      );

      const flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
      });

      expect(flight.duration).toEqual(0.0);
    });

    it("creates an animation in 2D 0 duration", function () {
      scene._mode = SceneMode.SCENE2D;
      const camera = scene.camera;

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

      const startPosition = Cartesian3.clone(camera.position);

      const projection = scene.mapProjection;
      const destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e5 * Math.PI, 6e5 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      const endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      const flight = CameraFlightPath.createTween(scene, {
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
      const camera = scene.camera;

      camera.position = new Cartesian3(0.0, 0.0, 1000.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.cross(
        camera.direction,
        camera.up,
        new Cartesian3()
      );

      const startPosition = Cartesian3.clone(camera.position);

      const projection = scene.mapProjection;
      const destination = Cartesian3.add(
        startPosition,
        new Cartesian3(-6e6 * Math.PI, 6e6 * CesiumMath.PI_OVER_FOUR, 100.0),
        new Cartesian3()
      );
      const endPosition = projection.ellipsoid.cartographicToCartesian(
        projection.unproject(destination)
      );

      const flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 0.0,
      });

      expect(typeof flight.complete).toEqual("function");
      flight.complete();
      expect(camera.position).toEqualEpsilon(destination, CesiumMath.EPSILON8);
    });

    it("creates an animation in 3d 0 duration", function () {
      const camera = scene.camera;

      const startPosition = Cartesian3.clone(camera.position);
      const endPosition = Cartesian3.negate(startPosition, new Cartesian3());

      const flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 0.0,
      });

      expect(typeof flight.complete).toEqual("function");
      flight.complete();
      expect(camera.position).toEqualEpsilon(endPosition, CesiumMath.EPSILON12);
    });

    it("creates animation to hit flyOverLongitude", function () {
      const camera = scene.camera;
      const projection = scene.mapProjection;
      const position = new Cartographic();

      camera.position = Cartesian3.fromDegrees(10.0, 45.0, 1000.0);

      const endPosition = Cartesian3.fromDegrees(20.0, 45.0, 1000.0);

      const overLonFlight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
        flyOverLongitude: CesiumMath.toRadians(0.0),
      });

      const directFlight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
      });

      expect(typeof overLonFlight.update).toEqual("function");
      expect(typeof directFlight.update).toEqual("function");

      overLonFlight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      let lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeLessThan(10.0);

      directFlight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeGreaterThan(10.0);
      expect(lon).toBeLessThan(20.0);
    });

    it("uses flyOverLongitudeWeight", function () {
      const camera = scene.camera;
      const projection = scene.mapProjection;
      const position = new Cartographic();

      camera.position = Cartesian3.fromDegrees(10.0, 45.0, 1000.0);

      const endPosition = Cartesian3.fromDegrees(50.0, 45.0, 1000.0);

      const overLonFlightSmallWeight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
        flyOverLongitude: CesiumMath.toRadians(0.0),
        flyOverLongitudeWeight: 2,
      });

      const overLonFlightBigWeight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: 1.0,
        flyOverLongitude: CesiumMath.toRadians(0.0),
        flyOverLongitudeWeight: 20,
      });

      overLonFlightBigWeight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      let lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeLessThan(10.0);

      overLonFlightSmallWeight.update({ time: 0.3 });
      projection.ellipsoid.cartesianToCartographic(camera.position, position);
      lon = CesiumMath.toDegrees(position.longitude);

      expect(lon).toBeGreaterThan(10.0);
      expect(lon).toBeLessThan(50.0);
    });

    it("adjust pitch if camera flyes higher than pitchAdjustHeight", function () {
      const camera = scene.camera;
      const duration = 5.0;

      camera.setView({
        destination: Cartesian3.fromDegrees(-20.0, 0.0, 1000.0),
        orientation: {
          heading: CesiumMath.toRadians(0.0),
          pitch: CesiumMath.toRadians(-15.0),
          roll: 0.0,
        },
      });

      const startPitch = camera.pitch;
      const endPitch = CesiumMath.toRadians(-45.0);

      const flight = CameraFlightPath.createTween(scene, {
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
      const camera = scene.camera;
      const duration = 100.0;
      const projection = scene.mapProjection;
      const position = new Cartographic();

      const startLonDegrees = 10.0;
      const endLonDegrees = 20.0;

      camera.position = Cartesian3.fromDegrees(startLonDegrees, 45.0, 1000.0);
      const endPosition = Cartesian3.fromDegrees(endLonDegrees, 45.0, 1000.0);

      const outsideTwoPiFlight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
        flyOverLongitude: CesiumMath.toRadians(0.0),
      });

      let prevLon = startLonDegrees;
      let crossedDateChangesLine = 0;
      for (let t = 1; t < duration; t++) {
        outsideTwoPiFlight.update({ time: t });
        projection.ellipsoid.cartesianToCartographic(camera.position, position);
        const lon = CesiumMath.toDegrees(position.longitude);
        let d = lon - prevLon;
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
      const camera = scene.camera;
      const duration = 100.0;
      const projection = scene.mapProjection;
      const position = new Cartographic();

      const startLonDegrees = -100.0;
      const endLonDegrees = 100.0;

      camera.position = Cartesian3.fromDegrees(startLonDegrees, 45.0, 1000.0);
      const endPosition = Cartesian3.fromDegrees(endLonDegrees, 45.0, 1000.0);

      const flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
        flyOverLongitude: CesiumMath.toRadians(0.0),
      });

      let prevLon = startLonDegrees;
      for (let t = 1; t < duration; t++) {
        flight.update({ time: t });
        projection.ellipsoid.cartesianToCartographic(camera.position, position);
        const lon = CesiumMath.toDegrees(position.longitude);
        const d = lon - prevLon;
        prevLon = lon;
        expect(d).toBeGreaterThan(0);
      }
    });

    it("does not go above the maximum height", function () {
      const camera = scene.camera;

      const startPosition = Cartesian3.fromDegrees(0.0, 0.0, 1000.0);
      const endPosition = Cartesian3.fromDegrees(10.0, 0.0, 1000.0);
      const duration = 5.0;

      camera.setView({
        destination: startPosition,
      });

      let flight = CameraFlightPath.createTween(scene, {
        destination: endPosition,
        duration: duration,
      });

      let maximumHeight = Number.NEGATIVE_INFINITY;
      let i;
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
