import { ConstantProperty } from "../Source/Cesium.js";

function createDynamicProperty(value) {
  var property = new ConstantProperty(value);
  Object.defineProperties(property, {
    isConstant: {
      value: false,
    },
  });
  return property;
}
export default createDynamicProperty;
