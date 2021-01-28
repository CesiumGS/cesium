import MetadataComponentType from "./MetadataComponentType";
import MetadataEnumType from "./MetadataEnumType";

/**
 * An enum of metadata types.
 *
 * @exports MetadataType
 *
 * @private
 */
var MetadataType = {
  BOOLEAN: "BOOLEAN",
  INT8: "INT8",
  UINT8: "UINT8",
  INT16: "INT16",
  UINT16: "UINT16",
  INT32: "INT32",
  UINT32: "UINT32",
  INT64: "INT64",
  UINT64: "UINT64",
  FLOAT32: "FLOAT32",
  FLOAT64: "FLOAT64",
  STRING: "STRING",
  ENUM: "ENUM",
  ARRAY: "ARRAY",
};

/**
 * Returns the ComponentDatatype matching the type
 *
 * @param {MetadataType} type The type.
 * @param {MetadataComponentType} [componentType] The component type.
 * @param {MetadataEnumType} [enumType] The enum type.
 * @returns {ComponentDatatype} The ComponentDatatype.
 */
MetadataType.getComponentDatatype = function (type, componentType, enumType) {
  switch (type) {
    case MetadataType.INT8:
      return ComponentDatatype.BYTE;
    case MetadataType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataType.INT16:
      return ComponentDatatype.SHORT;
    case MetadataType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataType.INT32:
      return ComponentDatatype.INT;
    case MetadataType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
    case MetadataType.FLOAT32:
      return ComponentDatatype.FLOAT;
    case MetadataType.FLOAT64:
      return ComponentDatatype.DOUBLE;
    case MetadataType.ENUM:
      return MetadataEnumType.ComponentDatatype(enumType);
    case MetadataType.ARRAY:
      return MetadataComponentType.ComponentDatatype(componentType, enumType);
  }
};

export default Object.freeze(MetadataType);
