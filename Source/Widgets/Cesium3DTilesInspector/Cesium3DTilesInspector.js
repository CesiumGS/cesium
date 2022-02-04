import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import knockout from "../../ThirdParty/knockout.js";
import getElement from "../getElement.js";
import InspectorShared from "../InspectorShared.js";
import Cesium3DTilesInspectorViewModel from "./Cesium3DTilesInspectorViewModel.js";

/**
 * Inspector widget to aid in debugging 3D Tiles
 *
 * @alias Cesium3DTilesInspector
 * @constructor
 *
 * @param {Element|String} container The DOM element or ID that will contain the widget.
 * @param {Scene} scene the Scene instance to use.
 */
function Cesium3DTilesInspector(container, scene) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("container", container);
  Check.typeOf.object("scene", scene);
  //>>includeEnd('debug');

  container = getElement(container);
  const element = document.createElement("div");
  const performanceContainer = document.createElement("div");
  performanceContainer.setAttribute("data-bind", "visible: performance");
  const viewModel = new Cesium3DTilesInspectorViewModel(
    scene,
    performanceContainer
  );

  this._viewModel = viewModel;
  this._container = container;
  this._element = element;

  const text = document.createElement("div");
  text.textContent = "3D Tiles Inspector";
  text.className = "cesium-cesiumInspector-button";
  text.setAttribute("data-bind", "click: toggleInspector");
  element.appendChild(text);
  element.className = "cesium-cesiumInspector cesium-3DTilesInspector";
  element.setAttribute(
    "data-bind",
    'css: { "cesium-cesiumInspector-visible" : inspectorVisible, "cesium-cesiumInspector-hidden" : !inspectorVisible}'
  );
  container.appendChild(element);

  const panel = document.createElement("div");
  this._panel = panel;
  panel.className = "cesium-cesiumInspector-dropDown";
  element.appendChild(panel);

  const createSection = InspectorShared.createSection;
  const createCheckbox = InspectorShared.createCheckbox;

  const tilesetPanelContents = createSection(
    panel,
    "Tileset",
    "tilesetVisible",
    "toggleTileset"
  );
  const displayPanelContents = createSection(
    panel,
    "Display",
    "displayVisible",
    "toggleDisplay"
  );
  const updatePanelContents = createSection(
    panel,
    "Update",
    "updateVisible",
    "toggleUpdate"
  );
  const loggingPanelContents = createSection(
    panel,
    "Logging",
    "loggingVisible",
    "toggleLogging"
  );
  const tileDebugLabelsPanelContents = createSection(
    panel,
    "Tile Debug Labels",
    "tileDebugLabelsVisible",
    "toggleTileDebugLabels"
  );
  const stylePanelContents = createSection(
    panel,
    "Style",
    "styleVisible",
    "toggleStyle"
  );
  const optimizationPanelContents = createSection(
    panel,
    "Optimization",
    "optimizationVisible",
    "toggleOptimization"
  );

  const properties = document.createElement("div");
  properties.className = "field-group";
  const propertiesLabel = document.createElement("label");
  propertiesLabel.className = "field-label";
  propertiesLabel.appendChild(document.createTextNode("Properties: "));
  const propertiesField = document.createElement("div");
  propertiesField.setAttribute("data-bind", "text: properties");
  properties.appendChild(propertiesLabel);
  properties.appendChild(propertiesField);
  tilesetPanelContents.appendChild(properties);
  tilesetPanelContents.appendChild(
    makeButton("togglePickTileset", "Pick Tileset", "pickActive")
  );
  tilesetPanelContents.appendChild(
    makeButton("trimTilesCache", "Trim Tiles Cache")
  );
  tilesetPanelContents.appendChild(createCheckbox("Enable Picking", "picking"));

  displayPanelContents.appendChild(createCheckbox("Colorize", "colorize"));
  displayPanelContents.appendChild(createCheckbox("Wireframe", "wireframe"));
  displayPanelContents.appendChild(
    createCheckbox("Bounding Volumes", "showBoundingVolumes")
  );
  displayPanelContents.appendChild(
    createCheckbox("Content Volumes", "showContentBoundingVolumes")
  );
  displayPanelContents.appendChild(
    createCheckbox("Request Volumes", "showRequestVolumes")
  );

  displayPanelContents.appendChild(
    createCheckbox("Point Cloud Shading", "pointCloudShading")
  );
  const pointCloudShadingContainer = document.createElement("div");
  pointCloudShadingContainer.setAttribute(
    "data-bind",
    "visible: pointCloudShading"
  );
  pointCloudShadingContainer.appendChild(
    makeRangeInput("geometricErrorScale", 0, 2, 0.01, "Geometric Error Scale")
  );
  pointCloudShadingContainer.appendChild(
    makeRangeInput("maximumAttenuation", 0, 32, 1, "Maximum Attenuation")
  );
  pointCloudShadingContainer.appendChild(
    makeRangeInput("baseResolution", 0, 1, 0.01, "Base Resolution")
  );
  pointCloudShadingContainer.appendChild(
    createCheckbox("Eye Dome Lighting (EDL)", "eyeDomeLighting")
  );
  displayPanelContents.appendChild(pointCloudShadingContainer);

  const edlContainer = document.createElement("div");
  edlContainer.setAttribute("data-bind", "visible: eyeDomeLighting");
  edlContainer.appendChild(
    makeRangeInput("eyeDomeLightingStrength", 0, 2.0, 0.1, "EDL Strength")
  );
  edlContainer.appendChild(
    makeRangeInput("eyeDomeLightingRadius", 0, 4.0, 0.1, "EDL Radius")
  );
  pointCloudShadingContainer.appendChild(edlContainer);

  updatePanelContents.appendChild(
    createCheckbox("Freeze Frame", "freezeFrame")
  );
  updatePanelContents.appendChild(
    createCheckbox("Dynamic Screen Space Error", "dynamicScreenSpaceError")
  );
  const sseContainer = document.createElement("div");
  sseContainer.appendChild(
    makeRangeInput(
      "maximumScreenSpaceError",
      0,
      128,
      1,
      "Maximum Screen Space Error"
    )
  );
  updatePanelContents.appendChild(sseContainer);
  const dynamicScreenSpaceErrorContainer = document.createElement("div");
  dynamicScreenSpaceErrorContainer.setAttribute(
    "data-bind",
    "visible: dynamicScreenSpaceError"
  );
  dynamicScreenSpaceErrorContainer.appendChild(
    makeRangeInput(
      "dynamicScreenSpaceErrorDensitySliderValue",
      0,
      1,
      0.005,
      "Screen Space Error Density",
      "dynamicScreenSpaceErrorDensity"
    )
  );
  dynamicScreenSpaceErrorContainer.appendChild(
    makeRangeInput(
      "dynamicScreenSpaceErrorFactor",
      1,
      10,
      0.1,
      "Screen Space Error Factor"
    )
  );
  updatePanelContents.appendChild(dynamicScreenSpaceErrorContainer);

  loggingPanelContents.appendChild(
    createCheckbox("Performance", "performance")
  );
  loggingPanelContents.appendChild(performanceContainer);
  loggingPanelContents.appendChild(
    createCheckbox("Statistics", "showStatistics")
  );
  const statistics = document.createElement("div");
  statistics.className = "cesium-3dTilesInspector-statistics";
  statistics.setAttribute(
    "data-bind",
    "html: statisticsText, visible: showStatistics"
  );
  loggingPanelContents.appendChild(statistics);
  loggingPanelContents.appendChild(
    createCheckbox("Pick Statistics", "showPickStatistics")
  );
  const pickStatistics = document.createElement("div");
  pickStatistics.className = "cesium-3dTilesInspector-statistics";
  pickStatistics.setAttribute(
    "data-bind",
    "html: pickStatisticsText, visible: showPickStatistics"
  );
  loggingPanelContents.appendChild(pickStatistics);

  const stylePanelEditor = document.createElement("div");
  stylePanelContents.appendChild(stylePanelEditor);
  stylePanelEditor.appendChild(document.createTextNode("Color Blend Mode: "));
  const blendDropdown = document.createElement("select");
  blendDropdown.setAttribute(
    "data-bind",
    "options: colorBlendModes, " +
      'optionsText: "text", ' +
      'optionsValue: "value", ' +
      "value: colorBlendMode"
  );
  stylePanelEditor.appendChild(blendDropdown);
  const styleEditor = document.createElement("textarea");
  styleEditor.setAttribute(
    "data-bind",
    "textInput: styleString, event: { keydown: styleEditorKeyPress }"
  );
  stylePanelEditor.className = "cesium-cesiumInspector-styleEditor";
  stylePanelEditor.appendChild(styleEditor);
  const closeStylesBtn = makeButton("compileStyle", "Compile (Ctrl+Enter)");
  stylePanelEditor.appendChild(closeStylesBtn);
  const errorBox = document.createElement("div");
  errorBox.className = "cesium-cesiumInspector-error";
  errorBox.setAttribute("data-bind", "text: editorError");
  stylePanelEditor.appendChild(errorBox);

  tileDebugLabelsPanelContents.appendChild(
    createCheckbox("Show Picked Only", "showOnlyPickedTileDebugLabel")
  );
  tileDebugLabelsPanelContents.appendChild(
    createCheckbox("Geometric Error", "showGeometricError")
  );
  tileDebugLabelsPanelContents.appendChild(
    createCheckbox("Rendering Statistics", "showRenderingStatistics")
  );
  tileDebugLabelsPanelContents.appendChild(
    createCheckbox("Memory Usage (MB)", "showMemoryUsage")
  );
  tileDebugLabelsPanelContents.appendChild(createCheckbox("Url", "showUrl"));

  optimizationPanelContents.appendChild(
    createCheckbox("Skip Tile LODs", "skipLevelOfDetail")
  );
  const skipScreenSpaceErrorFactorContainer = document.createElement("div");
  skipScreenSpaceErrorFactorContainer.appendChild(
    makeRangeInput("skipScreenSpaceErrorFactor", 1, 50, 1, "Skip SSE Factor")
  );
  optimizationPanelContents.appendChild(skipScreenSpaceErrorFactorContainer);
  const baseScreenSpaceError = document.createElement("div");
  baseScreenSpaceError.appendChild(
    makeRangeInput(
      "baseScreenSpaceError",
      0,
      4096,
      1,
      "SSE before skipping LOD"
    )
  );
  optimizationPanelContents.appendChild(baseScreenSpaceError);
  const skipLevelsContainer = document.createElement("div");
  skipLevelsContainer.appendChild(
    makeRangeInput("skipLevels", 0, 10, 1, "Min. levels to skip")
  );
  optimizationPanelContents.appendChild(skipLevelsContainer);
  optimizationPanelContents.appendChild(
    createCheckbox(
      "Load only tiles that meet the max SSE.",
      "immediatelyLoadDesiredLevelOfDetail"
    )
  );
  optimizationPanelContents.appendChild(
    createCheckbox("Load siblings of visible tiles", "loadSiblings")
  );

  knockout.applyBindings(viewModel, element);
}

