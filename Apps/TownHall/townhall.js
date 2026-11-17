window.CESIUM_BASE_URL = window.CESIUM_BASE_URL
  ? window.CESIUM_BASE_URL
  : "../../Build/CesiumUnminified/";

import * as Cesium from "../../Build/CesiumUnminified/index.js";

// ionToken.js is gitignored; without it the default ion token is used.
try {
  const { default: ionToken } = await import("./ionToken.js");
  Cesium.Ion.defaultAccessToken = ionToken;
} catch (error) {
  console.warn(`No ionToken.js, using the default ion token: ${error}`);
}

const sampleData = "../SampleData/Cesium3DTiles/";

const viewer = new Cesium.Viewer("viewer", {
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  sceneModePicker: false,
  homeButton: false,
  navigationHelpButton: false,
  fullscreenButton: false,
});
const { scene, camera } = viewer;
const { globe } = scene;
camera.frustum.near = 1.0;

const ellipsoidTerrain = scene.terrainProvider;

scene.shadowMap.softShadows = true;
scene.shadowMap.size = 4096;
scene.shadowMap.darkness = 0.7;

const naturalEarth = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.TileMapServiceImageryProvider.fromUrl(
    Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
  ),
);
naturalEarth.show = false;
viewer.imageryLayers.add(naturalEarth);

const globeDefaults = {
  cartographicLimitRectangle: Cesium.Rectangle.clone(
    globe.cartographicLimitRectangle,
  ),
  backFaceCulling: globe.backFaceCulling,
  undergroundColor: Cesium.Color.clone(globe.undergroundColor),
  showSkirts: globe.showSkirts,
  translucencyEnabled: globe.translucency.enabled,
  frontFaceAlpha: globe.translucency.frontFaceAlpha,
  skyAtmosphereShow: scene.skyAtmosphere.show,
};

// Resources are loaded on first visit and kept (hidden) so revisiting a slide is instant.
const resourceCache = new Map();
function loadOnce(key, factory) {
  if (!resourceCache.has(key)) {
    const promise = factory().catch((error) => {
      resourceCache.delete(key);
      throw error;
    });
    resourceCache.set(key, promise);
  }
  return resourceCache.get(key);
}

// Primitives added by slides. Only these are hidden between slides, so
// primitives owned by the Viewer (e.g. entity display) are left alone.
const slidePrimitives = new Set();
function addHidden(primitive) {
  primitive.show = false;
  slidePrimitives.add(primitive);
  return scene.primitives.add(primitive);
}

function setTerrain(terrainProvider) {
  if (scene.terrainProvider !== terrainProvider) {
    scene.terrainProvider = terrainProvider;
  }
}

function loadWorldTerrain() {
  return loadOnce("worldTerrain", () => Cesium.createWorldTerrainAsync());
}

// Globe backdrop for text slides

let spinning = false;
scene.preUpdate.addEventListener(function () {
  if (spinning) {
    camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0006);
  }
});

async function showGlobeBackdrop(context) {
  setTerrain(ellipsoidTerrain);
  camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-40.0, 20.0, 2.2e7),
    duration: 2.0,
    complete: function () {
      spinning = context.isActive();
    },
  });
}

// Split-screen comparison of 3D Tiles 1.1 and glTF 2.1 tilesets

const splitUi = document.getElementById("splitUi");
const splitSlider = document.getElementById("splitSlider");

function setSplitPosition(position) {
  splitSlider.style.left = `${100.0 * position}%`;
  scene.splitPosition = position;
}

