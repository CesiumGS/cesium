import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

scene.camera.flyTo({
  duration: 0,
  destination: Cesium.Rectangle.fromDegrees(
    // Philly
    -75.280266,
    39.867004,
    -74.955763,
    40.137992,
  ),
});

scene.screenSpaceCameraController.enableInputs = false;
scene.screenSpaceCameraController.enableCollisionDetection = false;

// TODO: Zoom controller

const panController = new Cesium.HybridScreenspacePanCameraController();
viewer.addController(panController);

const tiltController = new Cesium.ScreenspaceTiltOrbitCameraController();
viewer.addController(tiltController);

// TODO: Instructions panel