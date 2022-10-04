import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import destroyObject from "../../Core/destroyObject.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import knockout from "../../ThirdParty/knockout.js";
import getElement from "../getElement.js";
import InspectorShared from "../InspectorShared.js";
import VoxelInspectorViewModel from "./VoxelInspectorViewModel.js";
import VoxelShapeType from "../../Scene/VoxelShapeType.js";

/**
 * Inspector widget to aid in debugging voxels
 *
 * @alias VoxelInspector
 * @constructor
 *
 * @param {Element|String} container The DOM element or ID that will contain the widget.
 * @param {Scene} scene the Scene instance to use.
 */
function VoxelInspector(container, scene) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("container", container);
  Check.typeOf.object("scene", scene);
  //>>includeEnd('debug');

  container = getElement(container);
  const element = document.createElement("div");
  const viewModel = new VoxelInspectorViewModel(scene);

  const text = document.createElement("div");
  text.textContent = "Voxel Inspector";
  text.className = "cesium-cesiumInspector-button";
  element.appendChild(text);

  element.className =
    "cesium-cesiumInspector cesium-VoxelInspector cesium-cesiumInspector-hidden";
  text.addEventListener("click", function () {
    element.classList.toggle("cesium-cesiumInspector-visible");
    element.classList.toggle("cesium-cesiumInspector-hidden");
  });

  container.appendChild(element);

  const panel = document.createElement("div");
  panel.className = "cesium-cesiumInspector-dropDown";
  element.appendChild(panel);

  // Display
  const displayPanelContents = createSection(panel, "Display");

  const { createCheckbox } = InspectorShared;
  [
    ["Depth Test", "depthTest"],
    ["Show", "show"],
    ["Disable Update", "disableUpdate"],
    ["Debug Draw", "debugDraw"],
    ["Jitter", "jitter"],
    ["Nearest Sampling", "nearestSampling"],
  ].forEach(([title, variable]) => {
    displayPanelContents.appendChild(createCheckbox(title, variable));
  });

  displayPanelContents.appendChild(
    makeRangeInput("Level Blend Factor", "levelBlendFactor", 0.0, 1.0)
  );

  displayPanelContents.appendChild(
    makeRangeInput("Screen Space Error", "screenSpaceError", 0, 128)
  );

  displayPanelContents.appendChild(
    makeRangeInput("Step Size", "stepSize", 0.0, 2.0)
  );

  // Transform
  const transformPanelContents = createSection(panel, "Transform");

  const maxTrans = 20000000.0;
  const maxScale = 20000000.0;
  const maxAngle = CesiumMath.PI;

  transformPanelContents.appendChild(
    makeRangeInput("Translation X", "translationX", -maxTrans, +maxTrans)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Translation Y", "translationY", -maxTrans, +maxTrans)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Translation Z", "translationZ", -maxTrans, +maxTrans)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Scale X", "scaleX", -maxScale, +maxScale)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Scale Y", "scaleY", -maxScale, +maxScale)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Scale Z", "scaleZ", -maxScale, +maxScale)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Heading", "angleX", -maxAngle, +maxAngle)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Pitch", "angleY", -maxAngle, +maxAngle)
  );
  transformPanelContents.appendChild(
    makeRangeInput("Roll", "angleZ", -maxAngle, +maxAngle)
  );

  // Bounds
  const boundsPanelContents = createSection(panel, "Bounds");

  const boxMinBounds = VoxelShapeType.getMinBounds(VoxelShapeType.BOX);
  const boxMaxBounds = VoxelShapeType.getMaxBounds(VoxelShapeType.BOX);

  const ellipsoidMinBounds = Cartesian3.fromElements(
    VoxelShapeType.getMinBounds(VoxelShapeType.ELLIPSOID).x,
    VoxelShapeType.getMinBounds(VoxelShapeType.ELLIPSOID).y,
    -Ellipsoid.WGS84.maximumRadius,
    new Cartesian3()
  );
  const ellipsoidMaxBounds = Cartesian3.fromElements(
    VoxelShapeType.getMaxBounds(VoxelShapeType.ELLIPSOID).x,
    VoxelShapeType.getMaxBounds(VoxelShapeType.ELLIPSOID).y,
    +10000000.0,
    new Cartesian3()
  );

  const cylinderMinBounds = VoxelShapeType.getMinBounds(
    VoxelShapeType.CYLINDER
  );
  const cylinderMaxBounds = VoxelShapeType.getMaxBounds(
    VoxelShapeType.CYLINDER
  );

  makeCoordinateRange(
    "Max X",
    "Min X",
    "Max Y",
    "Min Y",
    "Max Z",
    "Min Z",
    "boundsBoxMaxX",
    "boundsBoxMinX",
    "boundsBoxMaxY",
    "boundsBoxMinY",
    "boundsBoxMaxZ",
    "boundsBoxMinZ",
    boxMinBounds,
    boxMaxBounds,
    "shapeIsBox",
    boundsPanelContents
  );

  makeCoordinateRange(
    "Max Longitude",
    "Min Longitude",
    "Max Latitude",
    "Min Latitude",
    "Max Height",
    "Min Height",
    "boundsEllipsoidMaxLongitude",
    "boundsEllipsoidMinLongitude",
    "boundsEllipsoidMaxLatitude",
    "boundsEllipsoidMinLatitude",
    "boundsEllipsoidMaxHeight",
    "boundsEllipsoidMinHeight",
    ellipsoidMinBounds,
    ellipsoidMaxBounds,
    "shapeIsEllipsoid",
    boundsPanelContents
  );

  makeCoordinateRange(
    "Max Radius",
    "Min Radius",
    "Max Height",
    "Min Height",
    "Max Angle",
    "Min Angle",
    "boundsCylinderMaxRadius",
    "boundsCylinderMinRadius",
    "boundsCylinderMaxHeight",
    "boundsCylinderMinHeight",
    "boundsCylinderMaxAngle",
    "boundsCylinderMinAngle",
    cylinderMinBounds,
    cylinderMaxBounds,
    "shapeIsCylinder",
    boundsPanelContents
  );

  // Clipping
  const clippingPanelContents = createSection(panel, "Clipping");

  makeCoordinateRange(
    "Max X",
    "Min X",
    "Max Y",
    "Min Y",
    "Max Z",
    "Min Z",
    "clippingBoxMaxX",
    "clippingBoxMinX",
    "clippingBoxMaxY",
    "clippingBoxMinY",
    "clippingBoxMaxZ",
    "clippingBoxMinZ",
    boxMinBounds,
    boxMaxBounds,
    "shapeIsBox",
    clippingPanelContents
  );

  makeCoordinateRange(
    "Max Longitude",
    "Min Longitude",
    "Max Latitude",
    "Min Latitude",
    "Max Height",
    "Min Height",
    "clippingEllipsoidMaxLongitude",
    "clippingEllipsoidMinLongitude",
    "clippingEllipsoidMaxLatitude",
    "clippingEllipsoidMinLatitude",
    "clippingEllipsoidMaxHeight",
    "clippingEllipsoidMinHeight",
    ellipsoidMinBounds,
    ellipsoidMaxBounds,
    "shapeIsEllipsoid",
    clippingPanelContents
  );

  makeCoordinateRange(
    "Max Radius",
    "Min Radius",
    "Max Height",
    "Min Height",
    "Max Angle",
    "Min Angle",
    "clippingCylinderMaxRadius",
    "clippingCylinderMinRadius",
    "clippingCylinderMaxHeight",
    "clippingCylinderMinHeight",
    "clippingCylinderMaxAngle",
    "clippingCylinderMinAngle",
    cylinderMinBounds,
    cylinderMaxBounds,
    "shapeIsCylinder",
    clippingPanelContents
  );

  // Shader
  const shaderPanelContents = createSection(panel, "Shader");
  const shaderPanelEditor = document.createElement("div");
  shaderPanelContents.appendChild(shaderPanelEditor);

  const shaderEditor = document.createElement("textarea");
  shaderEditor.setAttribute(
    "data-bind",
    "textInput: shaderString, event: { keydown: shaderEditorKeyPress }"
  );
  shaderPanelEditor.className = "cesium-cesiumInspector-styleEditor";
  shaderPanelEditor.appendChild(shaderEditor);
  const compileShaderButton = makeButton(
    "compileShader",
    "Compile (Ctrl+Enter)"
  );
  shaderPanelEditor.appendChild(compileShaderButton);

  const compilationText = document.createElement("label");
  compilationText.style.display = "block";
  compilationText.setAttribute(
    "data-bind",
    "text: shaderCompilationMessage, style: {color: shaderCompilationSuccess ? 'green' : 'red'}"
  );
  shaderPanelEditor.appendChild(compilationText);

  knockout.applyBindings(viewModel, element);

  this._viewModel = viewModel;
  this._container = container;
  this._element = element;
  this._panel = panel;
}

