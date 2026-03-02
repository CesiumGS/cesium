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
tileset.style = new Cesium.Cesium3DTileStyle({
  color: "color('white', 0.5)", // 50% transparent
});
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// Create the footprint generator
const generator = new Cesium.Cesium3DTilesetFootprintGenerator({
  tileset: tileset,
  entityCollection: viewer.entities,
  hullMethod: "convexHull",
  material: Cesium.Color.RED.withAlpha(0.8),
  classificationType: Cesium.ClassificationType.TERRAIN,
});

// --- UI controls ---
const statusEl = document.getElementById("status");
const btnGenerate = document.getElementById("btnGenerate");
const btnAutoUpdate = document.getElementById("btnAutoUpdate");
const btnClear = document.getElementById("btnClear");

function updateStatus() {
  statusEl.textContent = `Footprints: ${generator.footprintCount}`;
}

generator.footprintsGenerated.addEventListener(function (tile) {
  console.log(
    `footprintsGenerated — tile: ${tile?.content?.url ?? "unknown"}, total: ${generator.footprintCount}`,
  );
  updateStatus();
});

// One-shot generate
btnGenerate.addEventListener("click", function () {
  const start = performance.now();
  generator.generate();
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(
    `generate() took ${elapsed} ms — ${generator.footprintCount} footprints`,
  );
  updateStatus();
});

// Toggle auto-update
let autoUpdating = false;
btnAutoUpdate.addEventListener("click", function () {
  if (!autoUpdating) {
    generator.startAutoUpdate();
    btnAutoUpdate.textContent = "Stop Auto-Update";
    autoUpdating = true;
  } else {
    generator.stopAutoUpdate();
    btnAutoUpdate.textContent = "Start Auto-Update";
    autoUpdating = false;
  }
});

// Clear
btnClear.addEventListener("click", function () {
  generator.clear();
  updateStatus();
});
