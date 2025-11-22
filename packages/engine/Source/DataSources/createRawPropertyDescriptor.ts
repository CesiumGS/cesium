import createPropertyDescriptor from "./createPropertyDescriptor.js";

function createRawProperty(value: any) {
  return value;
}

/**
 * @private
 */
function createRawPropertyDescriptor(name: any, configurable: any) {
  return createPropertyDescriptor(name, configurable, createRawProperty);
}
export default createRawPropertyDescriptor;
