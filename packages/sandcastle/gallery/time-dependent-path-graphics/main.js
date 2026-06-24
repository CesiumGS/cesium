import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

let activeDataSource;

async function loadCzml(czml) {
  viewer.dataSources.removeAll();
  activeDataSource = await viewer.dataSources.add(
    Cesium.CzmlDataSource.load(czml),
  );
}

async function frameViewForModel(model) {
  if (model === "orbit" || model === "launch") {
    viewer.camera.flyHome(0.8);
    return;
  }

  await viewer.camera.flyTo({
    // The flight/sampled path spans roughly lon [-83, -70], lat [10, 24].
    destination: Cesium.Cartesian3.fromDegrees(-76.5, 17.0, 2500000.0),
    orientation: {
      heading: 0.0,
      pitch: -Cesium.Math.PI_OVER_TWO,
      roll: 0.0,
    },
    duration: 0.5,
  });
}

const basePath = "../../SampleData/";
const czmlFileCache = new Map();

function cloneCzml(czml) {
  return JSON.parse(JSON.stringify(czml));
}

async function loadCzmlFile(fileName) {
  let cached = czmlFileCache.get(fileName);
  if (!cached) {
    const response = await fetch(`${basePath}${fileName}`);
    cached = await response.json();
    czmlFileCache.set(fileName, cached);
  }
  await loadCzml(cloneCzml(cached));
}

async function loadCzmlWithMaterialMode(fileName, materialMode) {
  let cached = czmlFileCache.get(fileName);
  if (!cached) {
    const response = await fetch(`${basePath}${fileName}`);
    cached = await response.json();
    czmlFileCache.set(fileName, cached);
  }

  const czml = cloneCzml(cached);
  for (let i = 0; i < czml.length; i++) {
    if (czml[i].path) {
      czml[i].path.materialMode = materialMode;
    }
  }

  await loadCzml(czml);
}

async function loadWholeAsMaterialMode(materialMode) {
  await loadCzmlWithMaterialMode("TimeDependentPaths_Whole.czml", materialMode);
}

async function loadSatelliteLaunchAsMaterialMode(materialMode) {
  await loadCzmlWithMaterialMode("SatelliteLaunch.czml", materialMode);
}

let sampledResolutionSeconds = 60;
let selectedModel = "launch";
let launchPathWindowEnabled = true;
const launchPathWindowSeconds = 21600;
const selectedMaterialModeByModel = {
  orbit: "PORTIONS",
  flight: "PORTIONS",
  constant: "PORTIONS",
  sampled: "PORTIONS",
};
const flightPathPositionData = {
  epoch: "2026-04-01T00:00:00Z",
  cartographicDegrees: [
    0, -70, 20, 150000, 60, -75, 15, 160000, 120, -78, 24, 140000, 180,
    -83, 10, 170000,
  ],
};

function getSelectedMaterialMode() {
  return selectedMaterialModeByModel[selectedModel] || "PORTIONS";
}

function resetSelectedMaterialModeToDefault() {
  selectedMaterialModeByModel[selectedModel] = "PORTIONS";
}

