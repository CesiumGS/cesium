import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Model",
    version: "1.0",
    clock: {
      interval: "2015-01-01T12:00:00Z/2015-01-01T12:00:20Z",
      currentTime: "2015-01-01T12:00:00Z",
      multiplier: 20,
    },
  },
  {
    id: "model",
    position: {
      cartographicDegrees: [-77, 37, 100000],
    },
    viewFrom: {
      cartesian: [4.3, 0.1, 2.6],
    },
    model: {
      gltf: "../../SampleData/models/CesiumMan/Cesium_Man.glb",
      runAnimations: false,
      nodeTransformations: {
        Skeleton_arm_joint_L__3_: {
          rotation: {
            epoch: "2015-01-01T12:00:00Z",
            unitQuaternion: [
              0, -0.23381920887303329, -0.6909886782144156, -0.0938384854833712,
              0.6775378681547408, 10, -0.4924076887347565, -0.6304934596091216,
              0.20657864059632378, 0.563327551886459, 20, -0.23381920887303329,
              -0.6909886782144156, -0.0938384854833712, 0.6775378681547408,
            ],
          },
        },
        Skeleton_arm_joint_R__2_: {
          rotation: {
            unitQuaternion: [
              -0.2840422631464792, -0.40211904424847345,
              // eslint-disable-next-line no-loss-of-precision
              0.25175867757399086, 0.7063888981321548,
            ],
          },
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
    viewer.trackedEntity = dataSource.entities.getById("model");
  })
  .catch(function (error) {
    window.alert(error);
  });
