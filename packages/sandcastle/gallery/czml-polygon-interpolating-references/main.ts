import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Polygon - Interpolating References",
    version: "1.0",
  },
  {
    id: "dynamicPolygon",
    name: "Dynamic Polygon with Reference Properties",
    availability: "2012-08-04T16:00:00Z/2012-08-04T17:00:00Z",
    polygon: {
      positions: {
        references: ["v1#position", "v2#position", "v3#position"],
      },
      perPositionHeight: true,
      material: {
        solidColor: {
          color: [
            {
              interval: "2012-08-04T16:00:00Z/2012-08-04T16:25:00Z",
              rgbaf: [1, 0, 1, 1],
            },
            {
              interval: "2012-08-04T16:30:00Z/2012-08-04T17:00:00Z",
              rgbaf: [0, 1, 1, 1],
            },
          ],
        },
      },
    },
  },
  {
    id: "v1",
    position: {
      interpolationAlgorithm: "LINEAR",
      interpolationDegree: 1,
      interval: "2012-08-04T16:00:00Z/2012-08-04T17:00:00Z",
      epoch: "2012-08-04T16:00:00Z",
      cartographicDegrees: [
        0, -60, 35, 30000, 160, -65, 35, 5000000, 400, -70, 40, 20000, 800, -62,
        45, 200000, 1800, -65, 40, 650000, 3600, -60, 35, 3000,
      ],
    },
  },
  {
    id: "v2",
    position: {
      interval: "2012-08-04T16:00:00Z/2012-08-04T17:00:00Z",
      cartographicDegrees: [-45.0, 20, 4000000],
    },
  },
  {
    id: "v3",
    position: {
      interpolationAlgorithm: "LINEAR",
      interpolationDegree: 1,
      interval: "2012-08-04T16:00:00Z/2012-08-04T17:00:00Z",
      epoch: "2012-08-04T16:00:00Z",
      cartographicDegrees: [
        0, -45, 60, 4000, 400, -40, 70, 2000000, 1000, -35, 75, 100000, 3600,
        -45, 65, 3000,
      ],
    },
  },
  {
    id: "Polygon with Dynamic Holes",
    polygon: {
      positions: {
        cartographicDegrees: [-110, 43, 0, -90, 43, 0, -90, 30, 0, -110, 30, 0],
      },
      holes: {
        references: [
          ["target4#position", "target5#position", "target6#position"],
        ],
      },
      material: {
        solidColor: {
          color: {
            rgba: [255, 150, 0, 255],
          },
        },
      },
    },
  },
  {
    id: "target4",
    position: {
      interpolationAlgorithm: "LINEAR",
      interpolationDegree: 1,
      interval: "2012-08-04T16:00:00Z/2012-08-04T17:00:00Z",
      epoch: "2012-08-04T16:00:00Z",
      cartographicDegrees: [0, -100, 41, 0, 3600, -95, 41, 0],
    },
  },
  {
    id: "target5",
    position: {
      interpolationAlgorithm: "LINEAR",
      interpolationDegree: 1,
      interval: "2012-08-04T16:00:00Z/2012-08-04T17:00:00Z",
      epoch: "2012-08-04T16:00:00Z",
      cartographicDegrees: [0, -92, 42, 0, 3600, -92, 36, 0],
    },
  },
  {
    id: "target6",
    position: {
      interpolationAlgorithm: "LINEAR",
      interpolationDegree: 1,
      interval: "2012-08-04T16:00:00Z/2012-08-04T17:00:00Z",
      epoch: "2012-08-04T16:00:00Z",
      cartographicDegrees: [0, -95, 37, 0, 3600, -108, 38, 0],
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

viewer.dataSources.add(Cesium.CzmlDataSource.load(czml));
