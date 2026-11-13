import * as Cesium from "cesium";

// 3 inch (0.08m) resolution imagery of Washington DC collected in 2017
const viewer = new Cesium.Viewer("cesiumContainer");

const imageryLayer = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(3827),
);

viewer.imageryLayers.add(imageryLayer);
viewer.zoomTo(imageryLayer);
