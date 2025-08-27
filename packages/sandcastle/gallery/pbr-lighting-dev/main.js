import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
});

const scene = viewer.scene;
if (!scene.specularEnvironmentMapsSupported) {
  window.alert("This browser does not support specular environment maps.");
}

//     ***    MODELS    ***

const heightViewModel = {
  height: 200.0,
};

function computeModelMatrixFromHeight() {
  const height = Number(heightViewModel.height);
  if (isNaN(height)) {
    return;
  }

  const hpr = new Cesium.HeadingPitchRoll(0.0, 0.0, 0.0);
  const origin = Cesium.Cartesian3.fromDegrees(
    -123.0744619,
    44.0503706,
    height,
  );
  return Cesium.Transforms.headingPitchRollToFixedFrame(origin, hpr);
}

Cesium.knockout.track(heightViewModel);
const heightToolbar = document.getElementById("heightToolbar");
Cesium.knockout.applyBindings(heightViewModel, heightToolbar);

let model;
Cesium.knockout.getObservable(heightViewModel, "height").subscribe(function () {
  const modelMatrix = computeModelMatrixFromHeight();

  if (!Cesium.defined(modelMatrix)) {
    return;
  }

  model.modelMatrix = modelMatrix;
  const camera = scene.camera;
  const boundingSphere = model.boundingSphere;
  camera.lookAt(
    boundingSphere.center,
    new Cesium.HeadingPitchRange(
      camera.heading,
      camera.pitch,
      boundingSphere.radius * 2.0,
    ),
  );
});

const modelOptions = [
  {
    text: "Environment Test",
    onselect: () => loadModel(2681028),
  },
  {
    text: "Damaged Helmet",
    onselect: () => loadModel(2681021),
  },
  {
    text: "Antique Camera",
    onselect: () => loadModel(2681022),
  },
  {
    text: "Clear Coat Wicker",
    onselect: () => loadModel(2584329),
  },
  {
    text: "Specular Test",
    onselect: () => loadModel(2572779),
  },
  {
    text: "Anisotropy Strength Test",
    onselect: () => loadModel(2583526),
  },
  {
    text: "Anisotropy Disc Test",
    onselect: () => loadModel(2583858),
  },
  {
    text: "Anisotropy Rotation Test",
    onselect: () => loadModel(2583859),
  },
  {
    text: "Clear Coat Test",
    onselect: () => loadModel(2584326),
  },
  {
    text: "Clear Coat Car Paint",
    onselect: () => loadModel(2584328),
  },
  {
    text: "Toy Car",
    onselect: () => loadModel(2584331),
  },
  {
    text: "Pot of Coals",
    onselect: () => loadModel(2584330),
  },
  {
    text: "Barn Lamp",
    onselect: () => loadModel(2583726),
  },
  {
    text: "Metal-Roughness Spheres",
    onselect: () => loadModel(2635364),
  },
  {
    text: "Water Bottle",
    onselect: () => loadModel(2654597),
  },
  {
    text: "Duck",
    onselect: () => loadModel(2681027),
  },
  {
    text: "Mirror Ball",
    onselect: () => loadModel(2674524),
  },
];
Sandcastle.addToolbarMenu(modelOptions, "modelsToolbar");

//    ***   LIGHTING    ***

const imageBasedLighting = new Cesium.ImageBasedLighting();

const environmentMapOptions = [
  {
    text: "Dynamic environment maps - Diffuse and specular",
    onselect: () => {
      imageBasedLighting.imageBasedLightingFactor = Cesium.Cartesian2.ONE;
    },
  },
  {
    text: "Dynamic environment maps - Diffuse only",
    onselect: () => {
      imageBasedLighting.imageBasedLightingFactor = Cesium.Cartesian2.UNIT_X;
    },
  },
  {
    text: "Dynamic environment maps intensity - Specular only",
    onselect: () => {
      imageBasedLighting.imageBasedLightingFactor = Cesium.Cartesian2.UNIT_Y;
    },
  },
  {
    text: "Dynamic environment maps - None",
    onselect: () => {
      imageBasedLighting.imageBasedLightingFactor = Cesium.Cartesian2.ZERO;
    },
  },
];

Sandcastle.addToolbarMenu(environmentMapOptions, "environmentToolbar");

const lightingViewModel = {
  directionalLightIntensity: 2.0,
  atmosphereScatteringIntensity: 2.0,
  gamma: 1.0,
  brightness: 1.0,
  saturation: 1.0,
  groundAlbedo: 0.31,
};

Cesium.knockout.track(lightingViewModel);
const lightingToolbar = document.getElementById("lightingToolbar");
Cesium.knockout.applyBindings(lightingViewModel, lightingToolbar);

Sandcastle.addToolbarButton("Random Ground Color", function () {
  model.environmentMapManager.groundColor = Cesium.Color.fromRandom({
    alpha: 1.0,
    minimumRed: 0.1,
    maximumRed: 0.5,
    minimumGreen: 0.1,
    maximumGreen: 0.5,
    minimumBlue: 0.0,
    maximumBlue: 0.4,
  });
  model.environmentMapManager.reset();
});

