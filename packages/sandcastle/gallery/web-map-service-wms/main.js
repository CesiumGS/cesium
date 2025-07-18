import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

// Add a WMS imagery layer
const layer = new Cesium.ImageryLayer(
  new Cesium.WebMapServiceImageryProvider({
    url: "https://services.ga.gov.au/gis/services/NM_Hydrology_and_Marine_Points/MapServer/WMSServer",
    layers: "Bores",
    parameters: {
      transparent: true,
      format: "image/png",
    },
  }),
);
viewer.imageryLayers.add(layer);

// Start off looking at Australia.
viewer.camera.setView({
  destination: Cesium.Rectangle.fromDegrees(114.591, -45.837, 148.97, -5.73),
});
