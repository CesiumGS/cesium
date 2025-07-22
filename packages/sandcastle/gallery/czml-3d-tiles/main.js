import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    version: "1.0",
  },
  {
    id: "BatchedColors",
    name: "BatchedColors",
    tileset: {
      uri: "../../SampleData/Cesium3DTiles/Batched/BatchedColors/tileset.json",
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
    viewer.zoomTo(dataSource.entities.getById("BatchedColors"));
  })
  .catch(function (error) {
    window.alert(error);
  });
