import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

// Natural Earth II with Shaded Relief, Water, and Drainages from http://www.naturalearthdata.com
const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.IonImageryProvider.fromAssetId(3813),
  ),
});