Sandcastle.addToolbarButton("Reset Lighting", function () {
  lightingViewModel.directionalLightIntensity = 1.0;
  lightingViewModel.atmosphereScatteringIntensity = 2.0;
  lightingViewModel.gamma = 1.0;
  lightingViewModel.brightness = 1.0;
  lightingViewModel.saturation = 1.0;
  lightingViewModel.groundAlbedo = 0.31;
  model.environmentMapManager.groundColor =
    Cesium.DynamicEnvironmentMapManager.AVERAGE_EARTH_GROUND_COLOR;
  updateModelLightingProperties();
});

Cesium.knockout
  .getObservable(lightingViewModel, "directionalLightIntensity")
  .subscribe(function () {
    const directionalLightIntensity = Number(
      lightingViewModel.directionalLightIntensity,
    );
    if (!isNaN(directionalLightIntensity)) {
      scene.light.intensity = directionalLightIntensity;
    }
  });

Cesium.knockout
  .getObservable(lightingViewModel, "atmosphereScatteringIntensity")
  .subscribe(updateModelLightingProperties);

Cesium.knockout
  .getObservable(lightingViewModel, "gamma")
  .subscribe(updateModelLightingProperties);

Cesium.knockout
  .getObservable(lightingViewModel, "brightness")
  .subscribe(updateModelLightingProperties);

Cesium.knockout
  .getObservable(lightingViewModel, "saturation")
  .subscribe(updateModelLightingProperties);

Cesium.knockout
  .getObservable(lightingViewModel, "groundAlbedo")
  .subscribe(updateModelLightingProperties);

function updateModelLightingProperties() {
  const atmosphereScatteringIntensity = Number(
    lightingViewModel.atmosphereScatteringIntensity,
  );
  if (!isNaN(atmosphereScatteringIntensity)) {
    model.environmentMapManager.atmosphereScatteringIntensity =
      atmosphereScatteringIntensity;
  }

  const gamma = Number(lightingViewModel.gamma);
  if (!isNaN(gamma)) {
    model.environmentMapManager.gamma = gamma;
  }

  const brightness = Number(lightingViewModel.brightness);
  if (!isNaN(brightness)) {
    model.environmentMapManager.brightness = brightness;
  }

  const saturation = Number(lightingViewModel.saturation);
  if (!isNaN(saturation)) {
    model.environmentMapManager.saturation = saturation;
  }

  const groundAlbedo = Number(lightingViewModel.groundAlbedo);
  if (!isNaN(groundAlbedo)) {
    model.environmentMapManager.groundAlbedo = groundAlbedo;
  }

  model.environmentMapManager.reset();
}

async function loadModel(ionAssetId) {
  try {
    const resource = await Cesium.IonResource.fromAssetId(ionAssetId);
    model = await Cesium.Model.fromGltfAsync({
      url: resource,
      modelMatrix: computeModelMatrixFromHeight(),
      imageBasedLighting,
    });

    scene.primitives.removeAll();
    scene.primitives.add(model);
    updateModelLightingProperties();

    model.readyEvent.addEventListener(() => {
      zoomToModel(model);
    });
  } catch (error) {
    window.alert(`Error loading model: ${error}`);
  }
}

function zoomToModel(model) {
  const camera = scene.camera;
  const controller = scene.screenSpaceCameraController;
  controller.minimumZoomDistance = camera.frustum.near;
  controller._minimumRotateRate = 1.0;

  let { radius } = model.boundingSphere;
  if (radius < 10.0) {
    // ScreenSpaceCameraController doesn't handle small models well
    const scale = 10.0 / radius;
    Cesium.Matrix4.multiplyByUniformScale(
      model.modelMatrix,
      scale,
      model.modelMatrix,
    );
    radius *= scale;
  }

  const heading = Cesium.Math.toRadians(270.0);
  const pitch = 0.0;
  camera.lookAt(
    model.boundingSphere.center,
    new Cesium.HeadingPitchRange(heading, pitch, radius * 2.0),
  );
}
loadModel(2681028);

//    ***   GLOBAL SETTINGS    ***

Sandcastle.addToggleButton(
  "Dynamic lighting",
  scene.globe.enableLighting,
  function (checked) {
    scene.globe.enableLighting = checked;
    scene.atmosphere.dynamicLighting = checked
      ? Cesium.DynamicAtmosphereLightingType.SUNLIGHT
      : Cesium.DynamicAtmosphereLightingType.NONE;
  },
);

Sandcastle.addToggleButton("Shadows", viewer.shadows, function (checked) {
  viewer.shadows = checked;
});

Sandcastle.addToggleButton("HDR", scene.highDynamicRange, function (checked) {
  scene.highDynamicRange = checked;
});
