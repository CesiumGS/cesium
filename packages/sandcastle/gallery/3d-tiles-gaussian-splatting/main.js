import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(3667783);
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0.0),
      Cesium.Math.toRadians(-15.0),
      200.0,
    ),
  );
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
