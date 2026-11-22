import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Geometries: Spheres and Ellipsoids",
    version: "1.0",
  },
  {
    id: "blueEllipsoid",
    name: "blue ellipsoid",
    position: {
      cartographicDegrees: [-114.0, 40.0, 300000.0],
    },
    ellipsoid: {
      radii: {
        cartesian: [200000.0, 200000.0, 300000.0],
      },
      fill: true,
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
    id: "redSphere",
    name: "Red sphere with black outline",
    position: {
      cartographicDegrees: [-107.0, 40.0, 300000.0],
    },
    ellipsoid: {
      radii: {
        cartesian: [300000.0, 300000.0, 300000.0],
      },
      fill: true,
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 100],
          },
        },
      },
      outline: true,
      outlineColor: {
        rgbaf: [0, 0, 0, 1],
      },
    },
  },
  {
    id: "yellowEllipsoid",
    name: "ellipsoid with yellow outline",
    position: {
      cartographicDegrees: [-100.0, 40.0, 300000.0],
    },
    ellipsoid: {
      radii: {
        cartesian: [200000.0, 200000.0, 300000.0],
      },
      fill: false,
      outline: true,
      outlineColor: {
        rgba: [255, 255, 0, 255],
      },
      slicePartitions: 24,
      stackPartitions: 36,
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
