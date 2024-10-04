import { defined } from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";

function expandItemsHandler(data, event) {
  const nestedList =
    event.currentTarget.parentElement.parentElement.querySelector(
      `#${data.name}-expander`,
    );
  nestedList.classList.toggle("active");
  event.currentTarget.textContent =
    event.currentTarget.textContent === "+" ? "-" : "+";
}

function trackSublayer(sublayer, viewModel) {
  knockout.track(sublayer);

  for (let i = 0; i < sublayer.sublayers.length; i++) {
    trackSublayer(sublayer.sublayers[i], viewModel);
  }
}

function isFullModel(layer) {
  return layer.modelName === "FullModel";
}

function isOverview(layer) {
  return layer.modelName === "Overview";
}

function isTopLayer(layer) {
  return isOverview(layer) || isFullModel(layer);
}

function addTopLayer(layer, viewModel) {
  if (isTopLayer(layer)) {
    layer.visibility = false;
    for (let i = 0; i < layer.sublayers.length; i++) {
      layer.sublayers[i].visibility = true;
    }

    const topLayer = {
      name: layer.name,
      modelName: layer.modelName,
      disable: knockout.observable(false),
      index: viewModel.sublayers.length,
    };
    viewModel.topLayers.push(topLayer);
    viewModel.sublayers.push(layer);
    return topLayer;
  }
}

function handleTopLayerSelector(layer, viewModel) {
  if (isTopLayer(layer)) {
    viewModel.sublayers.forEach((elem) => (elem.visibility = false));
    viewModel.sublayers[layer.index].visibility = true;
    const bsl = document.getElementById("bsl-wrapper");
    if (isFullModel(layer)) {
      viewModel.currentLevel = viewModel.selectedLevel;
      bsl.style.display = "block";
    } else {
      viewModel.selectedLevel = viewModel.currentLevel;
      viewModel.currentLevel = "All";
      bsl.style.display = "none";
    }
  }
}

async function setLevels(i3sProvider, levels) {
  try {
    const attributes = i3sProvider.getAttributeNames();
    for (let index = 0; index < attributes.length; index++) {
      if (attributes[index] === "BldgLevel") {
        const values = i3sProvider.getAttributeValues(attributes[index]);
        for (let i = 0; i < values.length; i++) {
          levels.push(values[i]);
        }
      }
    }

    levels.sort((a, b) => a - b);
    levels.unshift("All");
  } catch (error) {
    console.log(`There was an error getting attributes: ${error}`);
  }
}

/**
 * The view model for {@link I3SBuildingSceneLayerExplorer}.
 * @alias I3sBslExplorerViewModel
 * @constructor
 *
 * @param {I3SDataProvider} i3sProvider I3S Data provider instance.
 */
function I3SBuildingSceneLayerExplorerViewModel(i3sProvider) {
  const that = this;
  this.levels = [];
  this.viewModel = {
    sublayers: [],
    levels: this.levels,
    currentLevel: knockout.observable(),
    selectedLevel: "All",
    topLayers: [
      {
        name: "Select a layer to explore...",
        disable: knockout.observable(true),
        index: -1,
      },
    ],
    currentLayer: knockout.observable(),
    expandClickHandler: expandItemsHandler,
    setOptionDisable: function (option, item) {
      knockout.applyBindingsToNode(option, { disable: item.disable }, item);
    },
    defaultLayer: undefined,
  };

  // Handling change of a layer for exploring
  this.viewModel.currentLayer.subscribe(function (layer) {
    handleTopLayerSelector(layer, that.viewModel);
  });

  // Setting a sublayers tree to the viewModel
  const sublayers = i3sProvider.sublayers;
  for (let i = 0; i < sublayers.length; i++) {
    trackSublayer(sublayers[i], this.viewModel);
    const topLayer = addTopLayer(sublayers[i], this.viewModel);
    if (
      defined(topLayer) &&
      (isOverview(topLayer) ||
        (!defined(this.viewModel.defaultLayer) && isFullModel(topLayer)))
    ) {
      this.viewModel.defaultLayer = topLayer;
    }
  }
  // There is no Full Model and/or Overview
  if (this.viewModel.topLayers.length === 1 && sublayers.length > 0) {
    i3sProvider.show = false;
    const fullModel = {
      name: "Full Model",
      modelName: "FullModel",
      visibility: i3sProvider.show,
      sublayers: i3sProvider.sublayers,
    };
    this.viewModel.defaultLayer = addTopLayer(fullModel, this.viewModel);
    this.viewModel.currentLayer.subscribe(function (layer) {
      i3sProvider.show = isFullModel(layer);
    });
  } else if (this.viewModel.topLayers.length === 1) {
    this.viewModel.topLayers[0].name = "Building layers not found";
  }

  // Setting levels to the viewModel
  setLevels(i3sProvider, this.levels);

  // Filtering by levels
  this.viewModel.currentLevel.subscribe(function (newValue) {
    if (newValue !== "All") {
      i3sProvider.filterByAttributes([
        {
          name: "BldgLevel",
          values: [newValue],
        },
      ]);
    } else {
      i3sProvider.filterByAttributes();
    }
  });

  return this.viewModel;
}

export default I3SBuildingSceneLayerExplorerViewModel;
