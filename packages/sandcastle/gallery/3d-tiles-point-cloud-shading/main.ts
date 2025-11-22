import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const scene = viewer.scene;
let viewModelTileset;

if (!Cesium.PointCloudShading.isSupported(scene)) {
  window.alert("This browser does not support point cloud shading");
}

function reset() {
  viewer.scene.primitives.remove(viewModelTileset);
  viewModelTileset = undefined;
}

// The viewModel tracks the state of our mini application.
const pointClouds = ["St. Helens", "Church"];
const viewModel = {
  exampleTypes: pointClouds,
  currentExampleType: pointClouds[0],
  maximumScreenSpaceError: 16.0,
  geometricErrorScale: 1.0,
  maximumAttenuation: 0, // Equivalent to undefined
  baseResolution: 0, // Equivalent to undefined
  eyeDomeLightingStrength: 1.0,
  eyeDomeLightingRadius: 1.0,
};

function tilesetToViewModel(tileset) {
  viewModelTileset = tileset;

  const pointCloudShading = tileset.pointCloudShading;
  viewModel.maximumScreenSpaceError = tileset.maximumScreenSpaceError;
  viewModel.geometricErrorScale = pointCloudShading.geometricErrorScale;
  viewModel.maximumAttenuation = pointCloudShading.maximumAttenuation
    ? pointCloudShading.maximumAttenuation
    : 0;
  viewModel.baseResolution = pointCloudShading.baseResolution
    ? pointCloudShading.baseResolution
    : 0;
  viewModel.eyeDomeLightingStrength = pointCloudShading.eyeDomeLightingStrength;
  viewModel.eyeDomeLightingRadius = pointCloudShading.eyeDomeLightingRadius;
}

async function loadStHelens() {
  try {
    // Set the initial camera view to look at Mt. St. Helens
    const initialPosition = Cesium.Cartesian3.fromRadians(
      -2.1344873183780484,
      0.8071380277370774,
      5743.394497982162,
    );
    const initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(
      112.99596671210358,
      -21.34390550872461,
      0.0716951918898415,
    );
    viewer.scene.camera.setView({
      destination: initialPosition,
      orientation: initialOrientation,
      endTransform: Cesium.Matrix4.IDENTITY,
    });

    // Mt. St. Helens 3D Tileset generated from LAS provided by https://www.liblas.org/samples/
    // This tileset uses replacement refinement and has geometric error approximately equal to
    // the average interpoint distance in each tile.
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5713);
    if (viewModel.currentExampleType !== pointClouds[0]) {
      // Scenario has changes. Discards the result.
      return;
    }
    viewer.scene.primitives.add(tileset);

    tileset.maximumScreenSpaceError = 16.0;
    tileset.pointCloudShading.maximumAttenuation = undefined; // Will be based on maximumScreenSpaceError instead
    tileset.pointCloudShading.baseResolution = undefined;
    tileset.pointCloudShading.geometricErrorScale = 1.0;
    tileset.pointCloudShading.attenuation = true;
    tileset.pointCloudShading.eyeDomeLighting = true;

    tilesetToViewModel(tileset);
  } catch (error) {
    console.log(`Error loading tileset: ${error}`);
  }
}

async function loadChurch() {
  try {
    // Point Cloud by Prof. Peter Allen, Columbia University Robotics Lab. Scanning by Alejandro Troccoli and Matei Ciocarlie.
    // This tileset uses additive refinement and has geometric error based on the bounding box size for each tile.
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(16421);
    if (viewModel.currentExampleType !== pointClouds[1]) {
      // Scenario has changes. Discards the result.
      return;
    }
    viewer.scene.primitives.add(tileset);

    tileset.maximumScreenSpaceError = 16.0;
    tileset.pointCloudShading.maximumAttenuation = 4.0; // Don't allow points larger than 4 pixels.
    tileset.pointCloudShading.baseResolution = 0.05; // Assume an original capture resolution of 5 centimeters between neighboring points.
    tileset.pointCloudShading.geometricErrorScale = 0.5; // Applies to both geometric error and the base resolution.
    tileset.pointCloudShading.attenuation = true;
    tileset.pointCloudShading.eyeDomeLighting = true;

    viewer.scene.camera.setView({
      destination: new Cesium.Cartesian3(
        4401744.644145314,
        225051.41078911052,
        4595420.374784433,
      ),
      orientation: new Cesium.HeadingPitchRoll(
        5.646733805039757,
        -0.276607153839886,
        6.281110875400085,
      ),
    });

    tilesetToViewModel(tileset);
  } catch (error) {
    console.log(`Error loading tileset: ${error}`);
  }
}

function checkZero(newValue) {
  const newValueFloat = parseFloat(newValue);
  return newValueFloat === 0.0 ? undefined : newValueFloat;
}

loadStHelens();

// Convert the viewModel members into knockout observables.
Cesium.knockout.track(viewModel);

// Bind the viewModel to the DOM elements of the UI that call for it.
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "currentExampleType")
  .subscribe(function (newValue) {
    reset();
    if (newValue === pointClouds[0]) {
      loadStHelens();
    } else if (newValue === pointClouds[1]) {
      loadChurch();
    }
  });

Cesium.knockout
  .getObservable(viewModel, "maximumScreenSpaceError")
  .subscribe(function (newValue) {
    if (Cesium.defined(viewModelTileset)) {
      viewModelTileset.maximumScreenSpaceError = parseFloat(newValue);
    }
  });

Cesium.knockout
  .getObservable(viewModel, "geometricErrorScale")
  .subscribe(function (newValue) {
    if (Cesium.defined(viewModelTileset)) {
      viewModelTileset.pointCloudShading.geometricErrorScale =
        parseFloat(newValue);
    }
  });

Cesium.knockout
  .getObservable(viewModel, "maximumAttenuation")
  .subscribe(function (newValue) {
    if (Cesium.defined(viewModelTileset)) {
      viewModelTileset.pointCloudShading.maximumAttenuation =
        checkZero(newValue);
    }
  });

Cesium.knockout
  .getObservable(viewModel, "baseResolution")
  .subscribe(function (newValue) {
    if (Cesium.defined(viewModelTileset)) {
      viewModelTileset.pointCloudShading.baseResolution = checkZero(newValue);
    }
  });

Cesium.knockout
  .getObservable(viewModel, "eyeDomeLightingStrength")
  .subscribe(function (newValue) {
    if (Cesium.defined(viewModelTileset)) {
      viewModelTileset.pointCloudShading.eyeDomeLightingStrength =
        parseFloat(newValue);
    }
  });

Cesium.knockout
  .getObservable(viewModel, "eyeDomeLightingRadius")
  .subscribe(function (newValue) {
    if (Cesium.defined(viewModelTileset)) {
      viewModelTileset.pointCloudShading.eyeDomeLightingRadius =
        parseFloat(newValue);
    }
  });

Sandcastle.addToggleButton("Enable Attenuation", true, function (checked) {
  if (Cesium.defined(viewModelTileset)) {
    viewModelTileset.pointCloudShading.attenuation = checked;
  }
});

Sandcastle.addToggleButton(
  "Enable Eye Dome Lighting",
  true,
  function (checked) {
    if (Cesium.defined(viewModelTileset)) {
      viewModelTileset.pointCloudShading.eyeDomeLighting = checked;
    }
  },
);
