import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Geometries: Polygon",
    version: "1.0",
  },
  {
    id: "redPolygon",
    name: "Red polygon on surface",
    polygon: {
      positions: {
        cartographicDegrees: [
          -115.0, 37.0, 0, -115.0, 32.0, 0, -107.0, 33.0, 0, -102.0, 31.0, 0,
          -102.0, 35.0, 0,
        ],
      },
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 255],
          },
        },
      },
    },
  },
  {
    id: "checkerboardPolygon",
    name: "Checkerboard polygon on surface",
    polygon: {
      positions: {
        cartographicDegrees: [-94.0, 37.0, 0, -95.0, 32.0, 0, -87.0, 33.0, 0],
      },
      material: {
        checkerboard: {
          evenColor: {
            rgba: [255, 0, 0, 255],
          },
          oddColor: {
            rgba: [0, 128, 128, 255],
          },
        },
      },
    },
  },
  {
    id: "greenPolygon",
    name: "Green extruded polygon",
    polygon: {
      positions: {
        cartographicDegrees: [
          -108.0, 42.0, 0, -100.0, 42.0, 0, -104.0, 40.0, 0,
        ],
      },
      material: {
        solidColor: {
          color: {
            rgba: [0, 255, 0, 255],
          },
        },
      },
      extrudedHeight: 500000.0,
      closeTop: false,
      closeBottom: false,
    },
  },
  {
    id: "orangePolygon",
    name: "Orange polygon with per-position heights and outline",
    polygon: {
      positions: {
        cartographicDegrees: [
          -108.0, 25.0, 100000, -100.0, 25.0, 100000, -100.0, 30.0, 100000,
          -108.0, 30.0, 300000,
        ],
      },
      material: {
        solidColor: {
          color: {
            rgba: [255, 100, 0, 100],
          },
        },
      },
      extrudedHeight: 0,
      perPositionHeight: true,
      outline: true,
      outlineColor: {
        rgba: [0, 0, 0, 255],
      },
    },
  },
  {
    id: "bluePolygonWithHoles",
    name: "Blue polygon with holes",
    polygon: {
      positions: {
        cartographicDegrees: [
          -82.0, 40.8, 0, -83.0, 36.5, 0, -76.0, 35.6, 0, -73.5, 43.6, 0,
        ],
      },
      holes: {
        cartographicDegrees: [
          [-81.0, 40.0, 0, -81.0, 38.2, 0, -79.0, 38.2, 0, -78.0, 40.8, 0],
          [-77.5, 36.7, 0, -78.5, 37.0, 0, -76.5, 39.6, 0],
        ],
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
];

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
