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

// Collect clipping polygons from footprints
const clippingPolygons = [];

// Create the footprint generator
const generator = new Cesium.Cesium3DTilesetFootprintGenerator({
  tileset: tileset,
  entityCollection: viewer.entities,
  hullMethod: "convexHull",
  createEntity: function (hierarchy, feature, tile) {
    clippingPolygons.push(
      new Cesium.ClippingPolygon({
        positions: hierarchy.positions,
      }),
    );

    // Still return an entity (invisible) so the generator tracks it
    return new Cesium.Entity({
      id: `${tile.content.url}#${feature.featureId}`,
    });
  },
});

// --- UI controls ---
const statusEl = document.getElementById("status");
const btnGenerate = document.getElementById("btnGenerate");
const btnClear = document.getElementById("btnClear");

function updateStatus() {
  statusEl.textContent = `Footprints: ${generator.footprintCount}`;
}

function updateClippingPolygons() {
  // Apply clipping polygons to the globe
  viewer.scene.globe.clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons: clippingPolygons,
    inverse: false, // false = cut holes where buildings are
  });
}

generator.footprintsGenerated.addEventListener(function (tile) {
  console.log(
    `footprintsGenerated — tile: ${tile?.content?.url ?? "unknown"}, total: ${generator.footprintCount}`,
  );
  updateStatus();
});

// One-shot generate — builds footprints then applies as terrain cutouts
btnGenerate.addEventListener("click", function () {
  clippingPolygons.length = 0;

  const start = performance.now();
  generator.generate();
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(
    `generate() took ${elapsed} ms — ${generator.footprintCount} footprints`,
  );

  updateClippingPolygons();
  updateStatus();
});

// Clear
btnClear.addEventListener("click", function () {
  generator.clear();
  clippingPolygons.length = 0;
  viewer.scene.globe.clippingPolygons = undefined;
  updateStatus();
});
