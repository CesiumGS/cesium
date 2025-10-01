import * as Cesium from "cesium";

const assetId = 3830184;

const base = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.Google2DImageryProvider.fromIonAssetId({
    assetId,
    mapType: "satellite",
  }),
);

const overlay = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.Google2DImageryProvider.fromIonAssetId({
    assetId,
    overlayLayerType: "layerRoadmap",
    styles: [
      {
        stylers: [{ hue: "#00ffe6" }, { saturation: -20 }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ lightness: 100 }, { visibility: "simplified" }],
      },
    ],
  }),
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

viewer.imageryLayers.add(base);
viewer.imageryLayers.add(overlay);

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
