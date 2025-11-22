import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(40866);
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
