import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

let activeDataSource;

async function loadCzml(czml) {
  viewer.dataSources.removeAll();
  activeDataSource = await viewer.dataSources.add(Cesium.CzmlDataSource.load(czml));
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

async function loadWholeAsMaterialMode(materialMode) {
  let cached = czmlFileCache.get("TimeDependentPaths_Whole.czml");
  if (!cached) {
    const response = await fetch(`${basePath}TimeDependentPaths_Whole.czml`);
    cached = await response.json();
    czmlFileCache.set("TimeDependentPaths_Whole.czml", cached);
  }

  const czml = cloneCzml(cached);
  for (let i = 0; i < czml.length; i++) {
    if (czml[i].path) {
      czml[i].path.materialMode = materialMode;
    }
  }

  await loadCzml(czml);
}

async function loadSatelliteLaunchAsMaterialMode(materialMode) {
  let cached = czmlFileCache.get("SatelliteLaunch.czml");
  if (!cached) {
    const response = await fetch(`${basePath}SatelliteLaunch.czml`);
    cached = await response.json();
    czmlFileCache.set("SatelliteLaunch.czml", cached);
  }

  const czml = cloneCzml(cached);
  for (let i = 0; i < czml.length; i++) {
    if (czml[i].path) {
      czml[i].path.materialMode = materialMode;
    }
  }

  await loadCzml(czml);
}

let sampledResolutionSeconds = 60;
let selectedModel = "launch";
let launchPathWindowEnabled = true;
const launchPathWindowSeconds = 21600;
const selectedMaterialModeByModel = {
  orbit: "PORTIONS",
  flight: "PORTIONS",
  sampled: "PORTIONS",
};

function getSelectedMaterialMode() {
  return selectedMaterialModeByModel[selectedModel] || "PORTIONS";
}

function resetSelectedMaterialModeToDefault() {
  selectedMaterialModeByModel[selectedModel] = "PORTIONS";
}

function get2026CzmlReversed(materialMode) {
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
      position: {
        epoch: "2026-04-01T00:00:00Z",
        cartographicDegrees: [
          0, -83, 10, 170000, 60, -78, 24, 140000, 120, -75, 15, 160000, 180,
          -70, 20, 150000,
        ],
      },
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
      position: {
        epoch: "2026-04-01T00:00:00Z",
        cartographicDegrees: [
          0, -70, 20, 150000, 60, -75, 15, 160000, 120, -78, 24, 140000, 180,
          -83, 10, 170000,
        ],
      },
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
    container = document.createElement("div");
    container.id = id;
    document.getElementById("toolbar").appendChild(container);
  }
  return container;
}

function setToolbarContainerVisible(id, visible) {
  const container = document.getElementById(id);
  if (container) {
    container.style.display = visible ? "" : "none";
  }
}

function addPathKeyLegend() {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) {
    return;
  }

  let key = document.getElementById("timeDependentPathKey");
  if (!key) {
    key = document.createElement("div");
    key.id = "timeDependentPathKey";
    key.className = "backdrop";
    key.style.display = "none";
    key.style.padding = "8px 10px";
    key.style.backgroundColor = "#36393f";
    key.style.borderRadius = "6px";
    key.style.minWidth = "190px";
    key.style.fontSize = "12px";
    key.style.lineHeight = "1.4";
    key.style.marginTop = "6px";
    key.style.color = "#fff";

    const title = document.createElement("div");
    title.textContent = "Key";
    title.style.fontWeight = "600";
    title.style.marginBottom = "6px";
    key.appendChild(title);

    function addLegendRow(color, text, dashed) {
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

    addLegendRow("#ff0000", "Phase 1", false);
    addLegendRow("#00ff00", "Phase 2", false);
    addLegendRow("#ff00ff", "Phase 3", true);

    toolbar.appendChild(key);
  }
}

function setPathKeyLegendVisible(visible) {
  const key = document.getElementById("timeDependentPathKey");
  if (key) {
    key.style.display = visible ? "block" : "none";
  }
}

function addSatelliteLaunchLegend() {
  const toolbar = document.getElementById("toolbar");
  if (!toolbar) {
    return;
  }

  let key = document.getElementById("satelliteLaunchKey");
  if (!key) {
    key = document.createElement("div");
    key.id = "satelliteLaunchKey";
    key.className = "backdrop";
    key.style.display = "none";
    key.style.padding = "8px 10px";
    key.style.backgroundColor = "#36393f";
    key.style.borderRadius = "6px";
    key.style.minWidth = "280px";
    key.style.fontSize = "12px";
    key.style.lineHeight = "1.4";
    key.style.marginTop = "6px";
    key.style.color = "#fff";

    const title = document.createElement("div");
    title.textContent = "Key";
    title.style.fontWeight = "600";
    title.style.marginBottom = "6px";
    key.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.style.opacity = "0.9";
    subtitle.style.marginBottom = "6px";
    key.appendChild(subtitle);

    function addLegendRow(color, text) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.margin = "4px 0";

      const swatch = document.createElement("span");
      swatch.style.width = "26px";
      swatch.style.height = "0";
      swatch.style.display = "inline-block";
      swatch.style.borderTop = `3px solid ${color}`;

      const label = document.createElement("span");
      label.textContent = text;

      row.appendChild(swatch);
      row.appendChild(label);
      key.appendChild(row);
    }

    addLegendRow("#ff0000", "Launch into low Earth orbit");
    addLegendRow("#ffa500", "Coast to 1st descending node");
    addLegendRow("#ffff00", "Apogee raising maneuver");
    addLegendRow("#00ff00", "Propagate to apogee");
    addLegendRow("#00ffff", "Perigee raising maneuver");
    addLegendRow("#ff00ff", "Drift to station");
    addLegendRow("#008000", "Post-drift/Pre-circularization");
    addLegendRow("#ffc0cb", "On station");

    toolbar.appendChild(key);
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

async function applySelection() {
  const selectedMaterialMode = getSelectedMaterialMode();
  setPathKeyLegendVisible(false);
  setSatelliteLaunchLegendVisible(false);

  if (selectedModel === "orbit") {
    setPathKeyLegendVisible(true);

    if (selectedMaterialMode === "VARYING") {
      await loadCzmlFile("TimeDependentPaths_VaryingMaterialMode.czml");
      await frameViewForModel("orbit");
      return;
    }

    if (selectedMaterialMode === "WHOLE") {
      await loadCzmlFile("TimeDependentPaths_Whole.czml");
      await frameViewForModel("orbit");
      return;
    }

    await loadWholeAsMaterialMode("PORTIONS");
    await frameViewForModel("orbit");
    return;
  }

  if (selectedModel === "flight") {
    await loadCzml(get2026CzmlReversed(selectedMaterialMode));
    await frameViewForModel("flight");
    return;
  }

  if (selectedModel === "launch") {
    setSatelliteLaunchLegendVisible(true);
    await loadSatelliteLaunchAsMaterialMode(selectedMaterialMode);
    applyLaunchPathWindowSetting();
    await frameViewForModel("launch");
    return;
  }

  await loadSampledCzml(selectedMaterialMode);
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
