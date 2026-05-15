import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  sceneModePicker: false,
});

const center = Cesium.Cartesian3.fromDegrees(
  -122.13810992689156,
  47.644519699638366,
  120,
);
const boundingSphere = new Cesium.BoundingSphere(center, 50.0);
const offset = new Cesium.HeadingPitchRange(
  Cesium.Math.toRadians(100.0),
  Cesium.Math.toRadians(-25.0),
  500.0,
);
viewer.camera.viewBoundingSphere(boundingSphere, offset);

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4547222);
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

Sandcastle.addToolbarButton("Next view →", function () {
  // Increment the camera offset parameters and fly to the new angle
  offset.heading -= 100;
  offset.pitch = Cesium.Math.toRadians(-25.0);
  offset.range -= 100;

  if (offset.range <= 0) {
    offset.range = 500;
  }

  viewer.camera.flyToBoundingSphere(boundingSphere, { offset });
});
