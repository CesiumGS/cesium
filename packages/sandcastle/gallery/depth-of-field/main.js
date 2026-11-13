import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

function createModel(url, x, y, height) {
  const position = Cesium.Cartesian3.fromDegrees(x, y, height);
  viewer.entities.add({
    name: url,
    position: position,
    model: {
      uri: url,
    },
  });
}

const numberOfBalloons = 13;
const lonIncrement = 0.00025;
const initialLon = -122.99875;
const lat = 44.0503706;
const height = 100.0;

const url = "../../SampleData/models/CesiumBalloon/CesiumBalloon.glb";

for (let i = 0; i < numberOfBalloons; ++i) {
  const lon = initialLon + i * lonIncrement;
  createModel(url, lon, lat, height);
}

const viewModel = {
  show: true,
  focalDistance: 87,
  delta: 1,
  sigma: 3.78,
  stepSize: 2.46,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(updatePostProcess);
  }
}

if (!Cesium.PostProcessStageLibrary.isDepthOfFieldSupported(viewer.scene)) {
  window.alert(
    "This browser does not support the depth of field post process.",
  );
}

const depthOfField = viewer.scene.postProcessStages.add(
  Cesium.PostProcessStageLibrary.createDepthOfFieldStage(),
);

function updatePostProcess() {
  depthOfField.enabled = Boolean(viewModel.show);
  depthOfField.uniforms.focalDistance = Number(viewModel.focalDistance);
  depthOfField.uniforms.delta = Number(viewModel.delta);
  depthOfField.uniforms.sigma = Number(viewModel.sigma);
  depthOfField.uniforms.stepSize = Number(viewModel.stepSize);
}
updatePostProcess();

const target = Cesium.Cartesian3.fromDegrees(
  initialLon + lonIncrement,
  lat,
  height + 7.5,
);
const offset = new Cesium.Cartesian3(
  -37.048378684557974,
  -24.852967044804245,
  4.352023653686047,
);
viewer.scene.camera.lookAt(target, offset);