Object.defineProperties(VoxelInspector.prototype, {
  /**
   * Gets the parent container.
   * @memberof VoxelInspector.prototype
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
   * @memberof VoxelInspector.prototype
   *
   * @type {VoxelInspectorViewModel}
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
VoxelInspector.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
VoxelInspector.prototype.destroy = function () {
  knockout.cleanNode(this._element);
  this._container.removeChild(this._element);
  this.viewModel.destroy();

  return destroyObject(this);
};

/**
 * Creates a hide-able section element in an Inspector panel
 * Similar to InspectorShared.createSection, but without the knockout dependency
 * @param {HTMLElement} panel The parent element
 * @param {String} headerText The text to display at the top of the section
 * @returns {HTMLElement} An element containing the section content
 * @private
 */
function createSection(panel, headerText) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("panel", panel);
  Check.typeOf.string("headerText", headerText);
  //>>includeEnd('debug');

  const section = document.createElement("div");
  section.className =
    "cesium-cesiumInspector-section cesium-cesiumInspector-section-collapsed";
  panel.appendChild(section);

  const sectionHeader = document.createElement("h3");
  sectionHeader.className = "cesium-cesiumInspector-sectionHeader";
  sectionHeader.appendChild(document.createTextNode(headerText));
  sectionHeader.addEventListener("click", function () {
    section.classList.toggle("cesium-cesiumInspector-section-collapsed");
  });
  section.appendChild(sectionHeader);

  const sectionContent = document.createElement("div");
  sectionContent.className = "cesium-cesiumInspector-sectionContent";
  section.appendChild(sectionContent);
  return sectionContent;
}

function makeRangeInput(text, property, min, max, step, displayProperty) {
  displayProperty = defaultValue(displayProperty, property);
  const input = document.createElement("input");
  input.setAttribute("data-bind", `value: ${displayProperty}`);
  input.type = "number";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = min;
  slider.max = max;
  slider.step = defaultValue(step, "any");
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

function makeButton(action, text) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = "cesium-cesiumInspector-pickButton";
  const binding = `click: ${action}`;
  button.setAttribute("data-bind", binding);
  return button;
}

function makeCoordinateRange(
  maxXTitle,
  minXTitle,
  maxYTitle,
  minYTitle,
  maxZTitle,
  minZTitle,
  maxXVar,
  minXVar,
  maxYVar,
  minYVar,
  maxZVar,
  minZVar,
  defaultMinBounds,
  defaultMaxBounds,
  allowedShape,
  parentContainer
) {
  const min = defaultMinBounds;
  const max = defaultMaxBounds;
  const boundsElement = parentContainer.appendChild(
    document.createElement("div")
  );
  boundsElement.setAttribute("data-bind", `if: ${allowedShape}`);
  boundsElement.appendChild(makeRangeInput(maxXTitle, maxXVar, min.x, max.x));
  boundsElement.appendChild(makeRangeInput(minXTitle, minXVar, min.x, max.x));
  boundsElement.appendChild(makeRangeInput(maxYTitle, maxYVar, min.y, max.y));
  boundsElement.appendChild(makeRangeInput(minYTitle, minYVar, min.y, max.y));
  boundsElement.appendChild(makeRangeInput(maxZTitle, maxZVar, min.z, max.z));
  boundsElement.appendChild(makeRangeInput(minZTitle, minZVar, min.z, max.z));
}

export default VoxelInspector;
