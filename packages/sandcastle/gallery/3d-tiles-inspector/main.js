import * as Cesium from "cesium";

// Building data courtesy of NYC OpenData portal: http://www1.nyc.gov/site/doitt/initiatives/3d-building.page
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

viewer.scene.globe.depthTestAgainstTerrain = true;

viewer.extend(Cesium.viewerCesium3DTilesInspectorMixin);

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(75343, {
    enableDebugWireframe: true,
  });
  viewer.scene.primitives.add(tileset);
  tileset.debugColorizeTiles = true;

  viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      0.0,
      -0.5,
      tileset.boundingSphere.radius / 4.0,
    ),
  );
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