Object.defineProperties(Cesium3DTilesInspector.prototype, {
  /**
   * Gets the parent container.
   * @memberof Cesium3DTilesInspector.prototype
   *
   * @type {Element}
   */
  container: {
    get: function () {
      return this._container;
    },
  },

  /**
   * Gets the view model.
   * @memberof Cesium3DTilesInspector.prototype
   *
   * @type {Cesium3DTilesInspectorViewModel}
   */
  viewModel: {
    get: function () {
      return this._viewModel;
    },
  },
});

/**
 * @returns {Boolean} true if the object has been destroyed, false otherwise.
 */
Cesium3DTilesInspector.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
Cesium3DTilesInspector.prototype.destroy = function () {
  knockout.cleanNode(this._element);
  this._container.removeChild(this._element);
  this.viewModel.destroy();

  return destroyObject(this);
};

function makeRangeInput(property, min, max, step, text, displayProperty) {
  displayProperty = defaultValue(displayProperty, property);
  const input = document.createElement("input");
  input.setAttribute("data-bind", `value: ${displayProperty}`);
  input.type = "number";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.setAttribute("data-bind", `valueUpdate: "input", value: ${property}`);

  const wrapper = document.createElement("div");
  wrapper.appendChild(slider);

  const container = document.createElement("div");
  container.className = "cesium-cesiumInspector-slider";
  container.appendChild(document.createTextNode(text));
  container.appendChild(input);
  container.appendChild(wrapper);

  return container;
}

function makeButton(action, text, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = "cesium-cesiumInspector-pickButton";
  let binding = `click: ${action}`;
  if (defined(active)) {
    binding += `, css: {"cesium-cesiumInspector-pickButtonHighlight" : ${active}}`;
  }
  button.setAttribute("data-bind", binding);

  return button;
}
export default Cesium3DTilesInspector;
