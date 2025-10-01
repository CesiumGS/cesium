import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

Cesium.Ion.defaultServer = "https://api.ion-staging.cesium.com";
Cesium.Ion.defaultAccessToken = "";

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

const menuOptions = [];

const dropdownOptions = [
  { label: "Google Maps 2D Contour", assetId: 1689 },
  { label: "Google Maps 2D Labels Only", assetId: 1688 },
  { label: "Google Maps 2D Roadmap", assetId: 1687 },
  { label: "Google Maps 2D Satellite", assetId: 1685 },
  { label: "Google Maps 2D Satellite with Labels", assetId: 1686 },
  { label: "Bing Maps Aerial", assetId: 2 },
  { label: "Bing Maps Aerial with Labels", assetId: 23 },
  { label: "Bing Maps Labels Only", assetId: 1046 },
];

function showLayer(assetId) {
  viewer.imageryLayers.removeAll(true);
  const layer = Cesium.ImageryLayer.fromProviderAsync(
    Cesium.IonImageryProvider.fromAssetId(assetId),
  );
  viewer.imageryLayers.add(layer);
}

dropdownOptions.forEach((opt) => {
  const option = {
    text: opt.label,
    onselect: function () {
      showLayer(opt.assetId);
    },
  };
  menuOptions.push(option);
});

Sandcastle.addToolbarMenu(menuOptions);

showLayer(1687);

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
