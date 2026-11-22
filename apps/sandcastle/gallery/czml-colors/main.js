import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Colors",
    version: "1.0",
  },
  {
    id: "rgba",
    name: "Rectangle with outline using RGBA Colors",
    rectangle: {
      coordinates: {
        wsenDegrees: [-120, 40, -110, 50],
      },
      fill: true,
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 100],
          },
        },
      },
      height: 0, // disables ground clamping, needed for outlines
      outline: true,
      outlineColor: {
        rgba: [0, 0, 0, 255],
      },
    },
  },
  {
    id: "rgbaf",
    name: "Rectangle using RGBAF Colors",
    rectangle: {
      coordinates: { wsenDegrees: [-100, 40, -90, 50] },
      fill: true,
      material: {
        solidColor: {
          color: {
            rgbaf: [1, 0, 0, 0.39],
          },
        },
      },
      height: 0, // disables ground clamping, needed for outlines
      outline: true,
      outlineColor: {
        rgba: [0, 0, 0, 255],
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