function getSegmentsCzml(materialMode) {
  return [
    {
      id: "document",
      version: "1.0",
      clock: {
        interval: "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
        currentTime: "2026-04-01T00:00:00Z",
        multiplier: 5,
      },
    },
    {
      availability: "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      position: flightPathPositionData,
      point: {
        show: true,
        color: {
          rgba: [255, 255, 255, 255],
        },
        pixelSize: 8,
      },
      label: {
        show: true,
        text: "Object",
        scale: 0.7,
        pixelOffset: {
          cartesian2: [5, -5],
        },
        horizontalOrigin: "LEFT",
        verticalOrigin: "CENTER",
        fillColor: {
          rgba: [255, 255, 255, 255],
        },
        showBackground: true,
        backgroundColor: {
          rgba: [32, 32, 32, 170],
        },
      },
      path: {
        width: 8,
        resolution: 1.0,
        materialMode: materialMode || "PORTIONS",
        material: [
          {
            interval: "2026-04-01T00:00:00Z/2026-04-01T00:01:00Z",
            solidColor: {
              color: {
                rgba: [255, 0, 0, 255],
              },
            },
          },
          {
            interval: "2026-04-01T00:01:00Z/2026-04-01T00:02:00Z",
            polylineGlow: {
              color: {
                rgba: [128, 0, 128, 255],
              },
              glowPower: {
                epoch: "2026-04-01T00:01:00Z",
                number: [0, 0, 60, 1],
              },
            },
          },
          {
            interval: "2026-04-01T00:02:00Z/2026-04-01T00:03:00Z",
            polylineDash: {
              color: [
                {
                  interval: "2026-04-01T00:02:00Z/2026-04-01T00:02:30Z",
                  rgba: [144, 238, 144, 255],
                },
                {
                  interval: "2026-04-01T00:02:30Z/2026-04-01T00:03:00Z",
                  rgba: [240, 128, 128, 255],
                },
              ],
            },
          },
        ],
      },
    },
  ];
}

function getSampledCzml(materialMode, resolutionSeconds) {
  return [
    {
      id: "document",
      version: "1.0",
      clock: {
        interval: "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
        currentTime: "2026-04-01T00:00:00Z",
        multiplier: 5,
      },
    },
    {
      availability: "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      position: flightPathPositionData,
      point: {
        show: true,
        color: {
          rgba: [255, 255, 255, 255],
        },
        pixelSize: 8,
      },
      label: {
        show: true,
        text: "Object",
        scale: 0.7,
        pixelOffset: {
          cartesian2: [5, -5],
        },
        horizontalOrigin: "LEFT",
        verticalOrigin: "CENTER",
        fillColor: {
          rgba: [255, 255, 255, 255],
        },
        showBackground: true,
        backgroundColor: {
          rgba: [32, 32, 32, 170],
        },
      },
      path: {
        width: 8,
        resolution: resolutionSeconds || 60,
        materialMode: materialMode || "PORTIONS",
        material: {
          solidColor: {
            color: [
              {
                epoch: "2026-04-01T00:00:00Z",
                rgba: [0, 255, 0, 0, 255, 180, 0, 255, 0, 255],
              },
            ],
          },
        },
      },
    },
  ];
}

function getConstantMaterialCzml(materialMode) {
  return [
    {
      id: "document",
      version: "1.0",
      clock: {
        interval: "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
        currentTime: "2026-04-01T00:00:00Z",
        multiplier: 5,
      },
    },
    {
      availability: "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      position: flightPathPositionData,
      point: {
        show: true,
        color: {
          rgba: [255, 255, 255, 255],
        },
        pixelSize: 8,
      },
      label: {
        show: true,
        text: "Object",
        scale: 0.7,
        pixelOffset: {
          cartesian2: [5, -5],
        },
        horizontalOrigin: "LEFT",
        verticalOrigin: "CENTER",
        fillColor: {
          rgba: [255, 255, 255, 255],
        },
        showBackground: true,
        backgroundColor: {
          rgba: [32, 32, 32, 170],
        },
      },
      path: {
        width: 8,
        resolution: 1.0,
        materialMode: materialMode || "PORTIONS",
        material: {
          solidColor: {
            color: {
              rgba: [0, 255, 255, 255],
            },
          },
        },
      },
    },
  ];
}

async function loadSampledCzml(materialMode) {
  await loadCzml(getSampledCzml(materialMode, sampledResolutionSeconds));
}

async function setSampledResolution(seconds) {
  sampledResolutionSeconds = seconds;
  if (selectedModel === "sampled") {
    await loadSampledCzml(getSelectedMaterialMode());
  }
}

function getMaterialOptionsForModel(model) {
  if (model === "orbit") {
    return ["PORTIONS", "WHOLE", "VARYING"];
  }
  return ["PORTIONS", "WHOLE"];
}

