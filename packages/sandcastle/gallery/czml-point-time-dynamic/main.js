import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Point - Time Dynamic",
    version: "1.0",
  },
  {
    id: "point",
    availability: "2012-08-04T16:00:00Z/2012-08-04T16:05:00Z",
    position: {
      epoch: "2012-08-04T16:00:00Z",
      cartographicDegrees: [
        0, -70, 20, 150000, 100, -80, 44, 150000, 200, -90, 18, 150000, 300,
        -98, 52, 150000,
      ],
    },
    point: {
      color: {
        rgba: [255, 255, 255, 128],
      },
      outlineColor: {
        rgba: [255, 0, 0, 128],
      },
      outlineWidth: 3,
      pixelSize: 15,
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

viewer.dataSources.add(Cesium.CzmlDataSource.load(czml));
