import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

const { camera, clock, scene } = viewer;
camera.frustum.near = 1.0;
scene.debugShowFramesPerSecond = true;

clock.currentTime = Cesium.JulianDate.fromIso8601("2022-08-01T00:00:00Z");

if (!Cesium.PostProcessStageLibrary.isAmbientOcclusionSupported(viewer.scene)) {
  window.alert(
    "This browser does not support the ambient occlusion post process.",
  );
}

const viewModel = {
  show: true,
  ambientOcclusionOnly: false,
  intensity: 3.0,
  bias: 0.1,
  lengthCap: 0.26,
  directionCount: 8,
  stepCount: 32,
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
  const ambientOcclusion = scene.postProcessStages.ambientOcclusion;
  ambientOcclusion.enabled =
    Boolean(viewModel.show) || Boolean(viewModel.ambientOcclusionOnly);
  ambientOcclusion.uniforms.ambientOcclusionOnly = Boolean(
    viewModel.ambientOcclusionOnly,
  );
  ambientOcclusion.uniforms.intensity = Number(viewModel.intensity);
  ambientOcclusion.uniforms.bias = Number(viewModel.bias);
  ambientOcclusion.uniforms.lengthCap = Number(viewModel.lengthCap);
  ambientOcclusion.uniforms.directionCount = Number(viewModel.directionCount);
  ambientOcclusion.uniforms.stepCount = Number(viewModel.stepCount);
}
updatePostProcess();

camera.position = new Cesium.Cartesian3(
  1234127.2294710164,
  -5086011.666443127,
  3633337.0413351045,
);
camera.direction = new Cesium.Cartesian3(
  -0.5310064396211631,
  -0.30299013818088416,
  -0.7913464078682514,
);
camera.right = new Cesium.Cartesian3(
  -0.8468592075426076,
  0.1574051185945647,
  0.507989282604011,
);
camera.up = Cesium.Cartesian3.cross(
  camera.right,
  camera.direction,
  new Cesium.Cartesian3(),
);

try {
  // Power Plant design model provided by Bentley Systems
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);
  scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}