function addToolbarContainer(id) {
  let container = document.getElementById(id);
  if (!container) {
    const toolbar = document.getElementById("toolbar");
    if (!toolbar) {
      return undefined;
    }

    container = document.createElement("div");
    container.id = id;
    toolbar.appendChild(container);
  }
  return container;
}

function setToolbarContainerVisible(id, visible) {
  const container = document.getElementById(id);
  if (container) {
    container.style.display = visible ? "" : "none";
  }
}

function createLegendKey(id, minWidthPx) {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) {
    return undefined;
  }

  let key = document.getElementById(id);
  if (!key) {
    key = document.createElement("div");
    key.id = id;
    key.className = "backdrop";
    key.style.display = "none";
    key.style.padding = "8px 10px";
    key.style.backgroundColor = "#36393f";
    key.style.borderRadius = "6px";
    key.style.minWidth = `${minWidthPx}px`;
    key.style.fontSize = "12px";
    key.style.lineHeight = "1.4";
    key.style.marginTop = "6px";
    key.style.color = "#fff";

    const title = document.createElement("div");
    title.textContent = "Key";
    title.style.fontWeight = "600";
    title.style.marginBottom = "6px";
    key.appendChild(title);

    toolbar.appendChild(key);
  }

  return key;
}

function addLegendRow(key, color, text, dashed) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";
  row.style.margin = "4px 0";

  const swatch = document.createElement("span");
  swatch.style.width = "26px";
  swatch.style.height = "0";
  swatch.style.display = "inline-block";
  swatch.style.borderTop = `3px ${dashed ? "dashed" : "solid"} ${color}`;

  const label = document.createElement("span");
  label.textContent = text;

  row.appendChild(swatch);
  row.appendChild(label);
  key.appendChild(row);
}

function addPathKeyLegend() {
  const key = createLegendKey("timeDependentPathKey", 190);
  if (!key) {
    return;
  }

  if (key.childElementCount === 1) {
    addLegendRow(key, "#ff0000", "Phase 1", false);
    addLegendRow(key, "#00ff00", "Phase 2", false);
    addLegendRow(key, "#ff00ff", "Phase 3", true);
  }
}

function setPathKeyLegendVisible(visible) {
  const key = document.getElementById("timeDependentPathKey");
  if (key) {
    key.style.display = visible ? "block" : "none";
  }
}

function addSatelliteLaunchLegend() {
  const key = createLegendKey("satelliteLaunchKey", 280);
  if (!key) {
    return;
  }

  if (key.childElementCount === 1) {
    addLegendRow(key, "#ff0000", "Launch into low Earth orbit", false);
    addLegendRow(key, "#ffa500", "Coast to 1st descending node", false);
    addLegendRow(key, "#ffff00", "Apogee raising maneuver", false);
    addLegendRow(key, "#00ff00", "Propagate to apogee", false);
    addLegendRow(key, "#00ffff", "Perigee raising maneuver", false);
    addLegendRow(key, "#ff00ff", "Drift to station", false);
    addLegendRow(key, "#008000", "Post-drift/Pre-circularization", false);
    addLegendRow(key, "#ffc0cb", "On station", false);
  }
}

function setSatelliteLaunchLegendVisible(visible) {
  const key = document.getElementById("satelliteLaunchKey");
  if (key) {
    key.style.display = visible ? "block" : "none";
  }
}

function applyLaunchPathWindowSetting() {
  if (!activeDataSource) {
    return;
  }

  const sat = activeDataSource.entities.getById("Sat");
  if (!sat || !sat.path) {
    return;
  }

  if (launchPathWindowEnabled) {
    sat.path.leadTime = new Cesium.ConstantProperty(launchPathWindowSeconds);
    sat.path.trailTime = new Cesium.ConstantProperty(launchPathWindowSeconds);
  } else {
    sat.path.leadTime = undefined;
    sat.path.trailTime = undefined;
  }
}

