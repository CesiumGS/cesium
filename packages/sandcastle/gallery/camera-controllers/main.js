import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.scene.camera.flyTo({
  duration: 0,
  destination: new Cesium.Rectangle.fromDegrees(
    //Philly
    -75.280266,
    39.867004,
    -74.955763,
    40.137992,
  ),
});

viewer.scene.screenSpaceCameraController.enableInputs = false;

const canvas = viewer.canvas;
canvas.setAttribute("tabindex", "0"); // needed to put focus on the canvas
canvas.onclick = function () {
  canvas.focus();
};

const keyboardController = new Cesium.FirstPersonKeyboardController();
viewer.addController(keyboardController);

// const lookController = new Cesium.ScreenspaceCameraLookController();
// viewer.addController(lookController);

const panController = new Cesium.ScreenspaceMapCameraController();
viewer.addController(panController);

// const orbitController = new Cesium.OrbitCameraAnimationController();
// orbitController.target = new Cesium.Cartesian3.fromDegrees(35.358, 138.731); // Mt. Fuji
// viewer.addController(orbitController);