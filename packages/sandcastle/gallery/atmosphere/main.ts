import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const scene = viewer.scene;
const globe = scene.globe;
const skyAtmosphere = scene.skyAtmosphere;

scene.highDynamicRange = true;
globe.enableLighting = true;
globe.atmosphereLightIntensity = 20.0;

viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(
  "2022-03-23T11:31:42.34200000000419095Z",
);

const canvas = viewer.canvas;
canvas.setAttribute("tabindex", "0"); // needed to put focus on the canvas
canvas.onclick = function () {
  canvas.focus();
};

const defaultGroundAtmosphereLightIntensity = globe.atmosphereLightIntensity;
const defaultGroundAtmosphereRayleighCoefficient =
  globe.atmosphereRayleighCoefficient;
const defaultGroundAtmosphereMieCoefficient = globe.atmosphereMieCoefficient;
const defaultGroundAtmosphereMieAnisotropy = globe.atmosphereMieAnisotropy;
const defaultGroundAtmosphereRayleighScaleHeight =
  globe.atmosphereRayleighScaleHeight;
const defaultGroundAtmosphereMieScaleHeight = globe.atmosphereMieScaleHeight;
const defaultGroundAtmosphereHueShift = globe.atmosphereHueShift;
const defaultGroundAtmosphereSaturationShift = globe.atmosphereSaturationShift;
const defaultGroundAtmosphereBrightnessShift = globe.atmosphereBrightnessShift;
const defaultLightFadeOut = globe.lightingFadeOutDistance;
const defaultLightFadeIn = globe.lightingFadeInDistance;
const defaultNightFadeOut = globe.nightFadeOutDistance;
const defaultNightFadeIn = globe.nightFadeInDistance;

const defaultSkyAtmosphereLightIntensity =
  skyAtmosphere.atmosphereLightIntensity;
const defaultSkyAtmosphereRayleighCoefficient =
  skyAtmosphere.atmosphereRayleighCoefficient;
const defaultSkyAtmosphereMieCoefficient =
  skyAtmosphere.atmosphereMieCoefficient;
const defaultSkyAtmosphereMieAnisotropy = skyAtmosphere.atmosphereMieAnisotropy;
const defaultSkyAtmosphereRayleighScaleHeight =
  skyAtmosphere.atmosphereRayleighScaleHeight;
const defaultSkyAtmosphereMieScaleHeight =
  skyAtmosphere.atmosphereMieScaleHeight;
const defaultSkyAtmosphereHueShift = skyAtmosphere.hueShift;
const defaultSkyAtmosphereSaturationShift = skyAtmosphere.saturationShift;
const defaultSkyAtmosphereBrightnessShift = skyAtmosphere.brightnessShift;

