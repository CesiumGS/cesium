import ComponentDatatype from "../Core/ComponentDatatype.js";
import MetadataEnumType from "../Core/MetadataEnumType.js";

/**
 * An enum of metadata component types.
 *
 * @exports MetadataComponentType
 *
 * @private
 */
var MetadataComponentType = {
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
  ENUM: "ENUM",
  STRING: "STRING",
};

/**
 * Returns the ComponentDatatype matching the component type
 *
 * @param {MetadataComponentType} componentType The component type.
 * @param {MetadataEnumType} [enumType] The enum type.
 * @returns {ComponentDatatype} The ComponentDatatype.
 */
MetadataComponentType.getComponentDatatype = function (
  componentType,
  enumType
) {
  switch (componentType) {
    case MetadataComponentType.INT8:
      return ComponentDatatype.BYTE;
    case MetadataComponentType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataComponentType.INT16:
      return ComponentDatatype.SHORT;
    case MetadataComponentType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataComponentType.INT32:
      return ComponentDatatype.INT;
    case MetadataComponentType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
    case MetadataComponentType.FLOAT32:
      return ComponentDatatype.FLOAT;
    case MetadataComponentType.FLOAT64:
      return ComponentDatatype.DOUBLE;
    case MetadataComponentType.ENUM:
      return MetadataEnumType.ComponentDatatype(enumType);
  }
};

export default Object.freeze(MetadataComponentType);
