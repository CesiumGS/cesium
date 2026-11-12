import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Tower test tileset from the repo (Specs/Data), about 287k splats.
// Run with the local dev server (npm start) so /Specs is served.
const towerUrl = "/Specs/Data/Cesium3DTiles/GaussianSplats/tower/tileset.json";

const viewer = new Cesium.Viewer("cesiumContainer", {
  globe: false,
  skyAtmosphere: false,
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  geocoder: false,
});
const scene = viewer.scene;
// Keep rendering every frame so the history keeps accumulating.
scene.requestRenderMode = false;

let tileset;
try {
  tileset = await Cesium.Cesium3DTileset.fromUrl(towerUrl);
  scene.primitives.add(tileset);
  await viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0.0),
      Cesium.Math.toRadians(-15.0),
      40.0,
    ),
  );
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

// One stage, reconfigured per mode. progressive and historyFloat are plain
// properties, so changing them at runtime is fine (history is reallocated).
const taa = Cesium.PostProcessStageLibrary.createTemporalAntiAliasingStage();
scene.postProcessStages.add(taa);

const modes = {
  sorted: { stochastic: false, taa: false },
  stochastic: { stochastic: true, taa: false },
  taa: { stochastic: true, taa: true, progressive: false, historyFloat: false },
  progressiveHalf: {
    stochastic: true,
    taa: true,
    progressive: true,
    historyFloat: false,
  },
  progressiveFloat: {
    stochastic: true,
    taa: true,
    progressive: true,
    historyFloat: true,
  },
};

function applyMode(mode) {
  if (Cesium.defined(tileset)) {
    // Private flag read by GaussianSplatPrimitive; toggling rebuilds the draw command.
    tileset._gaussianSplatStochastic = mode.stochastic;
  }
  taa.enabled = mode.taa;
  taa.progressive = mode.progressive ?? false;
  taa.historyFloat = mode.historyFloat ?? false;
  // Restart accumulation so modes are compared from frame 0.
  taa._needsReset = true;
}

Sandcastle.addToolbarMenu([
  {
    text: "Stochastic + progressive (float history)",
    onselect: () => applyMode(modes.progressiveFloat),
  },
  {
    text: "Stochastic + progressive (half history)",
    onselect: () => applyMode(modes.progressiveHalf),
  },
  {
    text: "Stochastic + TAA",
    onselect: () => applyMode(modes.taa),
  },
  {
    text: "Stochastic, no TAA",
    onselect: () => applyMode(modes.stochastic),
  },
  {
    text: "Sorted (default)",
    onselect: () => applyMode(modes.sorted),
  },
]);
applyMode(modes.progressiveFloat);

// Accumulated frame count (only counts while the camera is still and progressive is on).
const frameCountElement = document.getElementById("frameCount");
scene.postRender.addEventListener(() => {
  frameCountElement.textContent = taa.enabled
    ? `accumulated frames: ${taa._frameCount}`
    : "";
});
