import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");

const viewModel = {
  show: true,
  intensity: 2.0,
  distortion: 10.0,
  dispersion: 0.4,
  haloWidth: 0.4,
  dirtAmount: 0.4,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(updatePostProcess);
  }
}

const lensFlare = viewer.scene.postProcessStages.add(
  Cesium.PostProcessStageLibrary.createLensFlareStage(),
);

function updatePostProcess() {
  lensFlare.enabled = Boolean(viewModel.show);
  lensFlare.uniforms.intensity = Number(viewModel.intensity);
  lensFlare.uniforms.distortion = Number(viewModel.distortion);
  lensFlare.uniforms.ghostDispersal = Number(viewModel.dispersion);
  lensFlare.uniforms.haloWidth = Number(viewModel.haloWidth);
  lensFlare.uniforms.dirtAmount = Number(viewModel.dirtAmount);
  lensFlare.uniforms.earthRadius = Cesium.Ellipsoid.WGS84.maximumRadius;
}
updatePostProcess();

const camera = viewer.scene.camera;
camera.position = new Cesium.Cartesian3(
  40010447.97500168,
  56238683.46406788,
  20776576.752223067,
);
camera.direction = new Cesium.Cartesian3(
  -0.5549701431494752,
  -0.7801872010801355,
  -0.2886452346452218,
);
camera.up = new Cesium.Cartesian3(
  -0.3016252360948521,
  -0.13464820558887716,
  0.9438707950150912,
);
camera.right = Cesium.Cartesian3.cross(
  camera.direction,
  camera.up,
  new Cesium.Cartesian3(),
);

viewer.clock.currentTime = new Cesium.JulianDate(2458047, 27399.860215000022);
