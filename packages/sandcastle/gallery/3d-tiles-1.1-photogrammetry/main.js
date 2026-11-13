import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  geocoder: false,
  sceneModePicker: false,
  homeButton: false,
  navigationHelpButton: false,
  baseLayerPicker: false,
});

// Asset Lookup tables ================================================

// Left half of the screen:
// Tilesets produced by the Cesium ion 3D Model Tiler
const leftAssetIds = {
  "AGI HQ": 40866,
  Melbourne: 69380,
};

// Right half of the screen:
// Tilesets produced by the Cesium ion Reality Tiler
const rightAssetIds = {
  "AGI HQ": 2325106,
  Melbourne: 2325107,
};

const ellipsoidProvider = new Cesium.EllipsoidTerrainProvider();

// AGI HQ looks better with Cesium World Terrain, but Melbourne looks
// better using the ellipsoid terrain.
const updateTerrainFunc = {
  "AGI HQ": (viewer) => {
    viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
  },
  Melbourne: (viewer) => {
    viewer.terrainProvider = ellipsoidProvider;
  },
};

// List of tileset names for creating options and indexing into the
// lookup tables above.
const tilesetNames = ["AGI HQ", "Melbourne"];

// Tileset Loading ====================================================

// Create two primitive collections, one for each half of the screen.
// This way we can clear one half of the screen at a time.
const leftCollection = viewer.scene.primitives.add(
  new Cesium.PrimitiveCollection(),
);
const rightCollection = viewer.scene.primitives.add(
  new Cesium.PrimitiveCollection(),
);

// Load a tileset to one half of the screen, returning the tileset
async function loadTileset(tilesetName, splitDirection) {
  const isLeft = splitDirection === Cesium.SplitDirection.LEFT;

  const assetIds = isLeft ? leftAssetIds : rightAssetIds;
  const collection = isLeft ? leftCollection : rightCollection;

  const assetId = assetIds[tilesetName];
  if (!Cesium.defined(assetId)) {
    collection.removeAll();
    return;
  }

  const side = splitDirection === Cesium.SplitDirection.LEFT ? "left" : "right";

  collection.removeAll();
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(assetId);
  tileset.splitDirection = splitDirection;

  // Whenever a tile loads/unloads, update the stats about GPU memory
  // and tile count. Load time is handled separately for better
  // accuracy.
  const updateStatsCallback = (tile) => {
    updateStatsPanel(side, tileset);
  };
  tileset.tileLoad.addEventListener(updateStatsCallback);
  tileset.tileUnload.addEventListener(updateStatsCallback);

  collection.add(tileset);

  return tileset;
}

async function viewTileset(tilesetName, splitDirection) {
  const tileset = await loadTileset(tilesetName, splitDirection);
  viewer.zoomTo(tileset);
}

async function viewTilesets(tilesetName) {
  // Load the tilesets simultaneously
  viewTileset(tilesetName, Cesium.SplitDirection.LEFT);
  viewTileset(tilesetName, Cesium.SplitDirection.RIGHT);
}

async function benchmarkTileset(tilesetName, splitDirection) {
  const side = splitDirection === Cesium.SplitDirection.LEFT ? "left" : "right";
  clearStatsPanel(side);

  const startMilliseconds = performance.now();
  const tileset = await loadTileset(tilesetName, splitDirection);

  return new Promise((resolve) => {
    tileset.initialTilesLoaded.addEventListener(() => {
      const endMilliseconds = performance.now();
      const deltaSeconds = (endMilliseconds - startMilliseconds) / 1000.0;
      updateLoadTime(side, deltaSeconds);
      resolve();
    });
  });
}

async function benchmarkTilesets(tilesetName) {
  // Note: For benchmarking, load tilesets one at a time so the loading
  // of one tileset doesn't delay the loading of the other.
  await benchmarkTileset(tilesetName, Cesium.SplitDirection.LEFT);
  await benchmarkTileset(tilesetName, Cesium.SplitDirection.RIGHT);
}

// UI =================================================================

