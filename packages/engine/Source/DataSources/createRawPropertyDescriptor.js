import createPropertyDescriptor from "./createPropertyDescriptor.js";

function createRawProperty(value) {
  return value;
}

/**
 * @param name
 * @param configurable
 * @private
 */
function createRawPropertyDescriptor(name, configurable) {
  return createPropertyDescriptor(name, configurable, createRawProperty);
}
export default createRawPropertyDescriptor;
