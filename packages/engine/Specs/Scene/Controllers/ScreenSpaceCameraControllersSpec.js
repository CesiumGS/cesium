import {
  Cartesian2,
  Cartesian3,
  Ellipsoid,
  Math as CesiumMath,
  getTimestamp,
} from "@cesium/core";
import {
  FeatureDetection,
  KeyboardEventModifier,
  MouseButton,
  ScreenSpaceTiltOrbitCameraController,
  ScreenSpaceZoomCameraController,
} from "../../../index.js";
import createCamera from "../../../../../Specs/createCamera.js";
import DomEventSimulator from "../../../../../Specs/DomEventSimulator.js";

describe("Scene/Controllers/ScreenSpaceCameraControllers", function () {
  const canvas = { clientWidth: 512, clientHeight: 384 };

  function createScene(camera) {
    return {
      canvas,
      camera,
      ellipsoid: Ellipsoid.WGS84,
    };
  }

  // Looks east, level with the ellipsoid surface.
  function createLevelCamera(height) {
    const camera = createCamera({ canvas });
    const position = Cartesian3.fromDegrees(-123.0, 44.0, height);
    const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
      position,
      new Cartesian3(),
    );
    const direction = Cartesian3.normalize(
      Cartesian3.cross(Cartesian3.UNIT_Z, up, new Cartesian3()),
      new Cartesian3(),
    );
    camera.position = position;
    camera.direction = direction;
    camera.up = up;
    camera.right = Cartesian3.cross(direction, up, new Cartesian3());
    return camera;
  }

  function prepareUpdate(controller) {
    // Ensure a nonzero time step.
    controller._lastUpdateTime = getTimestamp() - 16.0;
  }

  describe("ScreenSpaceZoomCameraController", function () {
    function updateWithScroll(controller, camera) {
      controller._handleZoomPosition({ endPosition: new Cartesian2(10, 20) });
      controller._handleZoom(1.0);
      prepareUpdate(controller);
      controller.update(createScene(camera));
    }

    it("zooms toward the center of the screen by default", function () {
      const controller = new ScreenSpaceZoomCameraController();
      const pick = spyOn(controller, "pickWorldPosition").and.returnValue(
        undefined,
      );

      updateWithScroll(controller, createLevelCamera(100.0));

      expect(pick).toHaveBeenCalled();
      expect(pick.calls.mostRecent().args[1]).toEqual(
        new Cartesian2(canvas.clientWidth / 2.0, canvas.clientHeight / 2.0),
      );
    });

    it("zooms toward the pointer with usePointerPosition", function () {
      const controller = new ScreenSpaceZoomCameraController();
      controller.usePointerPosition = true;
      const pick = spyOn(controller, "pickWorldPosition").and.returnValue(
        undefined,
      );

      updateWithScroll(controller, createLevelCamera(100.0));

      expect(pick).toHaveBeenCalled();
      expect(pick.calls.mostRecent().args[1]).toEqual(new Cartesian2(10, 20));
    });

    describe("connected input events", function () {
      let element;
      let controller;

      beforeEach(function () {
        element = document.createElement("div");
        element.disableRootEvents = true;
        document.body.appendChild(element);
        if (FeatureDetection.supportsPointerEvents()) {
          spyOn(element, "setPointerCapture");
        }
      });

      afterEach(function () {
        controller.disconnectedCallback(element);
        document.body.removeChild(element);
      });

      function mouseEvent(type, position, shiftKey = false) {
        const rect = element.getBoundingClientRect();
        const options = {
          button: 1,
          clientX: rect.left + position.x,
          clientY: rect.top + position.y,
          pointerType: "mouse",
          shiftKey: shiftKey,
        };
        if (FeatureDetection.supportsPointerEvents()) {
          DomEventSimulator[`firePointer${type}`](element, options);
        } else {
          DomEventSimulator[`fireMouse${type}`](element, options);
        }
      }

      function expectScrollPick(options) {
        controller = new ScreenSpaceZoomCameraController(options);
        controller.usePointerPosition = true;
        const pick = spyOn(controller, "pickWorldPosition").and.returnValue(
          undefined,
        );
        controller.connectedCallback(element);
        mouseEvent("Move", new Cartesian2(10, 20));
        DomEventSimulator.fireWheel(element, { deltaY: -1 });
        prepareUpdate(controller);
        controller.update(createScene(createLevelCamera(100.0)));

        expect(pick).toHaveBeenCalled();
        expect(pick.calls.mostRecent().args[1]).toEqual(new Cartesian2(10, 20));
      }

      it("uses the mouse position for wheel zoom with default drag bindings", function () {
        expectScrollPick();
      });

      it("uses the mouse position for wheel zoom without drag bindings", function () {
        expectScrollPick({ dragInputs: [] });
      });

      it("preserves middle drag zoom and uses the drag start position", function () {
        controller = new ScreenSpaceZoomCameraController();
        controller.usePointerPosition = true;
        const pick = spyOn(controller, "pickWorldPosition").and.returnValue(
          undefined,
        );
        controller.connectedCallback(element);

        mouseEvent("Down", new Cartesian2(30, 40));
        mouseEvent("Move", new Cartesian2(30, 60));
        prepareUpdate(controller);
        controller.update(createScene(createLevelCamera(100.0)));

        expect(pick).toHaveBeenCalled();
        expect(pick.calls.mostRecent().args[1]).toEqual(new Cartesian2(30, 40));
        mouseEvent("Up", new Cartesian2(30, 60));
      });

      it("preserves drag bindings with modifiers", function () {
        controller = new ScreenSpaceZoomCameraController({
          dragInputs: [
            {
              button: MouseButton.MIDDLE,
              modifier: KeyboardEventModifier.SHIFT,
            },
          ],
        });
        controller.usePointerPosition = true;
        const pick = spyOn(controller, "pickWorldPosition").and.returnValue(
          undefined,
        );
        controller.connectedCallback(element);

        mouseEvent("Down", new Cartesian2(30, 40), true);
        mouseEvent("Move", new Cartesian2(30, 60), true);
        prepareUpdate(controller);
        controller.update(createScene(createLevelCamera(100.0)));

        expect(pick).toHaveBeenCalled();
        expect(pick.calls.mostRecent().args[1]).toEqual(new Cartesian2(30, 40));
        mouseEvent("Up", new Cartesian2(30, 60), true);
      });
    });

    it("zooms forward when nothing is picked below the ellipsoid's maximum radius", function () {
      // At 44 degrees latitude, the ellipsoid's surface is about 11 km below its maximum radius.
      const camera = createLevelCamera(100.0);
      expect(Cartesian3.magnitude(camera.positionWC)).toBeLessThan(
        Ellipsoid.WGS84.maximumRadius,
      );

      const controller = new ScreenSpaceZoomCameraController();
      controller.dampingEnabled = false;
      controller.pickWorldPosition = () => undefined;
      const start = Cartesian3.clone(camera.positionWC);
      const direction = Cartesian3.clone(camera.directionWC);

      updateWithScroll(controller, camera);

      const moved = Cartesian3.subtract(
        camera.positionWC,
        start,
        new Cartesian3(),
      );
      expect(Cartesian3.dot(moved, direction)).toBeGreaterThan(0.0);
    });

    describe("minimumZoomDistance", function () {
      const frameTime = 1000.0 / 60.0;

      // Scrolls for two seconds, then coasts, and returns the closest approach to the target.
      function zoomTowardTarget(minimumZoomDistance, wheelDelta) {
        const camera = createLevelCamera(100.0);
        const target = Cartesian3.add(
          camera.positionWC,
          Cartesian3.multiplyByScalar(
            camera.directionWC,
            1000.0,
            new Cartesian3(),
          ),
          new Cartesian3(),
        );

        const controller = new ScreenSpaceZoomCameraController();
        controller.minimumZoomDistance = minimumZoomDistance;
        controller.pickWorldPosition = (scene, windowPosition, result) =>
          Cartesian3.clone(target, result);
        const scene = createScene(camera);

        let closest = Number.POSITIVE_INFINITY;
        for (let i = 0; i < 600; i++) {
          if (i < 120 && i % 3 === 0) {
            controller._handleZoom(wheelDelta);
          }
          controller._lastUpdateTime = getTimestamp() - frameTime;
          controller.update(scene);
          closest = Math.min(
            closest,
            Cartesian3.distance(camera.positionWC, target),
          );
        }
        return closest;
      }

      it("does not zoom past the target with momentum", function () {
        const closest = zoomTowardTarget(0.0, 100.0);
        expect(closest).toBeGreaterThanOrEqual(0.0);
        expect(closest).toBeLessThan(10.0);
      });

      it("stops at the minimum zoom distance with momentum", function () {
        const closest = zoomTowardTarget(500.0, 100.0);
        expect(closest).toBeGreaterThanOrEqual(500.0 - CesiumMath.EPSILON3);
        expect(closest).toBeLessThan(510.0);
      });

      it("zooms out from inside the minimum zoom distance", function () {
        const camera = createLevelCamera(100.0);
        const target = Cartesian3.add(
          camera.positionWC,
          Cartesian3.multiplyByScalar(
            camera.directionWC,
            100.0,
            new Cartesian3(),
          ),
          new Cartesian3(),
        );
        const controller = new ScreenSpaceZoomCameraController();
        controller.minimumZoomDistance = 500.0;
        controller.dampingEnabled = false;
        controller.pickWorldPosition = (scene, windowPosition, result) =>
          Cartesian3.clone(target, result);

        controller._handleZoom(-1.0);
        prepareUpdate(controller);
        controller.update(createScene(camera));

        expect(Cartesian3.distance(camera.positionWC, target)).toBeGreaterThan(
          100.0,
        );
      });
      it("does not throw when the camera is at the target", function () {
        const camera = createLevelCamera(100.0);
        const target = Cartesian3.clone(camera.positionWC);
        const controller = new ScreenSpaceZoomCameraController();
        controller.pickWorldPosition = (scene, windowPosition, result) =>
          Cartesian3.clone(target, result);

        controller._handleZoom(-1.0);
        prepareUpdate(controller);

        expect(() => controller.update(createScene(camera))).not.toThrow();
      });
    });

    it("re-enabling discards zoom input and inertia", function () {
      const controller = new ScreenSpaceZoomCameraController();

      controller.enabled = false;
      controller._handleZoom(1.0);
      controller._zoomInputVelocity = 1.0;
      controller.zoomVelocity = 1.0;
      controller.enabled = true;

      expect(controller._scrollDelta).toBe(0.0);
      expect(controller._zoomInputVelocity).toBe(0.0);
      expect(controller.zoomVelocity).toBe(0.0);
    });

    it("setting enabled to its current value keeps inertia", function () {
      const controller = new ScreenSpaceZoomCameraController();
      controller.zoomVelocity = 1.0;

      controller.enabled = true;

      expect(controller.zoomVelocity).toBe(1.0);
    });
  });

  describe("ScreenSpaceTiltOrbitCameraController", function () {
    function updateWithDrag(controller, dx, dy) {
      const target = Cartesian3.fromDegrees(-123.0, 44.0, 0.0);
      controller.pickWorldPosition = (scene, windowPosition, result) =>
        Cartesian3.clone(target, result);
      controller._dragInputState = { isDragging: true };
      controller._dragDelta.x = dx;
      controller._dragDelta.y = dy;
      prepareUpdate(controller);
      controller.update(createScene(createLevelCamera(100.0)));
    }

    function getOrbitAndTiltAmounts(controller) {
      const orbit = spyOn(controller, "orbit");
      const tilt = spyOn(controller, "tilt");
      updateWithDrag(controller, 10.0, 5.0);
      return {
        orbit: orbit.calls.mostRecent().args[3],
        tilt: tilt.calls.mostRecent().args[3],
      };
    }

    it("orbits and tilts in the drag direction by default", function () {
      const controller = new ScreenSpaceTiltOrbitCameraController();

      const amounts = getOrbitAndTiltAmounts(controller);

      expect(amounts.orbit).toBeGreaterThan(0.0);
      expect(amounts.tilt).toBeGreaterThan(0.0);
    });

    it("a negative orbitMagnitude reverses the orbit direction", function () {
      const controller = new ScreenSpaceTiltOrbitCameraController();
      controller.orbitMagnitude = -2.0;

      const amounts = getOrbitAndTiltAmounts(controller);

      expect(amounts.orbit).toBeLessThan(0.0);
      expect(amounts.tilt).toBeGreaterThan(0.0);
    });

    it("a negative tiltMagnitude reverses the tilt direction", function () {
      const controller = new ScreenSpaceTiltOrbitCameraController();
      controller.tiltMagnitude = -2.0;

      const amounts = getOrbitAndTiltAmounts(controller);

      expect(amounts.orbit).toBeGreaterThan(0.0);
      expect(amounts.tilt).toBeLessThan(0.0);
    });

    it("negative magnitudes use a positive maximum speed when damping", function () {
      const controller = new ScreenSpaceTiltOrbitCameraController();
      controller.dampingEnabled = true;
      controller.orbitMagnitude = -2.0;
      controller.tiltMagnitude = -2.0;
      const smoothDamp = spyOn(CesiumMath, "smoothDamp").and.callThrough();

      expect(function () {
        updateWithDrag(controller, 10.0, 5.0);
      }).not.toThrow();

      expect(smoothDamp).toHaveBeenCalledTimes(2);
      for (const call of smoothDamp.calls.all()) {
        expect(call.args[4]).toBeGreaterThan(0.0);
      }
    });

    it("disabling cancels a drag in progress", function () {
      const controller = new ScreenSpaceTiltOrbitCameraController();
      controller._dragInputState = { isDragging: true };

      controller.enabled = false;

      expect(controller.isDragging).toBe(false);
    });

    it("re-enabling discards drag input and inertia", function () {
      const controller = new ScreenSpaceTiltOrbitCameraController();

      controller.enabled = false;
      controller._handleDrag({
        startPosition: new Cartesian2(0, 0),
        endPosition: new Cartesian2(10, 20),
      });
      controller.orbitVelocity = 1.0;
      controller.tiltVelocity = 1.0;
      controller.enabled = true;

      expect(controller._dragDelta).toEqual(Cartesian2.ZERO);
      expect(controller.orbitVelocity).toBe(0.0);
      expect(controller.tiltVelocity).toBe(0.0);
    });
  });
});
