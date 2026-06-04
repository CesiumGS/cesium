import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

async function loadCzml(czml) {
  viewer.dataSources.removeAll();
  await viewer.dataSources.add(Cesium.CzmlDataSource.load(czml));
}

async function frameViewForModel(model) {
  if (model === "orbit") {
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

let sampledResolutionSeconds = 60;
let selectedModel = "orbit";
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

function get2026Czml(materialMode) {
  return [
    {
      "id": "document",
      "version": "1.0",
      "clock": {
        "interval": "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
        "currentTime": "2026-04-01T00:00:00Z",
        "multiplier": 5
      }
    },
    {
      "availability": "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      "position": {
        "epoch": "2026-04-01T00:00:00Z",
        "cartographicDegrees": [
          0, -70, 20, 150000,
          60, -75, 15, 160000,
          120, -78, 24, 140000,
          180, -83, 10, 170000
        ]
      },
      "billboard": {
        "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjA1G8PgXAAAAKpJREFUOE+Vk80NwCAIhR3NURiloziKo3SE3nugQsUYfqo14dLkfbwHNKWfL+eKTUL1/5FYagUxHWYxlIpUBgJw8EfIbHFAPHGPYmLgWRMWMBC2Lp1DMd4XAwTSXYgTBkRisYICIbHnZGf0nJ9AtbiQHcYrnCE83DZkGTTFNCR1JAOy2jmDgiMZ6+ydfftfR6KEvm0BeHvWnb3sqyPZ+nHCI3GnHSxyq5PWPvZO1Mf6/eeiAAAAAElFTkSuQmCC"
      },
      "path": {
        "width": 8,
        "resolution": 1.0,
        "materialMode": materialMode || "PORTIONS",
        "material": [
          {
            "interval": "2026-04-01T00:00:00Z/2026-04-01T00:01:00Z",
            "solidColor": {
              "color": {
                "rgba": [255, 0, 0, 255]
              }
            }
          },
          {
            "interval": "2026-04-01T00:01:00Z/2026-04-01T00:02:00Z",
            "polylineGlow": {
              "color": {
                "rgba": [128, 0, 128, 255]
              },
              "glowPower": {
                "epoch": "2026-04-01T00:01:00Z",
                "number": [0, 0, 60, 1]
              }
            }
          },
          {
            "interval": "2026-04-01T00:02:00Z/2026-04-01T00:03:00Z",
            "polylineDash": {
              "color": [
                {
                  "interval": "2026-04-01T00:02:00Z/2026-04-01T00:02:30Z",
                  "rgba": [144, 238, 144, 255]
                },
                {
                  "interval": "2026-04-01T00:02:30Z/2026-04-01T00:03:00Z",
                  "rgba": [240, 128, 128, 255]
                }
              ]
            }
          }
        ]
      }
    }
  ];
}

function getSampledCzml(materialMode, resolutionSeconds) {
  return [
    {
      "id": "document",
      "version": "1.0",
      "clock": {
        "interval": "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
        "currentTime": "2026-04-01T00:00:00Z",
        "multiplier": 5
      }
    },
    {
      "availability": "2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      "position": {
        "epoch": "2026-04-01T00:00:00Z",
        "cartographicDegrees": [
          0, -70, 20, 150000,
          60, -75, 15, 160000,
          120, -78, 24, 140000,
          180, -83, 10, 170000
        ]
      },
      "billboard": {
        "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjA1G8PgXAAAAKpJREFUOE+Vk80NwCAIhR3NURiloziKo3SE3nugQsUYfqo14dLkfbwHNKWfL+eKTUL1/5FYagUxHWYxlIpUBgJw8EfIbHFAPHGPYmLgWRMWMBC2Lp1DMd4XAwTSXYgTBkRisYICIbHnZGf0nJ9AtbiQHcYrnCE83DZkGTTFNCR1JAOy2jmDgiMZ6+ydfftfR6KEvm0BeHvWnb3sqyPZ+nHCI3GnHSxyq5PWPvZO1Mf6/eeiAAAAAElFTkSuQmCC"
      },
      "path": {
        "width": 8,
        "resolution": resolutionSeconds || 60,
        "materialMode": materialMode || "PORTIONS",
        "material": {
          "solidColor": {
            "color": [
              {
                "epoch": "2026-04-01T00:00:00Z",
                "rgba": [0, 255, 0, 0, 255, 180, 0, 255, 0, 255]
              }
            ]
          }
        }
      }
    }
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

function ensureToolbarContainer(id) {
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

async function applySelection() {
  const selectedMaterialMode = getSelectedMaterialMode();

  if (selectedModel === "orbit") {
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
    await loadCzml(get2026Czml(selectedMaterialMode));
    await frameViewForModel("flight");
    return;
  }

  await loadSampledCzml(selectedMaterialMode);
  await frameViewForModel("sampled");
}

const modelMenuContainerId = "timeDependentPathModelMenu";
const materialMenuContainerId = "timeDependentPathMaterialModeMenu";
const sampledResolutionMenuContainerId = "timeDependentPathSampledResolutionMenu";

ensureToolbarContainer(modelMenuContainerId);
ensureToolbarContainer(materialMenuContainerId);
ensureToolbarContainer(sampledResolutionMenuContainerId);

const modelOptions = [
  {
    text: "Model: orbit",
    value: "orbit",
    onselect: async function () {
      selectedModel = "orbit";
      resetSelectedMaterialModeToDefault();
      renderMaterialMenu();
      setToolbarContainerVisible(sampledResolutionMenuContainerId, false);
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
setToolbarContainerVisible(sampledResolutionMenuContainerId, false);
applySelection();

