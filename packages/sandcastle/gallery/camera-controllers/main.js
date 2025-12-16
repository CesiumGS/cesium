import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

const canvas = viewer.canvas;
canvas.setAttribute("tabindex", "0"); // needed to put focus on the canvas
canvas.onclick = function () {
  canvas.focus();
};

const keyboardController = new Cesium.FirstPersonKeyboardController();
viewer.addController(keyboardController);

// const orbitController = new Cesium.OrbitCameraAnimationController();
// orbitController.target = new Cesium.Cartesian3.fromDegrees(35.358, 138.731); // Mt. Fuji
// viewer.addController(orbitController);