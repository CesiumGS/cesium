import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    1331419.302230775,
    -4656681.5022043325,
    4136232.6465900405,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    6.032455545102689,
    -0.056832496140112765,
    6.282360923090216,
  ),
  endTransform: Cesium.Matrix4.IDENTITY,
});

viewer.scene.postProcessStages.fxaa.enabled = true;

Sandcastle.addToggleButton("FXAA", true, function (checked) {
  viewer.scene.postProcessStages.fxaa.enabled = checked;
});

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(75343);
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
