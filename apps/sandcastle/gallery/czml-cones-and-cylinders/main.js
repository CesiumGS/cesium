import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Geometries: Cones and Cylinders",
    version: "1.0",
  },
  {
    id: "shape1",
    name: "Green cylinder with black outline",
    position: {
      cartographicDegrees: [-100.0, 40.0, 200000.0],
    },
    cylinder: {
      length: 400000.0,
      topRadius: 200000.0,
      bottomRadius: 200000.0,
      material: {
        solidColor: {
          color: {
            rgba: [0, 255, 0, 128],
          },
        },
      },
      outline: true,
      outlineColor: {
        rgba: [0, 0, 0, 255],
      },
    },
  },
  {
    id: "shape2",
    name: "Red cone",
    position: {
      cartographicDegrees: [-105.0, 40.0, 200000.0],
    },
    cylinder: {
      length: 400000.0,
      topRadius: 0.0,
      bottomRadius: 200000.0,
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 255],
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
