import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Position Definitions",
    version: "1.0",
  },
  {
    id: "point1",
    name: "point in cartographic degrees",
    position: {
      cartographicDegrees: [-111.0, 40.0, 150000.0],
    },
    point: {
      color: {
        rgba: [100, 0, 200, 255],
      },
      outlineColor: {
        rgba: [200, 0, 200, 255],
      },
      pixelSize: {
        number: 10,
      },
    },
  },
  {
    id: "point2",
    name: "point in cartesian coordinates",
    position: {
      cartesian: [1216469.9357990976, -4736121.71856379, 4081386.8856866374],
    },
    point: {
      color: {
        rgba: [0, 100, 200, 255],
      },
      outlineColor: {
        rgba: [200, 0, 200, 255],
      },
      pixelSize: {
        number: 10,
      },
    },
  },
  {
    id: "point 3",
    name: "point in cartographic radians",
    position: {
      cartographicRadians: [Math.PI, (3 * Math.PI) / 4, 150000],
    },
    point: {
      color: {
        rgba: [10, 200, 10, 255],
      },
      outlineColor: {
        rgba: [200, 0, 200, 255],
      },
      pixelSize: {
        number: 10,
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.dataSources.add(Cesium.CzmlDataSource.load(czml));
