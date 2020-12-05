import ComponentDatatype from "../Core/ComponentDatatype.js";

/**
 * An enum describing component types of a feature property.
 *
 * @exports GltfFeaturePropertyComponentType
 *
 * @private
 */
var GltfFeaturePropertyComponentType = {
  BOOLEAN: "BOOLEAN",
  INT8: "INT8",
  UINT8: "UINT8",
  INT16: "INT16",
  UINT16: "UINT16",
  INT32: "INT32",
  UINT32: "UINT32",
  INT64: "INT64",
  UINT64: "UINT64",
  FLOAT16: "FLOAT16",
  FLOAT32: "FLOAT32",
  FLOAT64: "FLOAT64",
  BLOB: "BLOB",
  STRING: "STRING",
};

/**
 * Returns the ComponentDatatype matching the component type
 *
 * @param {GltfFeaturePropertyComponentType} componentType The component type.
 * @returns {ComponentDatatype} The ComponentDatatype.
 */
GltfFeaturePropertyComponentType.getComponentDatatype = function (
  componentType
) {
  switch (componentType) {
    case GltfFeaturePropertyComponentType.INT8:
      return ComponentDatatype.BYTE;
    case GltfFeaturePropertyComponentType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case GltfFeaturePropertyComponentType.INT16:
      return ComponentDatatype.SHORT;
    case GltfFeaturePropertyComponentType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case GltfFeaturePropertyComponentType.INT32:
      return ComponentDatatype.INT;
    case GltfFeaturePropertyComponentType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
    case GltfFeaturePropertyComponentType.FLOAT32:
      return ComponentDatatype.FLOAT;
    case GltfFeaturePropertyComponentType.FLOAT64:
      return ComponentDatatype.DOUBLE;
  }
};

export default Object.freeze(GltfFeaturePropertyComponentType);