const splitHandler = new Cesium.ScreenSpaceEventHandler(splitSlider);
let splitDragActive = false;
function moveSplit(movement) {
  if (!splitDragActive) {
    return;
  }
  const width = splitSlider.parentElement.offsetWidth;
  setSplitPosition((splitSlider.offsetLeft + movement.endPosition.x) / width);
}
function startSplitDrag() {
  splitDragActive = true;
}
function endSplitDrag() {
  splitDragActive = false;
}
splitHandler.setInputAction(
  startSplitDrag,
  Cesium.ScreenSpaceEventType.LEFT_DOWN,
);
splitHandler.setInputAction(
  startSplitDrag,
  Cesium.ScreenSpaceEventType.PINCH_START,
);
splitHandler.setInputAction(moveSplit, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
splitHandler.setInputAction(moveSplit, Cesium.ScreenSpaceEventType.PINCH_MOVE);
splitHandler.setInputAction(endSplitDrag, Cesium.ScreenSpaceEventType.LEFT_UP);
splitHandler.setInputAction(
  endSplitDrag,
  Cesium.ScreenSpaceEventType.PINCH_END,
);

function loadSplitPair(key, legacyUrl, gltfUrl, modelMatrix) {
  return loadOnce(key, async function () {
    const [left, right] = await Promise.all([
      Cesium.Cesium3DTileset.fromUrl(legacyUrl),
      Cesium.Cesium3DTileset.fromGltf(gltfUrl),
    ]);
    left.splitDirection = Cesium.SplitDirection.LEFT;
    right.splitDirection = Cesium.SplitDirection.RIGHT;
    for (const tileset of [left, right]) {
      if (Cesium.defined(modelMatrix)) {
        tileset.modelMatrix = modelMatrix;
      }
      addHidden(tileset);
    }
    return { left, right };
  });
}

async function showSplitComparison(
  context,
  pairPromise,
  { heading = 0.0, terrainPromise, view } = {},
) {
  setTerrain(ellipsoidTerrain);
  const [{ left, right }, terrain] = await Promise.all([
    pairPromise,
    terrainPromise,
  ]);
  if (!context.isActive()) {
    return;
  }
  if (Cesium.defined(terrain)) {
    setTerrain(terrain);
  }
  left.show = true;
  right.show = true;
  splitUi.hidden = false;
  setSplitPosition(0.5);
  if (Cesium.defined(view)) {
    camera.flyTo({ ...view, duration: 2.0 });
    return;
  }
  camera.flyToBoundingSphere(left.boundingSphere, {
    offset: new Cesium.HeadingPitchRange(
      heading,
      -0.5,
      left.boundingSphere.radius,
    ),
    duration: 2.0,
  });
}

const agiGeoreference = Cesium.Matrix4.unpack([
  0.9685698432170965, 0.2487417512409377, -4.632960681760777e-13, 0,
  -0.16001765262281278, 0.6230890951759628, 0.7656071644922637, 0,
  0.19043846685870308, -0.7415440112780839, 0.6433083783677276, 0,
  1216363.6111466389, -4736293.364982555, 4081329.7216236885, 1,
]);

const snowdenMorning = Cesium.JulianDate.fromIso8601("2026-11-17T14:45:00Z");

function showSnowden(context) {
  viewer.clock.currentTime = Cesium.JulianDate.clone(snowdenMorning);
  scene.shadowMap.enabled = true;
  scene.postProcessStages.ambientOcclusion.enabled = true;
  const pair = loadSplitPair(
    "snowden",
    `${sampleData}snowden/tileset.json`,
    `${sampleData}gltf-2.1/snowden/root.tileset.gltf`,
  );
  return showSplitComparison(context, pair, {
    terrainPromise: loadWorldTerrain(),
  });
}

const agiBoundingVolumesInput = document.getElementById("agiBoundingVolumes");

function loadAgi() {
  return loadSplitPair(
    "agi",
    `${sampleData}AGI_HQ/tileset.json`,
    `${sampleData}gltf-2.1/AGI_HQ/root.tileset.gltf`,
    agiGeoreference,
  );
}

async function applyAgiBoundingVolumes() {
  const { left, right } = await loadAgi();
  for (const tileset of [left, right]) {
    tileset.debugShowBoundingVolume = agiBoundingVolumesInput.checked;
  }
}

agiBoundingVolumesInput.addEventListener("change", applyAgiBoundingVolumes);

function showAgi(context) {
  const pair = loadAgi();
  applyAgiBoundingVolumes();
  return showSplitComparison(context, pair, {
    view: {
      destination: Cesium.Cartesian3.fromDegrees(-75.59663, 40.0373, 104.8),
      orientation: {
        heading: Cesium.Math.toRadians(351.75),
        pitch: Cesium.Math.toRadians(-25.24),
        roll: 0.0,
      },
    },
  });
}

// 3DTILES_tileset_vectors: river network draped on terrain

function loadRiver() {
  return loadOnce("river", async function () {
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(5135960, {
      heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
      scene: scene,
    });
    tileset.style = new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          ["Number(${ORD_FLOW}) <= 1", "color('navy')"],
          ["Number(${ORD_FLOW}) <= 2", "color('blue')"],
          ["Number(${ORD_FLOW}) <= 3", "color('dodgerblue')"],
          ["Number(${ORD_FLOW}) <= 4", "color('cyan')"],
          ["Number(${ORD_FLOW}) <= 5", "color('limegreen')"],
          ["Number(${ORD_FLOW}) <= 6", "color('yellow')"],
          ["Number(${ORD_FLOW}) <= 7", "color('gold')"],
          ["Number(${ORD_FLOW}) <= 8", "color('orange')"],
          ["Number(${ORD_FLOW}) <= 9", "color('orangered')"],
          ["Number(${ORD_FLOW}) <= 10", "color('red')"],
          ["true", "color('gray')"],
        ],
      },
      lineWidth: "5.0 - clamp(Number(${ORD_FLOW}), 0.0, 10.0) * 0.4",
    });
    return addHidden(tileset);
  });
}

