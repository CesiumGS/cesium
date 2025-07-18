import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: Cesium.ImageryLayer.fromWorldImagery({
    style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
  }),
  baseLayerPicker: false,
});
const layers = viewer.scene.imageryLayers;

const blackMarble = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.IonImageryProvider.fromAssetId(3812),
);
blackMarble.alpha = 0.5;
blackMarble.brightness = 2.0;
layers.add(blackMarble);

const cesiumLogo = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.SingleTileImageryProvider.fromUrl(
    "../images/Cesium_Logo_overlay.png",
    {
      rectangle: Cesium.Rectangle.fromDegrees(-75.0, 28.0, -67.0, 29.75),
    },
  ),
);
layers.add(cesiumLogo);
