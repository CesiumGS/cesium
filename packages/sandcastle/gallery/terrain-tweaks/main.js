import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

const viewModel = {
  loadingDescendantLimit: viewer.scene.globe.loadingDescendantLimit,
  preloadAncestors: viewer.scene.globe.preloadAncestors,
  preloadSiblings: viewer.scene.globe.preloadSiblings,
  fillHighlightColor: Cesium.defined(viewer.scene.globe.fillHighlightColor)
    ? viewer.scene.globe.fillHighlightColor.toCssColorString()
    : "rgba(255, 255, 0, 0.5)",
  fillHighlightEnabled: Cesium.defined(viewer.scene.globe.fillHighlightColor),
};

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "loadingDescendantLimit")
  .subscribe(function (newValue) {
    viewer.scene.globe.loadingDescendantLimit = parseInt(newValue, 10);
  });
Cesium.knockout
  .getObservable(viewModel, "preloadAncestors")
  .subscribe(function (newValue) {
    viewer.scene.globe.preloadAncestors = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "preloadSiblings")
  .subscribe(function (newValue) {
    viewer.scene.globe.preloadSiblings = newValue;
  });

function updateFillHighlight() {
  if (viewModel.fillHighlightEnabled) {
    viewer.scene.globe.fillHighlightColor = Cesium.Color.fromCssColorString(
      viewModel.fillHighlightColor,
    );
  } else {
    viewer.scene.globe.fillHighlightColor = undefined;
  }
}

Cesium.knockout
  .getObservable(viewModel, "fillHighlightEnabled")
  .subscribe(function (newValue) {
    updateFillHighlight();
  });
Cesium.knockout
  .getObservable(viewModel, "fillHighlightColor")
  .subscribe(function (newValue) {
    updateFillHighlight();
  });
