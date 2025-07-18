import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// The Earth at Night, also known as Black Marble 2017 and Night Lights
const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: new Cesium.ImageryLayer.fromProviderAsync(
    Cesium.IonImageryProvider.fromAssetId(3812),
  ),
});

// The rest of the code is for dynamic lighting
const dynamicLighting = false;

viewer.clock.multiplier = 4000;

const imageryLayers = viewer.imageryLayers;
const nightLayer = imageryLayers.get(0);
const dayLayer = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(3845),
);
imageryLayers.add(dayLayer);
imageryLayers.lowerToBottom(dayLayer);

function updateLighting(dynamicLighting) {
  dayLayer.show = dynamicLighting;
  viewer.scene.globe.enableLighting = dynamicLighting;
  viewer.clock.shouldAnimate = dynamicLighting;

  // If dynamic lighting is enabled, make the night imagery invisible
  // on the lit side of the globe.
  nightLayer.dayAlpha = dynamicLighting ? 0.0 : 1.0;
}

updateLighting(dynamicLighting);

Sandcastle.addToggleButton(
  "Dynamic lighting",
  dynamicLighting,
  function (checked) {
    updateLighting(checked);
  },
);
