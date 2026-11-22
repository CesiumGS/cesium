import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

const position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706);
const url = "../../SampleData/models/CesiumMan/Cesium_Man.glb";
viewer.trackedEntity = viewer.entities.add({
  name: url,
  position: position,
  model: {
    uri: url,
  },
});

const viewModel = {
  blackAndWhiteShow: false,
  blackAndWhiteGradations: 5.0,
  brightnessShow: false,
  brightnessValue: 0.5,
  nightVisionShow: false,
  silhouette: true,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(updatePostProcess);
  }
}

if (!Cesium.PostProcessStageLibrary.isSilhouetteSupported(viewer.scene)) {
  window.alert("This browser does not support the silhouette post process.");
}

const stages = viewer.scene.postProcessStages;
const silhouette = stages.add(
  Cesium.PostProcessStageLibrary.createSilhouetteStage(),
);
const blackAndWhite = stages.add(
  Cesium.PostProcessStageLibrary.createBlackAndWhiteStage(),
);
const brightness = stages.add(
  Cesium.PostProcessStageLibrary.createBrightnessStage(),
);
const nightVision = stages.add(
  Cesium.PostProcessStageLibrary.createNightVisionStage(),
);

function updatePostProcess() {
  silhouette.enabled = Boolean(viewModel.silhouette);
  silhouette.uniforms.color = Cesium.Color.YELLOW;
  blackAndWhite.enabled = Boolean(viewModel.blackAndWhiteShow);
  blackAndWhite.uniforms.gradations = Number(viewModel.blackAndWhiteGradations);
  brightness.enabled = Boolean(viewModel.brightnessShow);
  brightness.uniforms.brightness = Number(viewModel.brightnessValue);
  nightVision.enabled = Boolean(viewModel.nightVisionShow);
}
updatePostProcess();
