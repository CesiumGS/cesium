import * as Cesium from "cesium";

const terrain = await Cesium.Terrain.fromWorldTerrain();
const viewer = new Cesium.Viewer("cesiumContainer", { terrain });

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5135767);
  viewer.scene.primitives.add(tileset);

  const tilesetVector = await Cesium.Cesium3DTileset.fromIonAssetId(5135764);
  viewer.scene.primitives.add(tilesetVector);

  tilesetVector.style = new Cesium.Cesium3DTileStyle({
    color: "color('cyan')",
    lineWidth: 3,
  });

  await viewer.zoomTo(tileset);

  // Apply the default style if it exists
  const extras = tileset.asset.extras;
  if (
    Cesium.defined(extras) &&
    Cesium.defined(extras.ion) &&
    Cesium.defined(extras.ion.defaultStyle)
  ) {
    tileset.style = new Cesium.Cesium3DTileStyle(extras.ion.defaultStyle);
  }
} catch (error) {
  console.log(error);
}
