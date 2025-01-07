import createPropertyDescriptor from "./createPropertyDescriptor.js";

/**
 * @typedef {import("./Property").default} Property
 */

function createRawProperty(value) {
  return value;
}

/**
 * @private
 * @returns {Property}
 */
function createRawPropertyDescriptor(name, configurable) {
  return createPropertyDescriptor(name, configurable, createRawProperty);
}
export default createRawPropertyDescriptor;
