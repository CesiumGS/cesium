import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;

// Disable the default camera controls
scene.screenSpaceCameraController.enableInputs = false;
scene.screenSpaceCameraController.enableCollisionDetection = false;

// Set up the modular camera controllers
const panController = new Cesium.HybridScreenspacePanCameraController();
viewer.addController(panController);

const tiltController = new Cesium.ScreenspaceTiltOrbitCameraController();
viewer.addController(tiltController);

// const zoomController = new Cesium.ScreenspaceZoomCameraController();
// viewer.addController(zoomController);

// Load a 3D Tiles power plant asset
try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);
  scene.primitives.add(tileset);

  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
    "2022-08-01T00:00:00Z",
  );

  viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      0.5,
      -0.2,
      tileset.boundingSphere.radius * 4.0,
    ),
  );
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
