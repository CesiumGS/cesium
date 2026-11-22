import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

// To geographically place an HTML element on top of the Cesium canvas, we use
// scene.cartesianToCanvasCoordinates to map a world position to canvas x and y values.
// This example places and img element, but any element will work.

const htmlOverlay = document.getElementById("htmlOverlay");
const scratch = new Cesium.Cartesian2();
viewer.scene.preRender.addEventListener(function () {
  const position = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
  const canvasPosition = viewer.scene.cartesianToCanvasCoordinates(
    position,
    scratch,
  );
  if (Cesium.defined(canvasPosition)) {
    htmlOverlay.style.top = `${canvasPosition.y}px`;
    htmlOverlay.style.left = `${canvasPosition.x}px`;
  }
});
