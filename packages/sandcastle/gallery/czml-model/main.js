import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Model",
    version: "1.0",
  },
  {
    id: "aircraft model",
    name: "Cesium Air",
    position: {
      cartographicDegrees: [-77, 37, 10000],
    },
    model: {
      gltf: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
      scale: 2.0,
      minimumPixelSize: 128,
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
    viewer.trackedEntity = dataSource.entities.getById("aircraft model");
  })
  .catch(function (error) {
    window.alert(error);
  });
