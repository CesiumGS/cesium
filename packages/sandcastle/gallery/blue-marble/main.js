import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

// Blue Marble Next Generation July, 2004 imagery from NASA
const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.IonImageryProvider.fromAssetId(3845),
  ),
});
