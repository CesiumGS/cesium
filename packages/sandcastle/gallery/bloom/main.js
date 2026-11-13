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
  glowOnly: false,
  contrast: 128,
  brightness: -0.3,
  delta: 1.0,
  sigma: 3.78,
  stepSize: 5.0,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(updatePostProcess);
  }
}

function updatePostProcess() {
  const bloom = viewer.scene.postProcessStages.bloom;
  bloom.enabled = Boolean(viewModel.show);
  bloom.uniforms.glowOnly = Boolean(viewModel.glowOnly);
  bloom.uniforms.contrast = Number(viewModel.contrast);
  bloom.uniforms.brightness = Number(viewModel.brightness);
  bloom.uniforms.delta = Number(viewModel.delta);
  bloom.uniforms.sigma = Number(viewModel.sigma);
  bloom.uniforms.stepSize = Number(viewModel.stepSize);
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
