import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.scene.debugShowFramesPerSecond = true;

function createCirclePoints(centerLon, centerLat, radius, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const a = i / numPoints;
    const lon = centerLon + Math.sin(a * Math.PI * 2) * radius;
    const lat = centerLat + Math.cos(a * Math.PI * 2) * radius;
    points.push([lon, lat]);
  }
  return points;
}

function createTestData(points) {
  const testData = {
    type: "FeatureCollection",
    name: "test",
    crs: {
      type: "name",
      properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
    },
    features: [
      {
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: [[points]],
        },
      },
    ],
  };
  return testData;
}

const currentDataSources = [];
let currentDataSourceShape;

async function updateClippingPolygons(numPolygons, numPoints) {
  console.log(
    `Update with numPolygons=${numPolygons} and numPoints=${numPoints}`,
  );

  for (let i = 0; i < currentDataSources.length; i++) {
    viewer.dataSources.remove(currentDataSources[i]);
  }
  currentDataSources.length = 0;
  const clippingPolygonsArray = [];

  const gridSize = Math.floor(Math.sqrt(numPolygons));
  for (let i = 0; i < numPolygons; i++) {
    const gx = Math.floor(i / gridSize);
    const gy = i % gridSize;
    const points = createCirclePoints(
      -75.152408 + gx * 0.21,
      39.946975 + gy * 0.21,
      0.1,
      numPoints,
    );
    const dataSource = await Cesium.GeoJsonDataSource.load(
      createTestData(points),
    );
    viewer.dataSources.add(dataSource);
    currentDataSources.push(dataSource);

    currentDataSourceShape = currentDataSources[i].entities.values.find(
      (entity) => Cesium.defined(entity.polygon),
    );
    const positions =
      currentDataSourceShape.polygon.hierarchy.getValue().positions;
    clippingPolygonsArray.push(
      new Cesium.ClippingPolygon({
        positions: positions,
      }),
    );
  }
  const clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons: clippingPolygonsArray,
  });
  viewer.scene.globe.clippingPolygons = clippingPolygons;
}

await updateClippingPolygons(2, 16);

const cameraOffset = new Cesium.HeadingPitchRange(
  Cesium.Math.toRadians(0.0),
  Cesium.Math.toRadians(-45.0),
  50000.0,
);
viewer.zoomTo(currentDataSourceShape, cameraOffset);

const viewModel = {
  numPolygons: 2.0,
  numPoints: 16.0,
};

async function updateModelFromView() {
  const numPolygons = Number(viewModel.numPolygons);
  const numPoints = Number(viewModel.numPoints);
  await updateClippingPolygons(numPolygons, numPoints);
}

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Sandcastle.addToolbarButton("Update ClippingPolygons", updateModelFromView);
