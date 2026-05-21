import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
});

viewer.scene.debugShowFramesPerSecond = true;

let worldTileset;
try {
  worldTileset = await Cesium.createGooglePhotorealistic3DTileset({
    onlyUsingWithGoogleGeocoder: true,
  });
  worldTileset.show = false;
  viewer.scene.primitives.add(worldTileset);
} catch (error) {
  console.log(`Error loading Photorealistic 3D Tiles tileset. ${error}`);
}

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
let debug = false;
let shapes = true;

async function updateClippingPolygons(
  numPolygons,
  numPoints,
  spacing,
  scale,
  quality,
) {
  console.log(
    `Update with numPolygons=${numPolygons} and numPoints=${numPoints} and spacing=${spacing} and quality=${quality}`,
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
      -75.152408 + gx * spacing,
      39.946975 + gy * spacing,
      0.1 * Math.pow(scale, i),
      numPoints,
    );
    const dataSource = await Cesium.GeoJsonDataSource.load(
      createTestData(points),
    );
    if (shapes) {
      viewer.dataSources.add(dataSource);
    }
    currentDataSources.push(dataSource);

    currentDataSourceShape = currentDataSources[i].entities.values.find(
      (entity) => Cesium.defined(entity.polygon),
    );
    const positions =
      currentDataSourceShape.polygon.hierarchy.getValue().positions;
    clippingPolygonsArray.push(
      new Cesium.ClippingPolygon({
        positions: positions,
        immutable: true,
      }),
    );
  }
  const clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons: clippingPolygonsArray,
    debugShowDistanceTexture: debug,
    quality: quality,
  });
  if (viewer.scene.globe.show) {
    viewer.scene.globe.clippingPolygons = clippingPolygons;
  } else if (worldTileset.show) {
    worldTileset.clippingPolygons = clippingPolygons;
  }
}

await updateClippingPolygons(2, 16, 0.21, 1, 1.0);

const cameraOffset = new Cesium.HeadingPitchRange(
  Cesium.Math.toRadians(0.0),
  Cesium.Math.toRadians(-45.0),
  50000.0,
);
viewer.zoomTo(currentDataSourceShape, cameraOffset);

const viewModel = {
  numPolygons: 2.0,
  numPoints: 16.0,
  spacing: 0.21,
  scale: 1.0,
  quality: 1.0,
  shapes: true,
};

async function updateModelFromView() {
  const numPolygons = Number(viewModel.numPolygons);
  const numPoints = Number(viewModel.numPoints);
  const spacing = Number(viewModel.spacing);
  const scale = Number(viewModel.scale);
  const quality = Number(viewModel.quality);
  await updateClippingPolygons(numPolygons, numPoints, spacing, scale, quality);
}

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout.getObservable(viewModel, "shapes").subscribe((show) => {
  shapes = show;
  updateModelFromView();
});

Sandcastle.addToolbarButton("Update ClippingPolygons", updateModelFromView);

Sandcastle.addToggleButton("Debug DistanceTexture", false, (checked) => {
  debug = checked;
  updateModelFromView();
});

let first = true;

// Toggle between globe terrain and a global 3D tileset
Sandcastle.addToolbarMenu([
  {
    text: "Terrain",
    onselect: () => {
      viewer.scene.globe.show = true;
      worldTileset.show = false;
      if (!first) {
        updateModelFromView();
      }
      first = false;
    },
  },
  {
    text: "3D Tiles",
    onselect: () => {
      viewer.scene.globe.show = false;
      worldTileset.show = true;
      if (!first) {
        updateModelFromView();
      }
      first = false;
    },
  },
]);
