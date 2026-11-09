import { HybridScreenSpacePanCameraController } from "../../../index.js";

describe("Scene/Controllers/HybridScreenSpacePanCameraController", function () {
  it("is enabled by default", function () {
    const controller = new HybridScreenSpacePanCameraController();
    expect(controller.enabled).toBe(true);
    expect(controller.mapController.enabled).toBe(true);
    expect(controller.elevatorController.enabled).toBe(true);
  });

  it("enabled enables and disables the map and elevator controllers", function () {
    const controller = new HybridScreenSpacePanCameraController();

    controller.enabled = false;
    expect(controller.enabled).toBe(false);
    expect(controller.mapController.enabled).toBe(false);
    expect(controller.elevatorController.enabled).toBe(false);

    controller.enabled = true;
    expect(controller.enabled).toBe(true);
    expect(controller.mapController.enabled).toBe(true);
    expect(controller.elevatorController.enabled).toBe(true);
  });

  it("disabling cancels a pan in progress", function () {
    const controller = new HybridScreenSpacePanCameraController();
    const { mapController, elevatorController } = controller;
    mapController._dragInputState = { isDragging: true };
    elevatorController._dragInputState = { isDragging: true };

    controller.enabled = false;

    expect(mapController._dragInputState.isDragging).toBe(false);
    expect(elevatorController._dragInputState.isDragging).toBe(false);
  });

  it("re-enabling discards pan input and inertia", function () {
    const controller = new HybridScreenSpacePanCameraController();
    const { mapController, elevatorController } = controller;
    const panEvent = {
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 10, y: 20 },
    };

    controller.enabled = false;
    mapController._handlePan(panEvent);
    elevatorController._handlePan(panEvent);
    mapController._panVelocity.x = 1.0;
    elevatorController._panVelocity.x = 1.0;
    controller.enabled = true;

    expect(mapController._panDelta.x).toBe(0);
    expect(mapController._panDelta.y).toBe(0);
    expect(mapController._panVelocity.x).toBe(0);
    expect(elevatorController._panDelta.x).toBe(0);
    expect(elevatorController._panDelta.y).toBe(0);
    expect(elevatorController._panVelocity.x).toBe(0);
  });
});
