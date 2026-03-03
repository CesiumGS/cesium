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

// --- UI controls ---
const statusEl = document.getElementById("status");
const btnGenerate = document.getElementById("btnGenerate");
const btnClear = document.getElementById("btnClear");

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

// One-shot generate — builds footprints then applies as terrain cutouts
btnGenerate.addEventListener("click", function () {
  clippingPolygons.length = 0;

  const start = performance.now();
  const count = Cesium.Cesium3DTilesetFootprintGenerator.generate({
    tileset: tileset,
    entityCollection: viewer.entities,
    createEntity: function (hierarchy, feature, tile) {
      clippingPolygons.push(
        new Cesium.ClippingPolygon({
          positions: hierarchy.positions,
        }),
      );

      // Still return an entity (invisible) so it is tracked
      return new Cesium.Entity({
        id: `${tile.content.url}#${feature.featureId}`,
      });
    },
    footprintsGenerated: function (tile, count) {
      console.log(
        `footprintsGenerated — tile: ${tile?.content?.url ?? "unknown"}, count: ${count}`,
      );
    },
  });
  footprintCount = count;
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`generate() took ${elapsed} ms — ${count} footprints`);

  updateClippingPolygons();
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
