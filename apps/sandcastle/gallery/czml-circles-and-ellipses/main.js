import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Geometries: Circles and Ellipses",
    version: "1.0",
  },
  {
    id: "shape1",
    name: "Green circle at height",
    position: {
      cartographicDegrees: [-111.0, 40.0, 150000.0],
    },
    ellipse: {
      semiMinorAxis: 300000.0,
      semiMajorAxis: 300000.0,
      height: 200000.0,
      material: {
        solidColor: {
          color: {
            rgba: [0, 255, 0, 255],
          },
        },
      },
    },
  },
  {
    id: "shape2",
    name: "Red ellipse with white outline on surface",
    position: {
      cartographicDegrees: [-103.0, 40.0, 0],
    },
    ellipse: {
      semiMinorAxis: 250000.0,
      semiMajorAxis: 400000.0,
      height: 0,
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 127],
          },
        },
      },
      outline: true, // height must be set for outlines to display
      outlineColor: {
        rgba: [255, 255, 255, 255],
      },
    },
  },
  {
    id: "shape3",
    name: "Blue translucent, rotated, and extruded ellipse with outline",
    position: {
      cartographicDegrees: [-95.0, 40.0, 100000.0],
    },
    ellipse: {
      semiMinorAxis: 150000.0,
      semiMajorAxis: 300000.0,
      extrudedHeight: 200000.0,
      rotation: 0.78539,
      material: {
        solidColor: {
          color: {
            rgba: [0, 0, 255, 127],
          },
        },
      },
      outline: true,
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
