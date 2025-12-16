import {
  Cartesian2,
  Cartesian3,
  Cartesian4,
  Matrix2,
  Matrix3,
  Matrix4,
} from "@cesium/core-math";
import ComponentDatatype from "../Core/ComponentDatatype.js";

const ComponentsPerAttribute = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

const ClassPerType = {
  SCALAR: undefined,
  VEC2: Cartesian2,
  VEC3: Cartesian3,
  VEC4: Cartesian4,
  MAT2: Matrix2,
  MAT3: Matrix3,
  MAT4: Matrix4,
};

/**
 * @private
 */
function getBinaryAccessor(accessor) {
  const componentType = accessor.componentType;
  let componentDatatype;
  if (typeof componentType === "string") {
    componentDatatype = ComponentDatatype.fromName(componentType);
  } else {
    componentDatatype = componentType;
  }

  const componentsPerAttribute = ComponentsPerAttribute[accessor.type];
  const classType = ClassPerType[accessor.type];
  return {
    componentsPerAttribute: componentsPerAttribute,
    classType: classType,
    createArrayBufferView: function (buffer, byteOffset, length) {
      return ComponentDatatype.createArrayBufferView(
        componentDatatype,
        buffer,
        byteOffset,
        componentsPerAttribute * length,
      );
    },
  };
}
export default getBinaryAccessor;
