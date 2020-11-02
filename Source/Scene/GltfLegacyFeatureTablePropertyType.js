/**
 * An enum describing the feature table property types.
 *
 * @exports GltfLegacyFeatureTablePropertyType

 * @private
 */
var GltfLegacyFeatureTablePropertyType = {
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
 * Get the {@link GltfLegacyFeatureTablePropertyType} from a glTF accessor type.
 *
 * @param {String} accessorType The gltF accessor type.
 * @returns {GltfLegacyFeatureTablePropertyType} The type.
 *
 * @private
 */
GltfLegacyFeatureTablePropertyType.getTypeFromAccessorType = function (
  accessorType
) {
  switch (accessorType) {
    case "SCALAR":
      return GltfLegacyFeatureTablePropertyType.NUMBER;
    case "VEC2":
      return GltfLegacyFeatureTablePropertyType.VEC2;
    case "VEC3":
      return GltfLegacyFeatureTablePropertyType.VEC3;
    case "VEC4":
      return GltfLegacyFeatureTablePropertyType.VEC4;
    case "MAT2":
      return GltfLegacyFeatureTablePropertyType.MAT2;
    case "MAT3":
      return GltfLegacyFeatureTablePropertyType.MAT3;
    case "MAT4":
      return GltfLegacyFeatureTablePropertyType.MAT4;
  }
};

/**
 * Get the {@link GltfLegacyFeatureTablePropertyType} from an array type.
 *
 * @param {String} arrayType The array type.
 * @returns {GltfLegacyFeatureTablePropertyType} The type.
 *
 * @private
 */
GltfLegacyFeatureTablePropertyType.getTypeFromArrayType = function (arrayType) {
  switch (arrayType) {
    case "string":
      return GltfLegacyFeatureTablePropertyType.STRING;
    case "number":
      return GltfLegacyFeatureTablePropertyType.NUMBER;
    case "boolean":
      return GltfLegacyFeatureTablePropertyType.BOOLEAN;
    case "any":
      return GltfLegacyFeatureTablePropertyType.ANY;
  }
};

export default Object.freeze(GltfLegacyFeatureTablePropertyType);
