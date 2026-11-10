import * as Cesium from "cesium";

/* eslint-disable no-unused-vars */

// This is an example of using Cesium "Offline", meaning disconnected from the
// external Internet.  It must still be served from a local web server, but
// does not rely on any outside resources or services.  For more info, see:
// https://github.com/CesiumGS/cesium/tree/main/Documentation/OfflineGuide

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromProviderAsync(
    Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
    ),
  ),
  baseLayerPicker: false,
  geocoder: false,
});