function renderLaunchPathWindowToggle() {
  const container = document.getElementById(launchPathWindowContainerId);
  if (!container) {
    return;
  }

  container.innerHTML = "";
  const button = document.createElement("button");
  button.className = "cesium-button";
  button.textContent = launchPathWindowEnabled
    ? "Path window: ON (6h lead/trail)"
    : "Path window: OFF (full path)";
  button.onclick = function () {
    launchPathWindowEnabled = !launchPathWindowEnabled;
    applyLaunchPathWindowSetting();
    renderLaunchPathWindowToggle();
  };

  container.appendChild(button);
}

let latestSelectionRequestId = 0;

async function applySelection() {
  const selectionRequestId = ++latestSelectionRequestId;
  function isStaleRequest() {
    return selectionRequestId !== latestSelectionRequestId;
  }

  const selectedMaterialMode = getSelectedMaterialMode();
  setPathKeyLegendVisible(false);
  setSatelliteLaunchLegendVisible(false);

  if (selectedModel === "orbit") {
    setPathKeyLegendVisible(true);

    if (selectedMaterialMode === "VARYING") {
      await loadCzmlFile("TimeDependentPaths_VaryingMaterialMode.czml");
      if (isStaleRequest()) {
        return;
      }
      await frameViewForModel("orbit");
      return;
    }

    if (selectedMaterialMode === "WHOLE") {
      await loadCzmlFile("TimeDependentPaths_Whole.czml");
      if (isStaleRequest()) {
        return;
      }
      await frameViewForModel("orbit");
      return;
    }

    await loadWholeAsMaterialMode("PORTIONS");
    if (isStaleRequest()) {
      return;
    }
    await frameViewForModel("orbit");
    return;
  }

  if (selectedModel === "flight") {
    await loadCzml(getSegmentsCzml(selectedMaterialMode));
    if (isStaleRequest()) {
      return;
    }
    await frameViewForModel("flight");
    return;
  }

  if (selectedModel === "constant") {
    await loadCzml(getConstantMaterialCzml(selectedMaterialMode));
    if (isStaleRequest()) {
      return;
    }
    await frameViewForModel("constant");
    return;
  }

  if (selectedModel === "launch") {
    setSatelliteLaunchLegendVisible(true);
    await loadSatelliteLaunchAsMaterialMode(selectedMaterialMode);
    if (isStaleRequest()) {
      return;
    }
    applyLaunchPathWindowSetting();
    await frameViewForModel("launch");
    return;
  }

  await loadSampledCzml(selectedMaterialMode);
  if (isStaleRequest()) {
    return;
  }
  await frameViewForModel("sampled");
}

const modelMenuContainerId = "timeDependentPathModelMenu";
const materialMenuContainerId = "timeDependentPathMaterialModeMenu";
const sampledResolutionMenuContainerId =
  "timeDependentPathSampledResolutionMenu";
const launchPathWindowContainerId = "timeDependentPathLaunchWindowToggle";

addToolbarContainer(modelMenuContainerId);
addToolbarContainer(materialMenuContainerId);
addToolbarContainer(sampledResolutionMenuContainerId);
addToolbarContainer(launchPathWindowContainerId);
addPathKeyLegend();
addSatelliteLaunchLegend();
renderLaunchPathWindowToggle();

