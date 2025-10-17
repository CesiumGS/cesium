import {
  Math as CesiumMath,
  Check,
  destroyObject,
  getElement,
} from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";
import InspectorShared from "../InspectorShared.js";
import VoxelInspectorViewModel from "./VoxelInspectorViewModel.js";

/**
 * Inspector widget to aid in debugging voxels
 *
 * @alias VoxelInspector
 * @constructor
 *
 * @param {Element|string} container The DOM element or ID that will contain the widget.
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

  this._viewModel = viewModel;
  this._container = container;
  this._element = element;

  const text = document.createElement("div");
  text.textContent = "Voxel Inspector";
  text.className = "cesium-cesiumInspector-button";
  text.setAttribute("data-bind", "click: toggleInspector");
  element.appendChild(text);
  element.className = "cesium-cesiumInspector cesium-VoxelInspector";
  element.setAttribute(
    "data-bind",
    'css: { "cesium-cesiumInspector-visible" : inspectorVisible, "cesium-cesiumInspector-hidden" : !inspectorVisible}',
  );
  container.appendChild(element);

  const panel = document.createElement("div");
  panel.className = "cesium-cesiumInspector-dropDown";
  element.appendChild(panel);

  const { createSection, createCheckbox, createRangeInput, createButton } =
    InspectorShared;

  const displayPanelContents = createSection(
    panel,
    "Display",
    "displayVisible",
    "toggleDisplay",
  );

  const transformPanelContents = createSection(
    panel,
    "Transform",
    "transformVisible",
    "toggleTransform",
  );

  const clippingPanelContents = createSection(
    panel,
    "Clipping",
    "clippingVisible",
    "toggleClipping",
  );

  const shaderPanelContents = createSection(
    panel,
    "Shader",
    "shaderVisible",
    "toggleShader",
  );

  // Display
  displayPanelContents.appendChild(createCheckbox("Depth Test", "depthTest"));
  displayPanelContents.appendChild(createCheckbox("Show", "show"));
  displayPanelContents.appendChild(
    createCheckbox("Disable Update", "disableUpdate"),
  );
  displayPanelContents.appendChild(createCheckbox("Debug Draw", "debugDraw"));
  displayPanelContents.appendChild(createCheckbox("Jitter", "jitter"));
  displayPanelContents.appendChild(
    createCheckbox("Nearest Sampling", "nearestSampling"),
  );

  displayPanelContents.appendChild(
    createRangeInput("Screen Space Error", "screenSpaceError", 0, 128),
  );

  displayPanelContents.appendChild(
    createRangeInput("Step Size", "stepSize", 0.0, 2.0),
  );

  // Transform
  const maxTrans = 10.0;
  const maxScale = 10.0;
  const maxAngle = CesiumMath.PI;

  transformPanelContents.appendChild(
    createRangeInput("Translation X", "translationX", -maxTrans, +maxTrans),
  );
  transformPanelContents.appendChild(
    createRangeInput("Translation Y", "translationY", -maxTrans, +maxTrans),
  );
  transformPanelContents.appendChild(
    createRangeInput("Translation Z", "translationZ", -maxTrans, +maxTrans),
  );
  transformPanelContents.appendChild(
    createRangeInput("Scale X", "scaleX", 0, +maxScale),
  );
  transformPanelContents.appendChild(
    createRangeInput("Scale Y", "scaleY", 0, +maxScale),
  );
  transformPanelContents.appendChild(
    createRangeInput("Scale Z", "scaleZ", 0, +maxScale),
  );
  transformPanelContents.appendChild(
    createRangeInput("Heading", "angleX", -maxAngle, +maxAngle),
  );
  transformPanelContents.appendChild(
    createRangeInput("Pitch", "angleY", -maxAngle, +maxAngle),
  );
  transformPanelContents.appendChild(
    createRangeInput("Roll", "angleZ", -maxAngle, +maxAngle),
  );

  // Clipping
  makeCoordinateRangeWithDynamicMinMax(
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
    "shapeIsBox",
    clippingPanelContents,
  );

  makeCoordinateRangeWithDynamicMinMax(
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
    "shapeIsEllipsoid",
    clippingPanelContents,
  );

  makeCoordinateRangeWithDynamicMinMax(
    "Max Radius",
    "Min Radius",
    "Max Angle",
    "Min Angle",
    "Max Height",
    "Min Height",
    "clippingCylinderMaxRadius",
    "clippingCylinderMinRadius",
    "clippingCylinderMaxAngle",
    "clippingCylinderMinAngle",
    "clippingCylinderMaxHeight",
    "clippingCylinderMinHeight",
    "shapeIsCylinder",
    clippingPanelContents,
  );

  // Shader
  const shaderPanelEditor = document.createElement("div");
  shaderPanelContents.appendChild(shaderPanelEditor);

  const shaderEditor = document.createElement("textarea");
  shaderEditor.setAttribute(
    "data-bind",
    "textInput: shaderString, event: { keydown: shaderEditorKeyPress }",
  );
  shaderPanelEditor.className = "cesium-cesiumInspector-styleEditor";
  shaderPanelEditor.appendChild(shaderEditor);
  const compileShaderButton = createButton(
    "Compile (Ctrl+Enter)",
    "compileShader",
  );
  shaderPanelEditor.appendChild(compileShaderButton);

  const compilationText = document.createElement("label");
  compilationText.style.display = "block";
  compilationText.setAttribute(
    "data-bind",
    "text: shaderCompilationMessage, style: {color: shaderCompilationSuccess ? 'green' : 'red'}",
  );
  shaderPanelEditor.appendChild(compilationText);

  knockout.applyBindings(viewModel, element);
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
 * @returns {boolean} true if the object has been destroyed, false otherwise.
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

function makeCoordinateRangeWithDynamicMinMax(
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
  allowedShape,
  parentContainer,
) {
  const createRangeInput = InspectorShared.createRangeInputWithDynamicMinMax;

  const boundsElement = parentContainer.appendChild(
    document.createElement("div"),
  );
  boundsElement.setAttribute("data-bind", `if: ${allowedShape}`);
  boundsElement.appendChild(createRangeInput(maxXTitle, maxXVar));
  boundsElement.appendChild(createRangeInput(minXTitle, minXVar));
  boundsElement.appendChild(createRangeInput(maxYTitle, maxYVar));
  boundsElement.appendChild(createRangeInput(minYTitle, minYVar));
  boundsElement.appendChild(createRangeInput(maxZTitle, maxZVar));
  boundsElement.appendChild(createRangeInput(minZTitle, minZVar));
}

export default VoxelInspector;
