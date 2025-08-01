import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "box",
    version: "1.0",
  },
  {
    id: "shape1",
    name: "Blue box",
    position: {
      cartographicDegrees: [-114.0, 40.0, 300000.0],
    },
    box: {
      dimensions: {
        cartesian: [400000.0, 300000.0, 500000.0],
      },
      material: {
        solidColor: {
          color: {
            rgba: [0, 0, 255, 255],
          },
        },
      },
    },
  },
  {
    id: "shape2",
    name: "Red box with black outline",
    position: {
      cartographicDegrees: [-107.0, 40.0, 300000.0],
    },
    box: {
      dimensions: {
        cartesian: [400000.0, 300000.0, 500000.0],
      },
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 128],
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
    id: "shape3",
    name: "Yellow box outline",
    position: {
      cartographicDegrees: [-100.0, 40.0, 300000.0],
    },
    box: {
      dimensions: {
        cartesian: [400000.0, 300000.0, 500000.0],
      },
      fill: false,
      outline: true,
      outlineColor: {
        rgba: [255, 255, 0, 255],
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