const modelOptions = [
  {
    text: "Model: satellite launch phases",
    value: "launch",
    onselect: async function () {
      selectedModel = "launch";
      resetSelectedMaterialModeToDefault();
      renderMaterialMenu();
      setToolbarContainerVisible(sampledResolutionMenuContainerId, false);
      setToolbarContainerVisible(launchPathWindowContainerId, true);
      renderLaunchPathWindowToggle();
      await applySelection();
    },
  },
  {
    text: "Model: orbit",
    value: "orbit",
    onselect: async function () {
      selectedModel = "orbit";
      resetSelectedMaterialModeToDefault();
      renderMaterialMenu();
      setToolbarContainerVisible(sampledResolutionMenuContainerId, false);
      setToolbarContainerVisible(launchPathWindowContainerId, false);
      await applySelection();
    },
  },
  {
    text: "Model: flight path with segments",
    value: "flight",
    onselect: async function () {
      selectedModel = "flight";
      resetSelectedMaterialModeToDefault();
      renderMaterialMenu();
      setToolbarContainerVisible(sampledResolutionMenuContainerId, false);
      setToolbarContainerVisible(launchPathWindowContainerId, false);
      await applySelection();
    },
  },
  {
    text: "Model: sampled flight path",
    value: "sampled",
    onselect: async function () {
      selectedModel = "sampled";
      resetSelectedMaterialModeToDefault();
      renderMaterialMenu();
      setToolbarContainerVisible(sampledResolutionMenuContainerId, true);
      setToolbarContainerVisible(launchPathWindowContainerId, false);
      await applySelection();
    },
  },
  {
    text: "Model: flight path with constant material",
    value: "constant",
    onselect: async function () {
      selectedModel = "constant";
      resetSelectedMaterialModeToDefault();
      renderMaterialMenu();
      setToolbarContainerVisible(sampledResolutionMenuContainerId, false);
      setToolbarContainerVisible(launchPathWindowContainerId, false);
      await applySelection();
    },
  },
];

function renderModelMenu() {
  const container = document.getElementById(modelMenuContainerId);
  container.innerHTML = "";
  Sandcastle.addToolbarMenu(modelOptions, modelMenuContainerId);

  const menu = container.querySelector("select");
  if (menu) {
    menu.value = selectedModel;
  }
}

function renderMaterialMenu() {
  const container = document.getElementById(materialMenuContainerId);
  container.innerHTML = "";

  const allowedModes = getMaterialOptionsForModel(selectedModel);
  let selectedMaterialMode = getSelectedMaterialMode();
  if (allowedModes.indexOf(selectedMaterialMode) === -1) {
    selectedMaterialModeByModel[selectedModel] = allowedModes[0];
    selectedMaterialMode = allowedModes[0];
  }

  const materialOptions = allowedModes.map(function (mode) {
    const modeLabel =
      mode === "PORTIONS"
        ? "PORTIONS"
        : mode === "WHOLE"
          ? "WHOLE"
          : "time-varying";

    return {
      text: `materialMode: ${modeLabel}`,
      value: mode,
      onselect: async function () {
        selectedMaterialModeByModel[selectedModel] = mode;
        await applySelection();
      },
    };
  });

  Sandcastle.addToolbarMenu(materialOptions, materialMenuContainerId);

  const menu = container.querySelector("select");
  if (menu) {
    menu.value = selectedMaterialMode;
  }
}

function renderSampledResolutionMenu() {
  const container = document.getElementById(sampledResolutionMenuContainerId);
  container.innerHTML = "";

  Sandcastle.addToolbarMenu(
    [
      {
        text: "Sampled resolution: 60s",
        value: "60",
        onselect: async function () {
          await setSampledResolution(60);
        },
      },
      {
        text: "Sampled resolution: 30s",
        value: "30",
        onselect: async function () {
          await setSampledResolution(30);
        },
      },
      {
        text: "Sampled resolution: 10s",
        value: "10",
        onselect: async function () {
          await setSampledResolution(10);
        },
      },
    ],
    sampledResolutionMenuContainerId,
  );

  const menu = container.querySelector("select");
  if (menu) {
    menu.value = String(sampledResolutionSeconds);
  }
}

renderModelMenu();
renderMaterialMenu();
renderSampledResolutionMenu();
setToolbarContainerVisible(
  sampledResolutionMenuContainerId,
  selectedModel === "sampled",
);
setToolbarContainerVisible(
  launchPathWindowContainerId,
  selectedModel === "launch",
);
applySelection();
