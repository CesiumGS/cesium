import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Wall",
    version: "1.0",
  },
  {
    id: "wall",
    wall: {
      positions: {
        cartographicDegrees: [
          -115.0, 50.0, 1500000, -112.5, 50.0, 500000, -110.0, 50.0, 1500000,
          -107.5, 50.0, 500000, -105.0, 50.0, 1500000, -102.5, 50.0, 500000,
          -100.0, 50.0, 1500000, -97.5, 50.0, 500000, -95.0, 50.0, 1500000,
          -92.5, 50.0, 500000, -90.0, 50.0, 1500000,
        ],
      },
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 150],
          },
        },
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
