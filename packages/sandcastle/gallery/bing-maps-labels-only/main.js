import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// This example showcases the ability to overlay labels
// on top of unlabeled imagery.
//
// On the left side is Bing Maps Aerial With Labels + unlabeled high
// resolution Washington DC imagery. The labels are obscured by the
// DC imagery and can not be turned on or off independently.
//
// On the right side is Bing Maps Aerial + unlabeled high resolution
// Washington DC imagery + Bing Maps Labels Only. The labels
// are now on top of all imagery in the scene and can be independently
// shown or hidden based on app configuration and/or camera zoom level.

// For this demo, start with all imagery disabled.
const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: false,
  baseLayerPicker: false,
  infoBox: false,
  geocoder: Cesium.IonGeocodeProviderType.BING,
});

const layers = viewer.imageryLayers;

// Add Bing Maps Aerial with Labels to the left panel
const bingMapsAerialWithLabels = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(3),
);
bingMapsAerialWithLabels.splitDirection = Cesium.SplitDirection.LEFT;
layers.add(bingMapsAerialWithLabels);

// Add Bing Maps Aerial (unlabeled) to the right panel
const bingMapsAerial = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(2),
);
bingMapsAerial.splitDirection = Cesium.SplitDirection.RIGHT;
layers.add(bingMapsAerial);

// Add high resolution Washington DC imagery to both panels.
const imageryLayer = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(3827),
);
viewer.imageryLayers.add(imageryLayer);

// Add Bing Maps Labels Only to the right panel
const bingMapsLabelsOnly = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(2411391),
);
bingMapsLabelsOnly.splitDirection = Cesium.SplitDirection.RIGHT; // Only show to the left of the slider.
layers.add(bingMapsLabelsOnly);

// Zoom to the Washington DC imagery
viewer.zoomTo(imageryLayer);

// Add a button to toggle the display of the Bing Maps Labels Only layer
Sandcastle.addToggleButton("Show Bing Maps Labels Only", true, (checked) => {
  bingMapsLabelsOnly.show = checked;
  const rightLabel = document.querySelector(".split-label.right");
  if (checked) {
    rightLabel.innerHTML =
      "Bing Maps (unlabeled)<br />+<br />Washington Imagery<br />+<br />Bing Maps (labels only)";
  } else {
    rightLabel.innerHTML =
      "Bing Maps (unlabeled)<br />+<br />Washington Imagery";
  }
});

// The remaining code synchronizes the position of the slider with the split position
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
