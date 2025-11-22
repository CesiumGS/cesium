import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  shadows: true,
  timeline: false,
  animation: false,
  geocoder: false,
  sceneModePicker: false,
  baseLayerPicker: false,
});

if (!viewer.scene.highDynamicRangeSupported) {
  window.alert("This browser does not support high dynamic range.");
}

viewer.scene.highDynamicRange = true;

Sandcastle.addToggleButton(
  "HDR",
  true,
  function (checked) {
    viewer.scene.highDynamicRange = checked;
  },
  "hdr-toggle",
);

const toneMapOptions = [
  {
    text: "PBR Neutral",
    onselect: function () {
      viewer.scene.postProcessStages.tonemapper = Cesium.Tonemapper.PBR_NEUTRAL;
    },
  },
  {
    text: "Aces",
    onselect: function () {
      viewer.scene.postProcessStages.tonemapper = Cesium.Tonemapper.ACES;
    },
  },
  {
    text: "Reinhard",
    onselect: function () {
      viewer.scene.postProcessStages.tonemapper = Cesium.Tonemapper.REINHARD;
    },
  },
  {
    text: "Modified_Reinhard",
    onselect: function () {
      viewer.scene.postProcessStages.tonemapper =
        Cesium.Tonemapper.MODIFIED_REINHARD;
    },
  },
  {
    text: "Filmic",
    onselect: function () {
      viewer.scene.postProcessStages.tonemapper = Cesium.Tonemapper.FILMIC;
    },
  },
];
Sandcastle.addDefaultToolbarMenu(toneMapOptions, "tonemap-select");

const viewModel = {
  exposure: 1,
};
// Convert the viewModel members into knockout observables.
Cesium.knockout.track(viewModel);
// Bind the viewModel to the DOM elements of the UI that call for it.
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "exposure")
  .subscribe(function (newValue) {
    viewer.scene.postProcessStages.exposure = Number.parseFloat(newValue);
  });

const url = "../../SampleData/models/DracoCompressed/CesiumMilkTruck.gltf";
const position = Cesium.Cartesian3.fromRadians(
  -1.9516424279517286,
  0.6322397098422969,
  1239.0006814631095,
);
const heading = Cesium.Math.toRadians(-15.0);
const pitch = 0;
const roll = 0;
const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
const scale = 10.0;

viewer.entities.add({
  name: url,
  position: position,
  orientation: orientation,
  model: {
    uri: url,
    scale: scale,
  },
});

// set up canyon view
viewer.scene.camera.setView({
  destination: new Cesium.Cartesian3(
    -1915097.7863741855,
    -4783356.851539908,
    3748887.43462683,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    6.166004548388564,
    -0.043242401760068994,
    0.002179961955988574,
  ),
  endTransform: Cesium.Matrix4.IDENTITY,
});
// set time so the sun is overhead
viewer.clock.currentTime = new Cesium.JulianDate(2460550, 21637);

viewer.scene.debugShowFramesPerSecond = true;
// override the default home location to return to the start
viewer.homeButton.viewModel.command.beforeExecute.addEventListener((e) => {
  e.cancel = true;
  viewer.scene.camera.setView({
    destination: new Cesium.Cartesian3(
      -1915097.7863741855,
      -4783356.851539908,
      3748887.43462683,
    ),
    orientation: new Cesium.HeadingPitchRoll(
      6.166004548388564,
      -0.043242401760068994,
      0.002179961955988574,
    ),
    endTransform: Cesium.Matrix4.IDENTITY,
  });
});
