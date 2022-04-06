import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
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
  text.setAttribute("data-bind", "click: inspectorVisibleToggle");
  element.appendChild(text);
  element.className = "cesium-cesiumInspector cesium-VoxelInspector";
  element.setAttribute(
    "data-bind",
    'css: { "cesium-cesiumInspector-visible" : inspectorVisible, "cesium-cesiumInspector-hidden" : !inspectorVisible}'
  );
  container.appendChild(element);

  const panel = document.createElement("div");
  panel.className = "cesium-cesiumInspector-dropDown";
  element.appendChild(panel);

  const createSection = InspectorShared.createSection;
  const createCheckbox = InspectorShared.createCheckbox;

  // Display
  const displayPanelContents = createSection(
    panel,
    "Display",
    "displayVisible",
    "displayVisibleToggle"
  );

  displayPanelContents.appendChild(createCheckbox("Depth Test", "depthTest"));
  displayPanelContents.appendChild(createCheckbox("Show", "show"));
  displayPanelContents.appendChild(
    createCheckbox("Disable Update", "disableUpdate")
  );
  displayPanelContents.appendChild(createCheckbox("Debug Draw", "debugDraw"));
  displayPanelContents.appendChild(createCheckbox("Jitter", "jitter"));
  displayPanelContents.appendChild(
    createCheckbox("Nearest Sampling", "nearestSampling")
  );
  displayPanelContents.appendChild(createCheckbox("Despeckle", "despeckle"));

  const screenSpaceErrorContainer = document.createElement("div");
  screenSpaceErrorContainer.appendChild(
    makeRangeInput("Screen Space Error", "screenSpaceError", 0, 128)
  );
  displayPanelContents.appendChild(screenSpaceErrorContainer);

  const stepSizeContainer = document.createElement("div");
  stepSizeContainer.appendChild(
    makeRangeInput("Step Size", "stepSize", 0.0, 2.0)
  );
  displayPanelContents.appendChild(stepSizeContainer);

  // Transform
  const transformPanelContents = createSection(
    panel,
    "Transform",
    "transformVisible",
    "transformVisibleToggle"
  );

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
  const boundsPanelContents = createSection(
    panel,
    "Bounds",
    "boundsVisible",
    "boundsVisibleToggle"
  );

  const boxMinBounds = VoxelShapeType.getMinBounds(VoxelShapeType.BOX);
  const boxMaxBounds = VoxelShapeType.getMaxBounds(VoxelShapeType.BOX);

  const ellipsoidMinBounds = Cartesian3.fromElements(
    VoxelShapeType.getMinBounds(VoxelShapeType.ELLIPSOID).x,
    VoxelShapeType.getMinBounds(VoxelShapeType.ELLIPSOID).y,
    -6356752.3142451793, // The deepest height for WGS84
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
  const clippingPanelContents = createSection(
    panel,
    "Clipping",
    "clippingVisible",
    "clippingVisibleToggle"
  );

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

  // Style
  const stylePanelContents = createSection(
    panel,
    "Style",
    "styleVisible",
    "styleVisibleToggle"
  );
  const stylePanelEditor = document.createElement("div");
  stylePanelContents.appendChild(stylePanelEditor);

  const styleEditor = document.createElement("textarea");
  styleEditor.setAttribute(
    "data-bind",
    "textInput: styleString, event: { keydown: styleEditorKeyPress }"
  );
  stylePanelEditor.className = "cesium-cesiumInspector-styleEditor";
  stylePanelEditor.appendChild(styleEditor);
  const compileStyleButton = makeButton("compileStyle", "Compile (Ctrl+Enter)");
  stylePanelEditor.appendChild(compileStyleButton);

  const compilationText = document.createElement("label");
  compilationText.style.display = "block";
  compilationText.setAttribute(
    "data-bind",
    "text: styleCompilationMessage, style: {color: styleCompilationSuccess ? 'green' : 'red'}"
  );
  stylePanelEditor.appendChild(compilationText);

  knockout.applyBindings(viewModel, element);

  this._viewModel = viewModel;
  this._container = container;
  this._element = element;
  this._panel = panel;
}

Object.defineProperties(VoxelInspector.prototype, {
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

// function makeTestSlider(text, property, min, max, step, displayProperty) {
//     displayProperty = defaultValue(displayProperty, property);
//     const input = document.createElement('input');
//     // input.setAttribute('data-bind', 'value: ' + displayProperty);
//     input.setAttribute('data-bind', 'attr: {min: 1, max: MaxPage}, value: ' + displayProperty);

//     input.type = 'number';

//     const slider = document.createElement('input');
//     slider.type = 'range';
//     slider.min = min;
//     slider.max = max;
//     slider.step = step;
//     slider.setAttribute('data-bind', 'valueUpdate: "input", value: ' + property);

//     const wrapper = document.createElement('div');
//     wrapper.appendChild(slider);

//     const container = document.createElement('div');
//     container.className = 'cesium-cesiumInspector-slider';
//     container.appendChild(document.createTextNode(text));
//     container.appendChild(input);
//     container.appendChild(wrapper);

//     return container;
// }

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
