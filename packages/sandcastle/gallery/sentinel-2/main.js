import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

// Sentinel-2 (mostly) cloudless global imagery between 10 and 60 meter resolution.
const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.IonImageryProvider.fromAssetId(3954),
  ),
});