async function showRiver(context) {
  camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-95.07, 26.88, 2.47e6),
    orientation: {
      heading: Cesium.Math.toRadians(-1.06),
      pitch: Cesium.Math.toRadians(-66.86),
      roll: 0.0,
    },
    duration: 0.0,
  });
  const [terrain, tileset] = await Promise.all([
    loadWorldTerrain(),
    loadRiver(),
  ]);
  if (!context.isActive()) {
    return;
  }
  setTerrain(terrain);
  tileset.show = true;
}

// 3DTILES_tileset_vectors: true 3D vectors alongside a photogrammetry mesh

function loadNativeVector() {
  return loadOnce("nativeVector", async function () {
    const [mesh, vectors] = await Promise.all([
      Cesium.Cesium3DTileset.fromIonAssetId(5135767),
      Cesium.Cesium3DTileset.fromIonAssetId(5135764),
    ]);
    vectors.style = new Cesium.Cesium3DTileStyle({
      color: "color('cyan')",
      lineWidth: 3,
    });
    const defaultStyle = mesh.asset.extras?.ion?.defaultStyle;
    if (Cesium.defined(defaultStyle)) {
      mesh.style = new Cesium.Cesium3DTileStyle(defaultStyle);
    }
    addHidden(mesh);
    addHidden(vectors);
    return { mesh, vectors };
  });
}

async function showNativeVector(context) {
  // Near head height under the bridge, so the vectors on the underside of
  // the deck are visible.
  camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-93.086726, 44.942846, 192.88),
    orientation: {
      heading: Cesium.Math.toRadians(3.74),
      pitch: Cesium.Math.toRadians(-8.86),
      roll: 0.0,
    },
    duration: 2.0,
  });
  const [terrain, { mesh, vectors }] = await Promise.all([
    loadWorldTerrain(),
    loadNativeVector(),
  ]);
  if (!context.isActive()) {
    return;
  }
  setTerrain(terrain);
  mesh.show = true;
  vectors.show = true;
}

// Voxels

