import {
  Cartesian2,
  Cartesian3,
  Matrix3,
  OrientedBoundingBox,
  Ray,
} from "@cesium/core";
import {
  HybridScreenSpacePanCameraController,
  KeyboardEventModifier,
  MouseButton,
  ScreenSpaceTiltOrbitCameraController,
  ScreenSpaceZoomCameraController,
} from "@cesium/engine";
import { EditorCameraControls } from "../../../index.js";

describe("Widgets/Viewer/EditorCameraControls", function () {
  let viewer;
  let editor;
  let controls;
  let pickedPosition;

  const windowPosition = new Cartesian2(10.0, 20.0);

  function createMesh(center, isActive = false) {
    return {
      orientedBoundingBox: new OrientedBoundingBox(center, Matrix3.IDENTITY),
      isActive,
    };
  }

  beforeEach(function () {
    pickedPosition = undefined;
    editor = {
      meshes: [],
      isMeshActive: (mesh) => mesh.isActive,
    };
    viewer = {
      scene: {
        canvas: document.createElement("canvas"),
        screenSpaceCameraController: {
          enableInputs: true,
          enableCollisionDetection: true,
        },
        // Looks along +x from the origin.
        camera: {
          positionWC: Cartesian3.ZERO,
          directionWC: Cartesian3.UNIT_X,
          getPickRay: (position, result) =>
            Ray.clone(
              new Ray(Cartesian3.ZERO, Cartesian3.UNIT_X),
              result ?? new Ray(),
            ),
        },
        pickPosition: (position, result) =>
          pickedPosition && Cartesian3.clone(pickedPosition, result),
      },
      addController: jasmine.createSpy("addController"),
      removeController: jasmine.createSpy("removeController"),
    };
    controls = new EditorCameraControls(viewer, editor);
  });

  function getController(type) {
    return viewer.addController.calls
      .allArgs()
      .map((args) => args[0])
      .find((controller) => controller instanceof type);
  }

  function pick(controller) {
    return controller.pickWorldPosition(
      viewer.scene,
      windowPosition,
      new Cartesian3(),
    );
  }

  it("replaces the camera controller's inputs", function () {
    const cameraController = viewer.scene.screenSpaceCameraController;
    expect(cameraController.enableInputs).toBe(false);
    expect(cameraController.enableCollisionDetection).toBe(false);
    expect(viewer.addController).toHaveBeenCalledTimes(3);
  });

  it("orbits with the middle button", function () {
    const orbit = getController(ScreenSpaceTiltOrbitCameraController);
    expect(orbit.dragInputs).toEqual([{ button: MouseButton.MIDDLE }]);
  });

  it("pans with Shift and the middle button", function () {
    const pan = getController(HybridScreenSpacePanCameraController);
    const dragInputs = [
      { button: MouseButton.MIDDLE, modifier: KeyboardEventModifier.SHIFT },
    ];
    expect(pan.mapController.dragInputs).toEqual(dragInputs);
    expect(pan.elevatorController.dragInputs).toEqual(dragInputs);
  });

  it("zooms with the wheel only", function () {
    const zoom = getController(ScreenSpaceZoomCameraController);
    expect(zoom.dragInputs).toEqual([]);
    expect(zoom.usePointerPosition).toBe(true);
  });

  it("lists each button its controllers drag with once", function () {
    const orbit = getController(ScreenSpaceTiltOrbitCameraController);
    const pan = getController(HybridScreenSpacePanCameraController);
    const buttons = [
      ...orbit.dragInputs,
      ...pan.mapController.dragInputs,
      ...pan.elevatorController.dragInputs,
    ].map((input) => input.button);

    expect(EditorCameraControls.dragButtons).toEqual([...new Set(buttons)]);
    expect(EditorCameraControls.dragButtons).toEqual([MouseButton.MIDDLE]);
  });

  describe("orbit pivot", function () {
    it("is the center of the active meshes", function () {
      editor.meshes = [
        createMesh(new Cartesian3(10.0, 0.0, 0.0), true),
        createMesh(new Cartesian3(20.0, 0.0, 0.0), true),
        createMesh(new Cartesian3(100.0, 0.0, 0.0)),
      ];

      const pivot = pick(getController(ScreenSpaceTiltOrbitCameraController));

      expect(pivot).toEqualEpsilon(new Cartesian3(15.0, 0.0, 0.0), 1e-9);
    });

    it("is the center of all meshes if none are active", function () {
      editor.meshes = [
        createMesh(new Cartesian3(10.0, 0.0, 0.0)),
        createMesh(new Cartesian3(30.0, 0.0, 0.0)),
      ];

      const pivot = pick(getController(ScreenSpaceTiltOrbitCameraController));

      expect(pivot).toEqualEpsilon(new Cartesian3(20.0, 0.0, 0.0), 1e-9);
    });

    it("skips meshes without bounds", function () {
      editor.meshes = [
        createMesh(new Cartesian3(10.0, 0.0, 0.0)),
        { orientedBoundingBox: undefined, isActive: false },
      ];

      const pivot = pick(getController(ScreenSpaceTiltOrbitCameraController));

      expect(pivot).toEqualEpsilon(new Cartesian3(10.0, 0.0, 0.0), 1e-9);
    });

    it("is in front of the camera before any mesh has bounds", function () {
      const pivot = pick(getController(ScreenSpaceTiltOrbitCameraController));

      expect(pivot).toEqualEpsilon(new Cartesian3(10.0, 0.0, 0.0), 1e-9);
    });

    it("is the last pivot once no mesh has bounds", function () {
      const orbit = getController(ScreenSpaceTiltOrbitCameraController);
      editor.meshes = [createMesh(new Cartesian3(30.0, 5.0, 0.0))];
      pick(orbit);

      editor.meshes = [];

      expect(pick(orbit)).toEqualEpsilon(new Cartesian3(30.0, 5.0, 0.0), 1e-9);
    });
  });

  describe("pan", function () {
    it("picks under the pointer at the pivot's depth", function () {
      editor.meshes = [createMesh(new Cartesian3(10.0, 5.0, 0.0))];
      const pan = getController(HybridScreenSpacePanCameraController);

      expect(pick(pan.mapController)).toEqualEpsilon(
        new Cartesian3(10.0, 0.0, 0.0),
        1e-9,
      );
      expect(pick(pan.elevatorController)).toEqualEpsilon(
        new Cartesian3(10.0, 0.0, 0.0),
        1e-9,
      );
    });

    it("picks in front of the camera when the pivot is behind it", function () {
      editor.meshes = [createMesh(new Cartesian3(-10.0, 0.0, 0.0))];
      const pan = getController(HybridScreenSpacePanCameraController);

      expect(pick(pan.mapController)).toEqualEpsilon(
        new Cartesian3(1.0, 0.0, 0.0),
        1e-9,
      );
    });
  });

  describe("zoom", function () {
    it("heads toward the position under the pointer", function () {
      pickedPosition = new Cartesian3(3.0, 4.0, 5.0);

      const target = pick(getController(ScreenSpaceZoomCameraController));

      expect(target).toEqual(pickedPosition);
    });

    it("heads toward the pivot's depth if nothing's under the pointer", function () {
      editor.meshes = [createMesh(new Cartesian3(10.0, 5.0, 0.0))];

      const target = pick(getController(ScreenSpaceZoomCameraController));

      expect(target).toEqualEpsilon(new Cartesian3(10.0, 0.0, 0.0), 1e-9);
    });

    it("picks once per wheel event", function () {
      const zoom = getController(ScreenSpaceZoomCameraController);
      pickedPosition = new Cartesian3(3.0, 4.0, 5.0);
      pick(zoom);

      pickedPosition = new Cartesian3(6.0, 7.0, 8.0);
      expect(pick(zoom)).toEqual(new Cartesian3(3.0, 4.0, 5.0));

      viewer.scene.canvas.dispatchEvent(new WheelEvent("wheel"));
      expect(pick(zoom)).toEqual(pickedPosition);
    });
  });

  describe("destroy", function () {
    it("removes the controllers and restores the camera controller", function () {
      const cameraController = viewer.scene.screenSpaceCameraController;
      const added = viewer.addController.calls.allArgs().map((args) => args[0]);

      controls.destroy();

      expect(
        viewer.removeController.calls.allArgs().map((args) => args[0]),
      ).toEqual(added);
      expect(cameraController.enableInputs).toBe(true);
      expect(cameraController.enableCollisionDetection).toBe(true);
    });

    it("keeps the camera controller's previous settings", function () {
      controls.destroy();
      const cameraController = viewer.scene.screenSpaceCameraController;
      cameraController.enableInputs = false;
      cameraController.enableCollisionDetection = false;
      controls = new EditorCameraControls(viewer, editor);

      controls.destroy();

      expect(cameraController.enableInputs).toBe(false);
      expect(cameraController.enableCollisionDetection).toBe(false);
    });

    it("stops listening for wheel events", function () {
      const zoom = getController(ScreenSpaceZoomCameraController);
      pickedPosition = new Cartesian3(3.0, 4.0, 5.0);
      pick(zoom);
      controls.destroy();

      pickedPosition = new Cartesian3(6.0, 7.0, 8.0);
      viewer.scene.canvas.dispatchEvent(new WheelEvent("wheel"));

      expect(pick(zoom)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
    });
  });
});
