import * as Cesium from "cesium";

// When browser recommended resolution is enabled, the viewer renders at
// CSS pixel resolution (96 dpi). Otherwise, the viewer renders at the
// screen's native resolution.
//
// Resolution scale applies an additional scaling factor to the
// WebGL canvas.
//
// For example, if the cesium container div is 500x500 pixels,
// window.devicePixelRatio is 2.0, and useBrowserRecommendedResolution
// is false, the WebGL canvas will be 1000x1000 pixels. Then if
// the resolutionScale is 0.25, the canvas will be scaled
// down to 250x250 pixels.

const viewer = new Cesium.Viewer("cesiumContainer");

const viewModel = {
  useBrowserRecommendedResolution: false,
  resolutionScale: 0.25,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(update);
  }
}

function update() {
  viewer.useBrowserRecommendedResolution =
    viewModel.useBrowserRecommendedResolution;

  let resolutionScale = Number(viewModel.resolutionScale);
  resolutionScale = !isNaN(resolutionScale) ? resolutionScale : 1.0;
  resolutionScale = Cesium.Math.clamp(resolutionScale, 0.1, 2.0);
  viewer.resolutionScale = resolutionScale;
}
update();
