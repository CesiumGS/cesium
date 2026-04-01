import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const center = Cesium.Cartesian3.fromDegrees(-122.141186, 47.644605, 170.48);
const offset = new Cesium.HeadingPitchRange(
  100.0,
  Cesium.Math.toRadians(-25.0),
  100.0,
);
viewer.camera.lookAt(center, offset);

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4547222);
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