const voxelShader = new Cesium.CustomShader({
  uniforms: {
    u_dvsMin: { type: Cesium.UniformType.FLOAT, value: -4.6 },
    u_dvsMax: { type: Cesium.UniformType.FLOAT, value: 4.3 },
  },
  fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
  {
      float dvs = fsInput.metadata.dvs;
      if (dvs < u_dvsMin || dvs > u_dvsMax) {
          material.alpha = 0.0;
          return;
      }
      float r = clamp(-dvs / 3.0, 0.0, 1.0);
      float b = clamp(dvs / 3.0, 0.0, 1.0);
      material.diffuse = vec3(1.0 - b, 1.0 - r - b, 1.0 - r);

      float alpha = clamp(abs(dvs) / 3.0, 0.0, 1.0);
      float transparency = 1.0 - alpha * alpha;
      // To mimic light scattering, use exponential decay
      float thickness = fsInput.voxel.travelDistance / 50000.0;
      material.alpha = 1.0 - pow(transparency, thickness);
  }`,
});

function loadVoxels() {
  return loadOnce("voxels", async function () {
    const resource = await Cesium.IonResource.fromAssetId(4954864);
    const provider = await Cesium.Cesium3DTilesVoxelProvider.fromUrl(resource);
    const voxelPrimitive = new Cesium.VoxelPrimitive({ provider });
    voxelPrimitive.customShader = voxelShader;
    voxelPrimitive.stepSize = 0.23;
    return addHidden(voxelPrimitive);
  });
}

const minLongitudeInput = document.getElementById("minLongitude");
const maxLongitudeInput = document.getElementById("maxLongitude");
const limitGlobeInput = document.getElementById("limitGlobe");
const voxelMaxHeight = -75000.0;
let activeVoxelPrimitive;

function applyVoxelClipping() {
  for (const input of [minLongitudeInput, maxLongitudeInput]) {
    input.nextElementSibling.textContent = `${input.value}°`;
  }
  const west = Cesium.Math.toRadians(Number(minLongitudeInput.value));
  const east = Cesium.Math.toRadians(Number(maxLongitudeInput.value));
  const rectangle = Cesium.Rectangle.fromRadians(
    west,
    Cesium.Math.toRadians(-83.0),
    east,
    Cesium.Math.toRadians(83.0),
  );
  globe.cartographicLimitRectangle = limitGlobeInput.checked
    ? rectangle
    : Cesium.Rectangle.MAX_VALUE;
  if (!Cesium.defined(activeVoxelPrimitive)) {
    return;
  }
  activeVoxelPrimitive.minClippingBounds = new Cesium.Cartesian3(
    west,
    rectangle.south,
    activeVoxelPrimitive.minBounds.z,
  );
  activeVoxelPrimitive.maxClippingBounds = new Cesium.Cartesian3(
    east,
    rectangle.north,
    voxelMaxHeight,
  );
}

for (const input of [minLongitudeInput, maxLongitudeInput, limitGlobeInput]) {
  input.addEventListener("input", applyVoxelClipping);
}

const dvsMinInput = document.getElementById("dvsMin");
const dvsMaxInput = document.getElementById("dvsMax");

function applyDvsRange() {
  for (const input of [dvsMinInput, dvsMaxInput]) {
    input.nextElementSibling.textContent = Number(input.value).toFixed(1);
  }
  voxelShader.setUniform("u_dvsMin", Number(dvsMinInput.value));
  voxelShader.setUniform("u_dvsMax", Number(dvsMaxInput.value));
}

for (const input of [dvsMinInput, dvsMaxInput]) {
  input.addEventListener("input", applyDvsRange);
}
applyDvsRange();

async function showVoxels(context) {
  setTerrain(ellipsoidTerrain);
  naturalEarth.show = true;
  globe.backFaceCulling = false;
  globe.undergroundColor = undefined;
  globe.showSkirts = false;
  globe.translucency.enabled = true;
  globe.translucency.frontFaceAlpha = 0.6;
  scene.skyAtmosphere.show = false;
  applyVoxelClipping();
  camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-37.5, 10.0, 2.0e7),
    duration: 2.0,
  });

  const voxelPrimitive = await loadVoxels();
  if (!context.isActive()) {
    return;
  }
  voxelPrimitive.show = true;
  activeVoxelPrimitive = voxelPrimitive;
  applyVoxelClipping();
}

// EXT_georeference: a model, its bounding box, and the local east-north-up
// axes at the georeferenced location. Exaggerated in size so it reads at
// globe scale.

const georeferenceScale = 80000.0;
// Cesium_Air main mesh bounds in glTF coordinates (x right, y up, z forward)
const airMin = new Cesium.Cartesian3(-12.868, -2.296, -13.397);
const airMax = new Cesium.Cartesian3(12.868, 5.464, 8.005);

function loadGeoreference() {
  return loadOnce("georeference", async function () {
    const dataSource = new Cesium.CustomDataSource("georeference");
    dataSource.show = false;
    await viewer.dataSources.add(dataSource);

    // Lift the origin so the exaggerated model rests on the surface.
    const position = Cesium.Cartesian3.fromDegrees(
      -75.15836368768382,
      39.95090650840344,
      -airMin.y * georeferenceScale,
    );
    // EXT_georeference puts glTF +z north. Cesium orients glTF +z east at
    // heading 0, so turn by -90 degrees, then apply the node's 20 degree
    // heading from the spec example.
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(-90.0 + 20.0),
      0.0,
      0.0,
    );
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr,
    );
    dataSource.entities.add({
      position: position,
      orientation: orientation,
      model: {
        uri: "../SampleData/models/CesiumAir/Cesium_Air.glb",
        scale: georeferenceScale,
      },
    });

    // In the entity's frame glTF (x, y, z) maps to (y, z, x).
    const center = Cesium.Cartesian3.midpoint(
      airMin,
      airMax,
      new Cesium.Cartesian3(),
    );
    const size = Cesium.Cartesian3.subtract(
      airMax,
      airMin,
      new Cesium.Cartesian3(),
    );
    const modelFrame = Cesium.Transforms.headingPitchRollToFixedFrame(
      position,
      hpr,
    );
    const boxCenter = Cesium.Matrix4.multiplyByPoint(
      modelFrame,
      Cesium.Cartesian3.multiplyByScalar(
        new Cesium.Cartesian3(center.z, center.x, center.y),
        georeferenceScale,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    dataSource.entities.add({
      position: boxCenter,
      orientation: orientation,
      box: {
        dimensions: Cesium.Cartesian3.multiplyByScalar(
          new Cesium.Cartesian3(size.z, size.x, size.y),
          georeferenceScale,
          new Cesium.Cartesian3(),
        ),
        fill: false,
        outline: true,
        outlineColor: Cesium.Color.WHITE,
      },
    });

    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    const axisLength = 2.4e6;
    const axes = [
      { column: 0, color: Cesium.Color.RED, text: "East (−x)" },
      { column: 1, color: Cesium.Color.LIME, text: "North (+z)" },
      { column: 2, color: Cesium.Color.DODGERBLUE, text: "Up (+y)" },
    ];
    for (const axis of axes) {
      const direction = Cesium.Matrix4.getColumn(
        enu,
        axis.column,
        new Cesium.Cartesian4(),
      );
      const end = Cesium.Cartesian3.add(
        position,
        Cesium.Cartesian3.multiplyByScalar(
          Cesium.Cartesian3.fromCartesian4(direction),
          axisLength,
          new Cesium.Cartesian3(),
        ),
        new Cesium.Cartesian3(),
      );
      const material = new Cesium.PolylineArrowMaterialProperty(axis.color);
      dataSource.entities.add({
        polyline: {
          positions: [position, end],
          width: 12,
          arcType: Cesium.ArcType.NONE,
          material: material,
          depthFailMaterial: material,
        },
      });
      dataSource.entities.add({
        position: end,
        label: {
          text: axis.text,
          font: "bold 22px system-ui, sans-serif",
          fillColor: axis.color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
    return dataSource;
  });
}

async function showGeoreference(context) {
  setTerrain(ellipsoidTerrain);
  naturalEarth.show = true;
  camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-88.0, 27.0, 9.5e6),
    duration: 2.0,
  });
  const dataSource = await loadGeoreference();
  if (!context.isActive()) {
    return;
  }
  dataSource.show = true;
}

// Slide engine

const slideDemos = {
  intro: showGlobeBackdrop,
  spec: showGlobeBackdrop,
  snowden: showSnowden,
  agi: showAgi,
  georeference: showGeoreference,
  river: showRiver,
  nativeVector: showNativeVector,
  voxels: showVoxels,
};

const panel = document.getElementById("panel");
const sections = Array.from(panel.querySelectorAll(".slide"));
const counter = document.getElementById("counter");
const status = document.getElementById("status");
const diagram = document.getElementById("diagram");
const viewerOverlays = document.querySelectorAll(".viewer-overlay");

function setStatus(message, isError) {
  status.hidden = !Cesium.defined(message);
  status.textContent = message ?? "";
  status.classList.toggle("error", isError === true);
}

function resetScene() {
  spinning = false;
  camera.cancelFlight();
  for (const primitive of slidePrimitives) {
    primitive.show = false;
  }
  for (let i = 0; i < viewer.dataSources.length; i++) {
    viewer.dataSources.get(i).show = false;
  }
  activeVoxelPrimitive = undefined;
  splitUi.hidden = true;
  naturalEarth.show = false;
  globe.cartographicLimitRectangle = Cesium.Rectangle.clone(
    globeDefaults.cartographicLimitRectangle,
  );
  globe.backFaceCulling = globeDefaults.backFaceCulling;
  globe.undergroundColor = Cesium.Color.clone(globeDefaults.undergroundColor);
  globe.showSkirts = globeDefaults.showSkirts;
  globe.translucency.enabled = globeDefaults.translucencyEnabled;
  globe.translucency.frontFaceAlpha = globeDefaults.frontFaceAlpha;
  scene.skyAtmosphere.show = globeDefaults.skyAtmosphereShow;
  scene.shadowMap.enabled = false;
  scene.postProcessStages.ambientOcclusion.enabled = false;
  viewer.clock.currentTime = Cesium.JulianDate.now();
}

let currentIndex = -1;
let generation = 0;

async function showSlide(index) {
  if (index === currentIndex) {
    return;
  }
  currentIndex = index;
  const thisGeneration = ++generation;
  const context = {
    isActive: () => thisGeneration === generation,
  };

  const section = sections[index];
  for (const other of sections) {
    other.hidden = other !== section;
  }
  document.body.dataset.layout = section.dataset.layout;
  const diagramState = section.dataset.diagram;
  diagram.hidden = !Cesium.defined(diagramState);
  if (Cesium.defined(diagramState)) {
    diagram.dataset.state = diagramState;
  }
  counter.textContent = `${index + 1} / ${sections.length}`;
  panel.scrollTop = 0;
  for (const overlay of viewerOverlays) {
    overlay.hidden = overlay.dataset.slide !== section.id;
  }

  resetScene();
  setStatus("Loading…");
  try {
    await slideDemos[section.id](context);
    if (context.isActive()) {
      setStatus(undefined);
    }
  } catch (error) {
    console.error(error);
    if (context.isActive()) {
      setStatus(`Failed to load demo: ${error}`, true);
    }
  }
}

function indexFromHash() {
  const slideNumber = Number.parseInt(window.location.hash.slice(1), 10);
  if (Number.isNaN(slideNumber)) {
    return 0;
  }
  return Cesium.Math.clamp(slideNumber - 1, 0, sections.length - 1);
}

function navigate(index) {
  const clamped = Cesium.Math.clamp(index, 0, sections.length - 1);
  window.location.hash = String(clamped + 1);
}

window.addEventListener("hashchange", function () {
  showSlide(indexFromHash());
});

document.addEventListener("keydown", function (event) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  const inFormControl = event.target instanceof HTMLInputElement;
  let step = 0;
  if (event.key === "PageDown") {
    step = 1;
  } else if (event.key === "PageUp") {
    step = -1;
  } else if (event.key === "ArrowRight" && !inFormControl) {
    step = 1;
  } else if (event.key === "ArrowLeft" && !inFormControl) {
    step = -1;
  }
  if (step === 0) {
    return;
  }
  event.preventDefault();
  if (inFormControl) {
    event.target.blur();
  }
  navigate(currentIndex + step);
});

document.getElementById("prev").addEventListener("click", function (event) {
  event.currentTarget.blur();
  navigate(currentIndex - 1);
});
document.getElementById("next").addEventListener("click", function (event) {
  event.currentTarget.blur();
  navigate(currentIndex + 1);
});

showSlide(indexFromHash());
