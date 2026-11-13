import * as Cesium from "cesium";

//Point Cloud by Prof. Peter Allen, Columbia University Robotics Lab. Scanning by Alejandro Troccoli and Matei Ciocarlie.
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    4401744.644145314,
    225051.41078911052,
    4595420.374784433,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    5.646733805039757,
    -0.276607153839886,
    6.281110875400085,
  ),
});

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(16421);
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
