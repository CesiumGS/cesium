import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.scene.globe.depthTestAgainstTerrain = true;

// Load a batched 3D Tiles tileset with enableGeometryExtraction.
// const tileset = await Cesium.Cesium3DTileset.fromUrl(
//   `../../SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json`,
//   {
//     enableGeometryExtraction: true,
//   },
// );
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651, {
  enableGeometryExtraction: true,
});
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
  viewer.scene.globe.clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons: clippingPolygons,
    inverse: false, // false = cut holes where buildings are
  });
}

function addClip(hierarchy, _feature, _tile, _entityCollection) {
  clippingPolygons.push(
    new Cesium.ClippingPolygon({
      positions: hierarchy.positions,
    }),
  );
}

function addPolygonGraphics(hierarchy, feature, _tile, entityCollection) {
  entityCollection.add(
    new Cesium.Entity({
      polygon: new Cesium.PolygonGraphics({
        hierarchy: hierarchy,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        material: Cesium.Color.CYAN.withAlpha(0.4),
        classificationType: Cesium.ClassificationType.TERRAIN,
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
  viewer.scene.globe.clippingPolygons = undefined;
  updateStatus();
});

// Toggle mesh visibility
btnToggleMesh.addEventListener("click", function () {
  tileset.show = !tileset.show;
  btnToggleMesh.textContent = tileset.show ? "Hide Mesh" : "Show Mesh";
});
