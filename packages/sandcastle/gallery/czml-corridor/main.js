import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Geometries: Polyline",
    version: "1.0",
  },
  {
    id: "redCorridor",
    name: "Red corridor on surface with rounded corners",
    corridor: {
      positions: {
        cartographicDegrees: [
          -100.0, 40.0, 0, -105.0, 40.0, 0, -105.0, 35.0, 0,
        ],
      },
      width: 200000.0,
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 127],
          },
        },
      },
    },
  },
  {
    id: "greenCorridor",
    name: "Green corridor at height with mitered corners and outline",
    corridor: {
      positions: {
        cartographicDegrees: [-90.0, 40.0, 0, -95.0, 40.0, 0, -95.0, 35.0, 0],
      },
      height: 100000.0,
      cornerType: "MITERED",
      width: 200000.0,
      material: {
        solidColor: {
          color: {
            rgba: [0, 255, 0, 255],
          },
        },
      },
      outline: true, // height must be set for outlines to display
      outlineColor: {
        rgba: [0, 0, 0, 255],
      },
    },
  },
  {
    id: "blueCorridor",
    name: "Blue extruded corridor with beveled corners and outline",
    corridor: {
      positions: {
        cartographicDegrees: [-80.0, 40.0, 0, -85.0, 40.0, 0, -85.0, 35.0, 0],
      },
      height: 200000.0,
      extrudedHeight: 100000.0,
      width: 200000.0,
      cornerType: "BEVELED",
      material: {
        solidColor: {
          color: {
            rgba: [0, 0, 255, 255],
          },
        },
      },
      outline: true,
      outlineColor: {
        rgba: [255, 255, 255, 255],
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
