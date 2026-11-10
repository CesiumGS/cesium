import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Point",
    version: "1.0",
  },
  {
    id: "point 1",
    name: "point",
    position: {
      cartographicDegrees: [-111.0, 40.0, 0],
    },
    point: {
      color: {
        rgba: [255, 255, 255, 255],
      },
      outlineColor: {
        rgba: [255, 0, 0, 255],
      },
      outlineWidth: 4,
      pixelSize: 20,
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