const viewModel = {
  // Globe settings

  enableTerrain: false,
  enableLighting: true,
  groundTranslucency: false,

  // Ground atmosphere settings

  showGroundAtmosphere: true,
  groundAtmosphereLightIntensity: defaultGroundAtmosphereLightIntensity,
  groundAtmosphereRayleighCoefficientR:
    defaultGroundAtmosphereRayleighCoefficient.x / 1e-6,
  groundAtmosphereRayleighCoefficientG:
    defaultGroundAtmosphereRayleighCoefficient.y / 1e-6,
  groundAtmosphereRayleighCoefficientB:
    defaultGroundAtmosphereRayleighCoefficient.z / 1e-6,
  groundAtmosphereMieCoefficient:
    defaultGroundAtmosphereMieCoefficient.x / 1e-6,
  groundAtmosphereRayleighScaleHeight:
    defaultGroundAtmosphereRayleighScaleHeight,
  groundAtmosphereMieScaleHeight: defaultGroundAtmosphereMieScaleHeight,
  groundAtmosphereMieAnisotropy: defaultGroundAtmosphereMieAnisotropy,
  groundHueShift: defaultGroundAtmosphereHueShift,
  groundSaturationShift: defaultGroundAtmosphereSaturationShift,
  groundBrightnessShift: defaultGroundAtmosphereBrightnessShift,
  lightingFadeOutDistance: defaultLightFadeOut,
  lightingFadeInDistance: defaultLightFadeIn,
  nightFadeOutDistance: defaultNightFadeOut,
  nightFadeInDistance: defaultNightFadeIn,

  // Sky atmosphere settings

  showSkyAtmosphere: true,
  skyAtmosphereLightIntensity: defaultSkyAtmosphereLightIntensity,
  skyAtmosphereRayleighCoefficientR:
    defaultSkyAtmosphereRayleighCoefficient.x / 1e-6,
  skyAtmosphereRayleighCoefficientG:
    defaultSkyAtmosphereRayleighCoefficient.y / 1e-6,
  skyAtmosphereRayleighCoefficientB:
    defaultSkyAtmosphereRayleighCoefficient.z / 1e-6,
  skyAtmosphereMieCoefficient: defaultSkyAtmosphereMieCoefficient.x / 1e-6,
  skyAtmosphereRayleighScaleHeight: defaultSkyAtmosphereRayleighScaleHeight,
  skyAtmosphereMieScaleHeight: defaultSkyAtmosphereMieScaleHeight,
  skyAtmosphereMieAnisotropy: defaultSkyAtmosphereMieAnisotropy,
  skyHueShift: defaultSkyAtmosphereHueShift,
  skySaturationShift: defaultSkyAtmosphereSaturationShift,
  skyBrightnessShift: defaultSkyAtmosphereBrightnessShift,
  perFragmentAtmosphere: false,
  dynamicLighting: true,
  dynamicLightingFromSun: false,

  // Fog settings

  showFog: true,
  density: 1.0,
  minimumBrightness: 0.03,

  // Scene settings

  hdr: true,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

Cesium.knockout
  .getObservable(viewModel, "enableTerrain")
  .subscribe(async function (newValue) {
    if (newValue) {
      scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
    } else {
      scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    }
  });
Cesium.knockout
  .getObservable(viewModel, "showFog")
  .subscribe(function (newValue) {
    scene.fog.enabled = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "enableLighting")
  .subscribe(function (newValue) {
    globe.enableLighting = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "showGroundAtmosphere")
  .subscribe(function (newValue) {
    globe.showGroundAtmosphere = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "dynamicLighting")
  .subscribe(function (newValue) {
    globe.dynamicAtmosphereLighting = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "dynamicLightingFromSun")
  .subscribe(function (newValue) {
    globe.dynamicAtmosphereLightingFromSun = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "density")
  .subscribe(function (newValue) {
    viewer.scene.fog.density = 2.0e-4 * newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "minimumBrightness")
  .subscribe(function (newValue) {
    viewer.scene.fog.minimumBrightness = newValue;
  });

// Ground Atmosphere

Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereLightIntensity")
  .subscribe(function (newValue) {
    globe.atmosphereLightIntensity = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereRayleighCoefficientR")
  .subscribe(function (newValue) {
    globe.atmosphereRayleighCoefficient.x = parseFloat(newValue) * 1e-6;
  });
Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereRayleighCoefficientG")
  .subscribe(function (newValue) {
    globe.atmosphereRayleighCoefficient.y = parseFloat(newValue) * 1e-6;
  });
Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereRayleighCoefficientB")
  .subscribe(function (newValue) {
    globe.atmosphereRayleighCoefficient.z = parseFloat(newValue) * 1e-6;
  });
Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereMieCoefficient")
  .subscribe(function (newValue) {
    const v = parseFloat(newValue) * 1e-6;
    globe.atmosphereMieCoefficient = new Cesium.Cartesian3(v, v, v);
  });
Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereRayleighScaleHeight")
  .subscribe(function (newValue) {
    globe.atmosphereRayleighScaleHeight = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereMieScaleHeight")
  .subscribe(function (newValue) {
    globe.atmosphereMieScaleHeight = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "groundAtmosphereMieAnisotropy")
  .subscribe(function (newValue) {
    globe.atmosphereMieAnisotropy = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "groundHueShift")
  .subscribe(function (newValue) {
    globe.atmosphereHueShift = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "groundSaturationShift")
  .subscribe(function (newValue) {
    globe.atmosphereSaturationShift = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "groundBrightnessShift")
  .subscribe(function (newValue) {
    globe.atmosphereBrightnessShift = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "lightingFadeOutDistance")
  .subscribe(function (newValue) {
    globe.lightingFadeOutDistance = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "lightingFadeInDistance")
  .subscribe(function (newValue) {
    globe.lightingFadeInDistance = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "nightFadeOutDistance")
  .subscribe(function (newValue) {
    globe.nightFadeOutDistance = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "nightFadeInDistance")
  .subscribe(function (newValue) {
    globe.nightFadeInDistance = parseFloat(newValue);
  });

// Sky Atmosphere

Cesium.knockout
  .getObservable(viewModel, "showSkyAtmosphere")
  .subscribe(function (newValue) {
    skyAtmosphere.show = newValue;
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereLightIntensity")
  .subscribe(function (newValue) {
    skyAtmosphere.atmosphereLightIntensity = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereRayleighCoefficientR")
  .subscribe(function (newValue) {
    skyAtmosphere.atmosphereRayleighCoefficient.x = parseFloat(newValue) * 1e-6;
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereRayleighCoefficientG")
  .subscribe(function (newValue) {
    skyAtmosphere.atmosphereRayleighCoefficient.y = parseFloat(newValue) * 1e-6;
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereRayleighCoefficientB")
  .subscribe(function (newValue) {
    skyAtmosphere.atmosphereRayleighCoefficient.z = parseFloat(newValue) * 1e-6;
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereMieCoefficient")
  .subscribe(function (newValue) {
    const v = parseFloat(newValue) * 1e-6;
    skyAtmosphere.atmosphereMieCoefficient = new Cesium.Cartesian3(v, v, v);
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereRayleighScaleHeight")
  .subscribe(function (newValue) {
    skyAtmosphere.atmosphereRayleighScaleHeight = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereMieScaleHeight")
  .subscribe(function (newValue) {
    skyAtmosphere.atmosphereMieScaleHeight = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "skyAtmosphereMieAnisotropy")
  .subscribe(function (newValue) {
    skyAtmosphere.atmosphereMieAnisotropy = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "skyHueShift")
  .subscribe(function (newValue) {
    skyAtmosphere.hueShift = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "skySaturationShift")
  .subscribe(function (newValue) {
    skyAtmosphere.saturationShift = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "skyBrightnessShift")
  .subscribe(function (newValue) {
    skyAtmosphere.brightnessShift = parseFloat(newValue);
  });
Cesium.knockout
  .getObservable(viewModel, "perFragmentAtmosphere")
  .subscribe(function (newValue) {
    scene.skyAtmosphere.perFragmentAtmosphere = newValue;
  });
Cesium.knockout.getObservable(viewModel, "hdr").subscribe(function (newValue) {
  scene.highDynamicRange = newValue;
});
Cesium.knockout
  .getObservable(viewModel, "groundTranslucency")
  .subscribe(function (newValue) {
    globe.translucency.enabled = newValue;
    globe.translucency.frontFaceAlpha = 0.1;
    globe.translucency.backFaceAlpha = 0.1;
  });

window.setActiveTab = function (event, tableId) {
  let i;
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  const tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tableId).style.display = "block";
  event.currentTarget.className += " active";
};
