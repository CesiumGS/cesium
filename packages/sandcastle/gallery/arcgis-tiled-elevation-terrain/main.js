import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

try {
  viewer.scene.terrainProvider =
    await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
      "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
    );
} catch (error) {
  window.alert(`Failed to load terrain. ${error}`);
}