// Tileset dropdown ---------------------------------------------------

// The first tileset in the dropdown will automatically be selected.
let selectedTilesetName = tilesetNames[0];

function createOption(name) {
  return {
    text: name,
    onselect: function () {
      selectedTilesetName = name;
      viewTilesets(name).catch(console.error);

      updateTerrainFunc[name](viewer);

      clearStatsPanel("left");
      addBenchmarkNotice("left");
      clearStatsPanel("right");
      addBenchmarkNotice("right");
    },
  };
}

function createOptions() {
  const options = tilesetNames.map(createOption);
  return options;
}

Sandcastle.addToolbarMenu(createOptions(), "toolbarSelect");

// Compute load time -------------------------------------------------

// For better accuracy, this button reloads the tilesets one by one
// so the load time of one tileset doesn't affect the other
Sandcastle.addToolbarButton(
  "Compute time to load",
  async function () {
    benchmarkTilesets(selectedTilesetName);
  },
  "toolbarSelect",
);

// A note to the user that load time requires a button press
function addBenchmarkNotice(side) {
  document.getElementById(`${side}BenchmarkNotice`).innerHTML =
    "Press 'Compute time to load' to measure load time";
}

// Stats panels -------------------------------------------------------

function clearStatsPanel(side) {
  document.getElementById(`${side}TileLoadTime`).innerHTML = "---";
  document.getElementById(`${side}BenchmarkNotice`).innerHTML = "";
}

function updateLoadTime(side, tileLoadTimeSeconds) {
  document.getElementById(`${side}TileLoadTime`).innerHTML =
    tileLoadTimeSeconds.toPrecision(3);
}

function updateStatsPanel(side, tileset) {
  const stats = tileset.statistics;
  document.getElementById(`${side}TilesLoaded`).innerHTML =
    stats.numberOfLoadedTilesTotal;
  document.getElementById(`${side}TilesTotal`).innerHTML =
    stats.numberOfTilesTotal;

  const gpuMemoryBytes = stats.geometryByteLength + stats.texturesByteLength;
  const gpuMemoryMB = gpuMemoryBytes / 1024 / 1024;
  document.getElementById(`${side}GpuMemoryMB`).innerHTML =
    gpuMemoryMB.toPrecision(3);
}

// maximum SSE Slider -------------------------------------------------

const viewModel = {
  maximumScreenSpaceError: 16.0,
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "maximumScreenSpaceError")
  .subscribe((value) => {
    const valueFloat = parseFloat(value);
    if (leftCollection.length > 0) {
      const leftTileset = leftCollection.get(0);
      leftTileset.maximumScreenSpaceError = valueFloat;
    }
    if (rightCollection.length > 0) {
      const rightTileset = rightCollection.get(0);
      rightTileset.maximumScreenSpaceError = valueFloat;
    }
  });

// Splitter ----------------------------------------------------------

// This code is the same as in the 3D Tiles Compare Sandcastle.

// Sync the position of the slider with the split position
const slider = document.getElementById("slider");
viewer.scene.splitPosition =
  slider.offsetLeft / slider.parentElement.offsetWidth;

const handler = new Cesium.ScreenSpaceEventHandler(slider);

let moveActive = false;

function move(movement) {
  if (!moveActive) {
    return;
  }

  const relativeOffset = movement.endPosition.x;
  const splitPosition =
    (slider.offsetLeft + relativeOffset) / slider.parentElement.offsetWidth;
  slider.style.left = `${100.0 * splitPosition}%`;
  viewer.scene.splitPosition = splitPosition;
}

handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.LEFT_DOWN);
handler.setInputAction(function () {
  moveActive = true;
}, Cesium.ScreenSpaceEventType.PINCH_START);

handler.setInputAction(move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
handler.setInputAction(move, Cesium.ScreenSpaceEventType.PINCH_MOVE);

handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.LEFT_UP);
handler.setInputAction(function () {
  moveActive = false;
}, Cesium.ScreenSpaceEventType.PINCH_END);
