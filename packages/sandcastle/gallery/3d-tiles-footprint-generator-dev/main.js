import * as Cesium from "cesium";

const useGoogle3d = false;

let viewer;

if (useGoogle3d) {
  viewer = new Cesium.Viewer("cesiumContainer", {
    geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
    globe: false,
  });
} else {
  viewer = new Cesium.Viewer("cesiumContainer");
}

viewer.scene.debugShowFramesPerSecond = true;
// viewer.scene.debugShowCommands = true;
// viewer.scene.globe.depthTestAgainstTerrain = true;

// viewer.extend(Cesium.viewerCesiumInspectorMixin);

// Add Photorealistic 3D Tiles
let google3d;
if (useGoogle3d) {
  google3d = await Cesium.createGooglePhotorealistic3DTileset(
    {
      onlyUsingWithGoogleGeocoder: true,
    },
    {
      //maximumScreenSpaceError: 1024*32,
    },
  );
  viewer.scene.primitives.add(google3d);
}

// Load a batched 3D Tiles tileset with enableGeometryExtraction.

const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651, {
  enableGeometryExtraction: true,
});

// Cesium.ITwinPlatform.defaultShareKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiNTM1YTI0YTMtOWIyOS00ZTIzLWJiNWQtOWNlZGI1MjRjNzQzIiwiaWQiOiI2NTEwMzUzMi02MmU3LTRmZGQtOWNlNy1iODIxYmEyMmI5NjMiLCJleHAiOjE3NzcwNTU4MTh9.Q9MgsWWkc6bb1zHUJ7ahZjxPtaTWEjpNvRln7NS3faM";
// const tileset = await Cesium.ITwinData.createTilesetFromIModelId({
//   iModelId: "669dde67-eb69-4e0b-bcf2-f722eee94746",
//   tilesetOptions: {
//     enableGeometryExtraction: true,
//   },
// });

viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// Collect clipping polygons from footprints
const clippingPolygons = [];

// --- UI controls ---
const statusEl = document.getElementById("status");
const btnGenerate = document.getElementById("btnGenerate");
const btnGenerateFootprints = document.getElementById("btnGenerateFootprints");
const btnGenerateDefault = document.getElementById("btnGenerateDefault");
const btnClear = document.getElementById("btnClear");
const btnToggleMesh = document.getElementById("btnToggleMesh");

let footprintCount = 0;

function updateStatus() {
  statusEl.textContent = `Footprints: ${footprintCount}`;
}

function updateClippingPolygons() {
  // Apply clipping polygons to the globe
  (useGoogle3d ? google3d : viewer.scene.globe).clippingPolygons =
    new Cesium.ClippingPolygonCollection({
      polygons: clippingPolygons,
      inverse: false, // false = cut holes where buildings are
    });
}

function addClip(footprint, _feature, _tile, _entityCollection) {
  clippingPolygons.push(
    new Cesium.ClippingPolygon({
      positions: footprint.hierarchy.positions,
    }),
  );
}

function addPolygonGraphics(footprint, feature, _tile, entityCollection) {
  entityCollection.add(
    new Cesium.Entity({
      polygon: new Cesium.PolygonGraphics({
        hierarchy: footprint.hierarchy,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        material: Cesium.defined(footprint.color)
          ? footprint.color.withAlpha(0.4)
          : Cesium.Color.CYAN.withAlpha(0.4),
        classificationType: Cesium.ClassificationType.TERRAIN,
        zIndex: footprint.maxHeight,
      }),
      properties: { featureId: feature.featureId },
    }),
  );
}

function onFootprintsGenerated(tile, count) {
  console.log(
    `footprintsGenerated — tile: ${tile?.content?.url ?? "unknown"}, count: ${count}`,
  );
}

// One-shot generate — builds footprints then applies as terrain cutouts
btnGenerate.addEventListener("click", function () {
  clippingPolygons.length = 0;

  const start = performance.now();
  const count = Cesium.Cesium3DTilesetFootprintGenerator.generate({
    tileset: tileset,
    entityCollection: viewer.entities,
    createEntity: addClip,
    footprintsGenerated: onFootprintsGenerated,
  });
  footprintCount = count;
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`generate() took ${elapsed} ms — ${count} footprints`);

  updateClippingPolygons();
  updateStatus();
});

// Generate 2D footprint entities
btnGenerateFootprints.addEventListener("click", function () {
  const start = performance.now();
  const count = Cesium.Cesium3DTilesetFootprintGenerator.generate({
    tileset: tileset,
    entityCollection: viewer.entities,
    createEntity: addPolygonGraphics,
    footprintsGenerated: onFootprintsGenerated,
  });
  footprintCount = count;
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`generate() took ${elapsed} ms — ${count} footprints`);

  updateStatus();
});

// Generate using default entity creation
btnGenerateDefault.addEventListener("click", function () {
  const start = performance.now();
  const count = Cesium.Cesium3DTilesetFootprintGenerator.generate({
    tileset: tileset,
    entityCollection: viewer.entities,
    footprintsGenerated: onFootprintsGenerated,
  });
  footprintCount = count;
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`generate() took ${elapsed} ms — ${count} footprints`);

  updateStatus();
});

// Clear
btnClear.addEventListener("click", function () {
  viewer.entities.removeAll();
  footprintCount = 0;
  clippingPolygons.length = 0;
  (useGoogle3d ? google3d : viewer.scene.globe).clippingPolygons = undefined;
  updateStatus();
});

// Toggle mesh visibility
btnToggleMesh.addEventListener("click", function () {
  tileset.show = !tileset.show;
  btnToggleMesh.textContent = tileset.show ? "Hide Mesh" : "Show Mesh";
});
