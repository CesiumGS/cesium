import * as Cesium from "cesium";

const useGoogle3d = true;

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

// Load a batched 3D Tiles tileset.

// Sandcastle (1000 footprints)
// const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);

// iTwin Demo (700 footprints) (google3d = 30fps)
// immutable fix => 60fps
// Cesium.ITwinPlatform.defaultShareKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiNTM1YTI0YTMtOWIyOS00ZTIzLWJiNWQtOWNlZGI1MjRjNzQzIiwiaWQiOiI2NTEwMzUzMi02MmU3LTRmZGQtOWNlNy1iODIxYmEyMmI5NjMiLCJleHAiOjE3NzcwNTU4MTh9.Q9MgsWWkc6bb1zHUJ7ahZjxPtaTWEjpNvRln7NS3faM";
// const tileset = await Cesium.ITwinData.createTilesetFromIModelId({
//   iModelId: "669dde67-eb69-4e0b-bcf2-f722eee94746",
// });

// Datacenter (2000 footprints) (generate clip gpu lag 10s, 60 fps)
// gpu fix => generate 1s
// google3d => 40 fps
// regions = 1
// Cesium.ITwinPlatform.apiEndpoint = "https://qa-api.bentley.com/";
// Cesium.ITwinPlatform.defaultShareKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiNmUxNTVkZWYtZWYzZC00ZjE5LWE3OWUtMDFlNzI5MzhiMzNlIiwiaWQiOiI4YTI0MmIwMy1jMjZhLTRkODgtYmU3YS02NTgyNDRhYTVmODciLCJleHAiOjE3ODA5Njg1NzF9.hDZ_ONaqsCd6ZUgAPiyLuDeZ_e8hxZ8tZKh-3Wq7TnY";
// const tileset = await Cesium.ITwinData.createTilesetFromIModelId({
//   iModelId: "bd034361-895a-445a-a13f-57d21d332a18",
// });

// Road 1 (21000 footprints)  (generate clip gpu lag 1m, 4 fps)
// gpu fix > generate ~30s freeze, 25 fps
// regions = 1
// Cesium.ITwinPlatform.apiEndpoint = "https://qa-api.bentley.com/"
// Cesium.ITwinPlatform.defaultShareKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiOGIzZDA2NTMtMDJiNS00YTc2LTgzMmUtN2MxNmVkNTBmZjIxIiwiaWQiOiI5YTI5MGJhNi1kYTRkLTRlY2YtODRmNy1kZWFkNTI2ZjQ5OWMiLCJleHAiOjE3ODA5Njk4NjR9.woG55aAiV0J_-9W78K1qml8ShDpd9VZ0XTLt9ILmfEQ";
// const tileset = await Cesium.ITwinData.createTilesetFromIModelId({
//   iModelId: "61bb5dc9-cfc2-4adf-8bbc-ba3ee73c967d",
// });

// Road 2 (12000 footprints)  (generate clip gpu lag 10s, 14fps)
// gpu fix -> generate 10s, 50 fps
// regions = 1
Cesium.ITwinPlatform.apiEndpoint = "https://qa-api.bentley.com/";
Cesium.ITwinPlatform.defaultShareKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpVHdpbklkIjoiOGIzZDA2NTMtMDJiNS00YTc2LTgzMmUtN2MxNmVkNTBmZjIxIiwiaWQiOiI5YTI5MGJhNi1kYTRkLTRlY2YtODRmNy1kZWFkNTI2ZjQ5OWMiLCJleHAiOjE3ODA5Njk4NjR9.woG55aAiV0J_-9W78K1qml8ShDpd9VZ0XTLt9ILmfEQ";
const tileset = await Cesium.ITwinData.createTilesetFromIModelId({
  iModelId: "88cea7cc-f4ad-46b4-859f-a8c692d3f0b4",
});

viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// Collect clipping polygons from footprints
const clippingPolygons = [];

// --- UI controls ---
const statusEl = document.getElementById("status");
const btnGenerate = document.getElementById("btnGenerate");
const btnClear = document.getElementById("btnClear");
const btnToggleMesh = document.getElementById("btnToggleMesh");
const modeSelect = document.getElementById("modeSelect");
const geomErrorSelect = document.getElementById("geomErrorSelect");
const clipQualitySelect = document.getElementById("clipQualitySelect");

let minGeometricError = 64;
let clipQuality = 0.25;

geomErrorSelect.addEventListener("change", function () {
  minGeometricError = Number(geomErrorSelect.value);
});

clipQualitySelect.addEventListener("change", function () {
  clipQuality = Number(clipQualitySelect.value);
});

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
      debugShowDistanceTexture: false,
      quality: clipQuality,
    });
}

function addClip(footprint, _feature, _tile) {
  clippingPolygons.push(
    new Cesium.ClippingPolygon({
      positions: footprint.hierarchy.positions,
      immutable: true,
    }),
  );
}

function addPolygonGraphics(footprint, feature, _tile) {
  viewer.entities.add(
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

function addOutlineGraphics(footprint, feature, _tile) {
  viewer.entities.add(
    new Cesium.Entity({
      polygon: new Cesium.PolygonGraphics({
        hierarchy: footprint.hierarchy,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        fill: false,
        outline: true,
        outlineColor: Cesium.defined(footprint.color)
          ? footprint.color
          : Cesium.Color.WHITE,
        classificationType: Cesium.ClassificationType.TERRAIN,
        zIndex: footprint.maxHeight,
      }),
      properties: { featureId: feature.featureId },
    }),
  );
}

function onFootprintsGenerated(tile, count) {
  console.log(
    `footprintsGenerated — depth: ${tile._depth}, geometricError: ${tile.geometricError}, count: ${count}`,
  );
}

async function generateFootprints(createEntity) {
  const start = performance.now();
  const count = await Cesium.Cesium3DTilesetFootprintGenerator.generate({
    tileset: tileset,
    createEntity: createEntity,
    filterFeature: function (feature) {
      return true;
    },
    filterTile: function (tile) {
      return (
        tile.parent === undefined || tile.geometricError >= minGeometricError
      );
    },
    footprintsGenerated: onFootprintsGenerated,
  });
  footprintCount = count;
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`generate() took ${elapsed} ms — ${count} footprints`);
  return count;
}

function clearAll() {
  footprintCount = 0;
  clippingPolygons.length = 0;
  viewer.entities.removeAll();
  clippingPolygons.length = 0;
  (useGoogle3d ? google3d : viewer.scene.globe).clippingPolygons = undefined;
}

// Generate based on selected mode
btnGenerate.addEventListener("click", async function () {
  clearAll();
  const mode = modeSelect.value;
  if (mode === "clip") {
    await generateFootprints(addClip);
    updateClippingPolygons();
  } else if (mode === "fill") {
    await generateFootprints(addPolygonGraphics);
  } else {
    await generateFootprints(addOutlineGraphics);
  }
  updateStatus();
});

// Clear
btnClear.addEventListener("click", function () {
  clearAll();
  updateStatus();
});

// Toggle mesh visibility
btnToggleMesh.addEventListener("click", function () {
  tileset.show = !tileset.show;
  btnToggleMesh.textContent = tileset.show ? "Hide Mesh" : "Show Mesh";
});
