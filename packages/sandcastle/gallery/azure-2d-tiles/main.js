import * as Cesium from "cesium";

Cesium.Ion.defaultServer = "https://api.ion-staging.cesium.com";
Cesium.Ion.defaultAccessToken = "";

const assetId = 1683;

const azure = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(assetId),
);

const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  baseLayer: false,
  baseLayerPicker: false,
  geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
  timeline: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  homeButton: false,
  terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1),
});
viewer.geocoder.viewModel.keepExpanded = true;

viewer.imageryLayers.add(azure);

viewer.scene.camera.flyTo({
  duration: 0,
  destination: new Cesium.Rectangle.fromDegrees(
    //Philly
    -75.280266,
    39.867004,
    -74.955763,
    40.137992,
  ),
});
