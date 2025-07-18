import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Geometries: Polyline",
    version: "1.0",
  },
  {
    id: "redLine",
    name: "Red line clamped to terain",
    polyline: {
      positions: {
        cartographicDegrees: [-75, 35, 0, -125, 35, 0],
      },
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 255],
          },
        },
      },
      width: 5,
      clampToGround: true,
    },
  },
  {
    id: "blueLine",
    name: "Glowing blue line on the surface",
    polyline: {
      positions: {
        cartographicDegrees: [-75, 37, 0, -125, 37, 0],
      },
      material: {
        polylineGlow: {
          color: {
            rgba: [100, 149, 237, 255],
          },
          glowPower: 0.2,
          taperPower: 0.5,
        },
      },
      width: 10,
    },
  },
  {
    id: "orangeLine",
    name: "Orange line with black outline at height and following the surface",
    polyline: {
      positions: {
        cartographicDegrees: [-75, 39, 250000, -125, 39, 250000],
      },
      material: {
        polylineOutline: {
          color: {
            rgba: [255, 165, 0, 255],
          },
          outlineColor: {
            rgba: [0, 0, 0, 255],
          },
          outlineWidth: 2,
        },
      },
      width: 5,
    },
  },
  {
    id: "purpleLine",
    name: "Purple arrow at height",
    polyline: {
      positions: {
        cartographicDegrees: [-75, 43, 500000, -125, 43, 500000],
      },
      material: {
        polylineArrow: {
          color: {
            rgba: [148, 0, 211, 255],
          },
        },
      },
      arcType: "NONE",
      width: 10,
    },
  },
  {
    id: "dashedLine",
    name: "Blue dashed line",
    polyline: {
      positions: {
        cartographicDegrees: [-75, 45, 500000, -125, 45, 500000],
      },
      material: {
        polylineDash: {
          color: {
            rgba: [0, 255, 255, 255],
          },
        },
      },
      width: 4,
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
