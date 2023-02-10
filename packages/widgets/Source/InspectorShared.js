import { Check, defaultValue, defined } from "@cesium/engine";

/**
 * A static class with helper functions used by CesiumInspector, Cesium3DTilesInspector, and VoxelInspector
 * @private
 */
const InspectorShared = {};

/**
 * Creates a checkbox component
 * @param {string} labelText The text to display in the checkbox label
 * @param {string} checkedBinding The name of the variable used for checked binding
 * @param {string} [enableBinding] The name of the variable used for enable binding
 * @return {Element}
 */
InspectorShared.createCheckbox = function (
  labelText,
  checkedBinding,
  enableBinding
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("labelText", labelText);
  Check.typeOf.string("checkedBinding", checkedBinding);
  //>>includeEnd('debug');
  const checkboxContainer = document.createElement("div");
  const checkboxLabel = document.createElement("label");
  const checkboxInput = document.createElement("input");
  checkboxInput.type = "checkbox";

  let binding = `checked: ${checkedBinding}`;
  if (defined(enableBinding)) {
    binding += `, enable: ${enableBinding}`;
  }
  checkboxInput.setAttribute("data-bind", binding);
  checkboxLabel.appendChild(checkboxInput);
  checkboxLabel.appendChild(document.createTextNode(labelText));
  checkboxContainer.appendChild(checkboxLabel);
  return checkboxContainer;
};

/**
 * Creates a section element
 * @param {Element} panel The parent element
 * @param {string} headerText The text to display at the top of the section
 * @param {string} sectionVisibleBinding The name of the variable used for visible binding
 * @param {string} toggleSectionVisibilityBinding The name of the function used to toggle visibility
 * @return {Element}
 */
InspectorShared.createSection = function (
  panel,
  headerText,
  sectionVisibleBinding,
  toggleSectionVisibilityBinding
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("panel", panel);
  Check.typeOf.string("headerText", headerText);
  Check.typeOf.string("sectionVisibleBinding", sectionVisibleBinding);
  Check.typeOf.string(
    "toggleSectionVisibilityBinding",
    toggleSectionVisibilityBinding
  );
  //>>includeEnd('debug');
  const section = document.createElement("div");
  section.className = "cesium-cesiumInspector-section";
  section.setAttribute(
    "data-bind",
    `css: { "cesium-cesiumInspector-section-collapsed": !${sectionVisibleBinding} }`
  );
  panel.appendChild(section);

  const sectionHeader = document.createElement("h3");
  sectionHeader.className = "cesium-cesiumInspector-sectionHeader";
  sectionHeader.appendChild(document.createTextNode(headerText));
  sectionHeader.setAttribute(
    "data-bind",
    `click: ${toggleSectionVisibilityBinding}`
  );
  section.appendChild(sectionHeader);

  const sectionContent = document.createElement("div");
  sectionContent.className = "cesium-cesiumInspector-sectionContent";
  section.appendChild(sectionContent);
  return sectionContent;
};

/**
 * Creates a range input
 * @param {string} rangeText The text to display
 * @param {string} sliderValueBinding The name of the variable used for slider value binding
 * @param {number} min The minimum value
 * @param {number} max The maximum value
 * @param {number} [step] The step size. Defaults to "any".
 * @param {string} [inputValueBinding] The name of the variable used for input value binding
 * @return {Element}
 */
InspectorShared.createRangeInput = function (
  rangeText,
  sliderValueBinding,
  min,
  max,
  step,
  inputValueBinding
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("rangeText", rangeText);
  Check.typeOf.string("sliderValueBinding", sliderValueBinding);
  Check.typeOf.number("min", min);
  Check.typeOf.number("max", max);
  //>>includeEnd('debug');

  inputValueBinding = defaultValue(inputValueBinding, sliderValueBinding);
  const input = document.createElement("input");
  input.setAttribute("data-bind", `value: ${inputValueBinding}`);
  input.type = "number";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = min;
  slider.max = max;
  slider.step = defaultValue(step, "any");
  slider.setAttribute(
    "data-bind",
    `valueUpdate: "input", value: ${sliderValueBinding}`
  );

  const wrapper = document.createElement("div");
  wrapper.appendChild(slider);

  const container = document.createElement("div");
  container.className = "cesium-cesiumInspector-slider";
  container.appendChild(document.createTextNode(rangeText));
  container.appendChild(input);
  container.appendChild(wrapper);

  return container;
};

/**
 * Creates a button component
 * @param {string} buttonText The button text
 * @param {string} clickedBinding The name of the variable used for clicked binding
 * @param {string} [activeBinding] The name of the variable used for active binding
 * @return {Element}
 */
InspectorShared.createButton = function (
  buttonText,
  clickedBinding,
  activeBinding
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("buttonText", buttonText);
  Check.typeOf.string("clickedBinding", clickedBinding);
  //>>includeEnd('debug');

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = buttonText;
  button.className = "cesium-cesiumInspector-pickButton";
  let binding = `click: ${clickedBinding}`;
  if (defined(activeBinding)) {
    binding += `, css: {"cesium-cesiumInspector-pickButtonHighlight" : ${activeBinding}}`;
  }
  button.setAttribute("data-bind", binding);

  return button;
};

export default InspectorShared;
