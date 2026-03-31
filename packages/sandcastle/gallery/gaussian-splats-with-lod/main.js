import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

viewer.extend(Cesium.viewerCesium3DTilesInspectorMixin);

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-122.141186, 47.644605, 170.48),
  orientation: {
    heading: Cesium.Math.toRadians(100.0),
    pitch: Cesium.Math.toRadians(-25.0),
    roll: 0.0,
  },
});

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(4547222);
  viewer.scene.primitives.add(tileset);

  if (viewer.cesium3DTilesInspector?.viewModel?.tileset !== undefined) {
    viewer.cesium3DTilesInspector.viewModel.tileset = tileset;
  } else if (viewer.cesium3DTilesInspector?._viewModel) {
    viewer.cesium3DTilesInspector._viewModel._tileset = tileset;
  }
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
