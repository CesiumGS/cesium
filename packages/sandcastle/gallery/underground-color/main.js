import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

const scene = viewer.scene;
const globe = scene.globe;

scene.screenSpaceCameraController.enableCollisionDetection = false;

const longitude = -3.82518;
const latitude = 53.11728;
const height = -500.0;
const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
const url = "../../SampleData/models/ParcLeadMine/ParcLeadMine.glb";

viewer.entities.add({
  name: url,
  position: position,
  model: {
    uri: url,
  },
});

viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    3827058.651471591,
    -256575.7981065622,
    5078738.238484612,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    1.9765540737339418,
    -0.17352018581162754,
    0.0030147639151465455,
  ),
  endTransform: Cesium.Matrix4.IDENTITY,
});

const originalColor = Cesium.Color.BLACK;
const originalNearDistance = 1000.0;
const originalFarDistance = 1000000.0;
const originalNearAlpha = 0.0;
const originalFarAlpha = 1.0;

let color = originalColor;

const viewModel = {
  enabled: true,
  nearDistance: originalNearDistance,
  farDistance: originalFarDistance,
  nearAlpha: originalNearAlpha,
  farAlpha: originalFarAlpha,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(update);
  }
}

Sandcastle.addToolbarButton("Random color", function () {
  color = Cesium.Color.fromRandom({
    alpha: 1.0,
  });
  update();
});

Sandcastle.addToolbarButton("Clear", function () {
  color = originalColor;
  viewModel.enabled = true;
  viewModel.nearDistance = originalNearDistance;
  viewModel.farDistance = originalFarDistance;
  viewModel.nearAlpha = originalNearAlpha;
  viewModel.farAlpha = originalFarAlpha;
  update();
});

function update() {
  globe.undergroundColor = viewModel.enabled ? color : undefined;

  let nearDistance = Number(viewModel.nearDistance);
  nearDistance = isNaN(nearDistance) ? originalNearDistance : nearDistance;

  let farDistance = Number(viewModel.farDistance);
  farDistance = isNaN(farDistance) ? originalFarDistance : farDistance;

  if (nearDistance > farDistance) {
    nearDistance = farDistance;
  }

  let nearAlpha = Number(viewModel.nearAlpha);
  nearAlpha = isNaN(nearAlpha) ? 0.0 : nearAlpha;

  let farAlpha = Number(viewModel.farAlpha);
  farAlpha = isNaN(farAlpha) ? 1.0 : farAlpha;

  globe.undergroundColorAlphaByDistance.near = nearDistance;
  globe.undergroundColorAlphaByDistance.far = farDistance;
  globe.undergroundColorAlphaByDistance.nearValue = nearAlpha;
  globe.undergroundColorAlphaByDistance.farValue = farAlpha;
}

color = Cesium.Color.LIGHTSLATEGRAY;
update();
