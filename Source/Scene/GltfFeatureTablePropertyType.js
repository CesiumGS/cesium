/**
 * An enum describing the feature table property types.
 *
 * @exports GltfFeatureTablePropertyType

 * @private
 */
var GltfFeatureTablePropertyType = {
  VEC2: "vec2",
  VEC3: "vec3",
  VEC4: "vec4",
  MAT2: "mat2",
  MAT3: "mat3",
  MAT4: "mat4",
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  ANY: "any",
};

/**
 * Get the {@link GltfFeatureTablePropertyType} from a glTF accessor type.
 *
 * @param {String} accessorType The gltF accessor type.
 * @returns {GltfFeatureTablePropertyType} The type.
 *
 * @private
 */
GltfFeatureTablePropertyType.getTypeFromAccessorType = function (accessorType) {
  switch (accessorType) {
    case "SCALAR":
      return GltfFeatureTablePropertyType.NUMBER;
    case "VEC2":
      return GltfFeatureTablePropertyType.VEC2;
    case "VEC3":
      return GltfFeatureTablePropertyType.VEC3;
    case "VEC4":
      return GltfFeatureTablePropertyType.VEC4;
    case "MAT2":
      return GltfFeatureTablePropertyType.MAT2;
    case "MAT3":
      return GltfFeatureTablePropertyType.MAT3;
    case "MAT4":
      return GltfFeatureTablePropertyType.MAT4;
  }
};

/**
 * Get the {@link GltfFeatureTablePropertyType} from an array type.
 *
 * @param {String} arrayType The array type.
 * @returns {GltfFeatureTablePropertyType} The type.
 *
 * @private
 */
GltfFeatureTablePropertyType.getTypeFromArrayType = function (arrayType) {
  switch (arrayType) {
    case "string":
      return GltfFeatureTablePropertyType.STRING;
    case "number":
      return GltfFeatureTablePropertyType.NUMBER;
    case "boolean":
      return GltfFeatureTablePropertyType.BOOLEAN;
    case "any":
      return GltfFeatureTablePropertyType.ANY;
  }
};

export default Object.freeze(GltfFeatureTablePropertyType);
