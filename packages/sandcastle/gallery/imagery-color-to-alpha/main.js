import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  geocoder: Cesium.IonGeocodeProviderType.BING,
});

const layers = viewer.scene.imageryLayers;

// Set oceans on Bing base layer to transparent
const baseLayer = layers.get(0);
baseLayer.colorToAlpha = new Cesium.Color(0.0, 0.016, 0.059);
baseLayer.colorToAlphaThreshold = 0.2;

// Add a bump layer with adjustable threshold
const singleTileLayer = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.SingleTileImageryProvider.fromUrl("../images/earthbump1k.jpg", {
    rectangle: Cesium.Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0),
  }),
);
layers.add(singleTileLayer);

singleTileLayer.colorToAlpha = new Cesium.Color(0.0, 0.0, 0.0, 1.0);
singleTileLayer.colorToAlphaThreshold = 0.1;

const viewModel = {
  threshold: singleTileLayer.colorToAlphaThreshold,
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "threshold")
  .subscribe(function (newValue) {
    singleTileLayer.colorToAlphaThreshold = parseFloat(viewModel.threshold);
  });
