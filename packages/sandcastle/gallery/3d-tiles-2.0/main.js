import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
});

const snowden1 = "../../SampleData/Cesium3DTiles/snowden/tileset.json";
const snowden2 =
  "../../SampleData/Cesium3DTiles/gltf-2.1/snowden/root.tileset.gltf";

try {
  const left = await Cesium.Cesium3DTileset.fromUrl(snowden1);
  viewer.scene.primitives.add(left);
  left.splitDirection = Cesium.SplitDirection.LEFT;

  viewer.zoomTo(left);

  const right = await Cesium.Cesium3DTileset.fromGltf(snowden2);
  viewer.scene.primitives.add(right);
  right.splitDirection = Cesium.SplitDirection.RIGHT;
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

// Sync the position of the slider with the split position
const slider = document.getElementById("slider");
viewer.scene.splitPosition =
  slider.offsetLeft / slider.parentElement.offsetWidth;

const handler = new Cesium.ScreenSpaceEventHandler(slider);

let moveActive = false;

function move(movement) {
  if (!moveActive) {
    return;
  }

  const relativeOffset = movement.endPosition.x;
  const splitPosition =
    (slider.offsetLeft + relativeOffset) / slider.parentElement.offsetWidth;
  slider.style.left = `${100.0 * splitPosition}%`;
  viewer.scene.splitPosition = splitPosition;
}

handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);
handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.PINCH_START);

handler.setInputAction(move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
handler.setInputAction(move, Cesium.ScreenSpaceEventType.PINCH_MOVE);

handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.LEFT_UP);
handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.PINCH_END);
