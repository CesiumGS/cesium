import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

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
  { label: "Google Maps 2D Contour", assetId: 3830186 },
  { label: "Google Maps 2D Labels Only", assetId: 3830185 },
  { label: "Google Maps 2D Roadmap", assetId: 3830184 },
  { label: "Google Maps 2D Satellite", assetId: 3830182 },
  { label: "Google Maps 2D Satellite with Labels", assetId: 3830183 },
  { label: "Azure Maps Aerial", assetId: 3891168 },
  { label: "Azure Maps Roads", assetId: 3891169 },
  { label: "Azure Maps Labels Only", assetId: 3891170 },
  { label: "Sentinel-2", assetId: 3954 },
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

showLayer(3830186);

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
