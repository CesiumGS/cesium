import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.ArcGisMapServerImageryProvider.fromUrl(
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
    ),
  ),
  baseLayerPicker: false,
  infoBox: false,
  geocoder: false,
});

const layers = viewer.imageryLayers;
const earthAtNight = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(3812),
);
earthAtNight.splitDirection = Cesium.SplitDirection.LEFT; // Only show to the left of the slider.
layers.add(earthAtNight);

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
