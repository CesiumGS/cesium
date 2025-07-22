import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Model",
    version: "1.0",
    clock: {
      interval: "2019-06-01T16:00:00Z/2019-06-01T16:10:00Z",
      currentTime: "2019-06-01T16:00:00Z",
      multiplier: 60,
      range: "LOOP_STOP",
      step: "SYSTEM_CLOCK_MULTIPLIER",
    },
  },
  {
    id: "test model",
    name: "Cesium Air",
    position: {
      cartographicDegrees: [-77, 37, 10000],
    },
    model: {
      gltf: "https://cesium.com/public/SandcastleSampleData/launchvehicle.glb",
      scale: 2.0,
      minimumPixelSize: 128,
      runAnimations: false,
      articulations: {
        "Fairing Open": {
          epoch: "2019-06-01T16:00:00Z",
          number: [0, 0, 600, 120],
        },
        "Fairing Separate": {
          epoch: "2019-06-01T16:00:00Z",
          number: [0, 0, 400, -50],
        },
        "Fairing Drop": {
          epoch: "2019-06-01T16:00:00Z",
          interpolationAlgorithm: "LAGRANGE",
          interpolationDegree: 2,
          number: [0, 0, 80, 0, 100, 0, 120, -1, 600, -120],
        },
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const dataSourcePromise = viewer.dataSources.add(
  Cesium.CzmlDataSource.load(czml),
);

dataSourcePromise
  .then(function (dataSource) {
    viewer.trackedEntity = dataSource.entities.getById("test model");
  })
  .catch(function (error) {
    console.error(error);
  });
