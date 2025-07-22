import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayerPicker: false,
});

try {
  const geeMetadata = await Cesium.GoogleEarthEnterpriseMetadata.fromUrl(
    new Cesium.Resource({
      url: "http://www.earthenterprise.org/3d",
      proxy: new Cesium.DefaultProxy("/proxy/"),
    }),
  );

  viewer.scene.terrainProvider =
    Cesium.GoogleEarthEnterpriseTerrainProvider.fromMetadata(geeMetadata);

  const layers = viewer.scene.imageryLayers;
  const blackMarble = new Cesium.ImageryLayer(
    new Cesium.GoogleEarthEnterpriseImageryProvider({
      metadata: geeMetadata,
    }),
  );
  layers.add(blackMarble);
} catch (error) {
  console.log(`Failed to create Google Earth providers from metadata. Confirm GEE service is correctly configured.
          ${error}`);
}

// Start off looking at San Francisco.
viewer.camera.setView({
  destination: Cesium.Rectangle.fromDegrees(-123.0, 36.0, -121.7, 39.0),
});
